
const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const Usuario = require("../models/Usuario");
const authRoutes = require("../routes/authRoutes");
const {
    crearSesion,
    cerrarSesionesDeUsuario
} = require("../middleware/sesiones");

const ID = "111111111111111111111111";

async function actualizarPerfil(cuerpo, rol = null) {
    const app = express();
    app.use(express.json());
    app.use("/api/auth", authRoutes);

    const servidor = await new Promise(resolve => {
        const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });

    const token = rol ? crearSesion({ _id: ID, rol }) : null;

    try {
        const respuesta = await fetch(
            `http://127.0.0.1:${servidor.address().port}/api/auth/perfil`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    ...(token
                        ? { Authorization: `Bearer ${token}` }
                        : {})
                },
                body: JSON.stringify(cuerpo)
            }
        );

        return {
            codigo: respuesta.status,
            datos: await respuesta.json().catch(() => null)
        };
    } finally {
        if (token) cerrarSesionesDeUsuario(ID);
        await new Promise(resolve => servidor.close(resolve));
    }
}

test("Sin sesión no se puede editar el perfil", async () => {
    const resultado = await actualizarPerfil({ nombre: "Ana" });
    assert.equal(resultado.codigo, 401);
});

test("Un doctor no puede editar el perfil de paciente", async () => {
    const resultado = await actualizarPerfil(
        { nombre: "Ana" },
        "doctor"
    );

    assert.equal(resultado.codigo, 403);
});

test("Rechaza nombres vacíos y correos inválidos", async t => {
    t.mock.method(Usuario, "findOneAndUpdate", () => {
        throw new Error("No debe consultar MongoDB con datos inválidos");
    });

    assert.equal(
        (await actualizarPerfil({ nombre: "   " }, "paciente")).codigo,
        400
    );

    assert.equal(
        (await actualizarPerfil({ email: "incorrecto" }, "paciente")).codigo,
        400
    );
});

test("Rechaza cambios de rol y contraseña", async t => {
    t.mock.method(Usuario, "findOneAndUpdate", () => {
        throw new Error("No debe actualizar campos protegidos");
    });

    assert.equal(
        (await actualizarPerfil(
            { nombre: "Ana", rol: "administrador" },
            "paciente"
        )).codigo,
        400
    );

    assert.equal(
        (await actualizarPerfil(
            { password: "NoPermitido123" },
            "paciente"
        )).codigo,
        400
    );
});

test("Actualiza solo el perfil propio y normaliza los datos", async t => {
    let actualizacion;

    t.mock.method(
        Usuario,
        "findOneAndUpdate",
        (filtro, cambios, opciones) => {
            actualizacion = { filtro, cambios, opciones };

            return {
                select: async () => ({
                    _id: ID,
                    rol: "paciente",
                    ...cambios.$set
                })
            };
        }
    );

    const resultado = await actualizarPerfil({
        nombre: "  Ana Prueba  ",
        email: "  ANA@EJEMPLO.COM  "
    }, "paciente");

    assert.equal(resultado.codigo, 200);
    assert.equal(String(actualizacion.filtro._id), ID);
    assert.equal(actualizacion.filtro.rol, "paciente");

    assert.deepEqual(actualizacion.cambios, {
        $set: {
            nombre: "Ana Prueba",
            email: "ana@ejemplo.com"
        }
    });

    assert.equal(actualizacion.opciones.runValidators, true);

    assert.ok(
        actualizacion.opciones.new === true ||
        actualizacion.opciones.returnDocument === "after"
    );

    assert.equal(resultado.datos.usuario.nombre, "Ana Prueba");
    assert.equal(resultado.datos.usuario.password, undefined);
});

test("Un correo ya registrado devuelve 409", async t => {
    t.mock.method(Usuario, "findOneAndUpdate", () => ({
        select: async () => {
            const error = new Error("Correo duplicado");
            error.code = 11000;
            throw error;
        }
    }));

    const resultado = await actualizarPerfil({
        email: "ocupado@ejemplo.com"
    }, "paciente");

    assert.equal(resultado.codigo, 409);
});
