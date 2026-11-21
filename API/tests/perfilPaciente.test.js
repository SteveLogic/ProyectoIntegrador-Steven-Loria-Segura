
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

async function solicitarPerfil(token) {
    const app = express();
    app.use(express.json());
    app.use("/api/auth", authRoutes);

    const servidor = app.listen(0);

    try {
        const respuesta = await fetch(
            `http://127.0.0.1:${servidor.address().port}/api/auth/perfil`,
            {
                headers: token
                    ? { Authorization: `Bearer ${token}` }
                    : {}
            }
        );

        return {
            codigo: respuesta.status,
            datos: await respuesta.json().catch(() => null)
        };
    } finally {
        await new Promise(resolve => servidor.close(resolve));
    }
}

test("Consultar perfil sin sesión devuelve 401", async () => {
    const respuesta = await solicitarPerfil();
    assert.equal(respuesta.codigo, 401);
});

test("Paciente consulta únicamente su propio perfil", async t => {
    const token = crearSesion({
        _id: ID,
        rol: "paciente"
    });

    t.after(() => cerrarSesionesDeUsuario(ID));

    const consulta = t.mock.method(
        Usuario,
        "findById",
        id => {
            assert.equal(String(id), ID);

            return {
                select: async () => ({
                    _id: ID,
                    nombre: "Paciente Prueba",
                    email: "paciente@example.com",
                    rol: "paciente"
                })
            };
        }
    );

    const respuesta = await solicitarPerfil(token);

    assert.equal(respuesta.codigo, 200);
    assert.equal(
        respuesta.datos.usuario.nombre,
        "Paciente Prueba"
    );
    assert.equal(
        respuesta.datos.usuario.email,
        "paciente@example.com"
    );
    assert.equal(
        respuesta.datos.usuario.password,
        undefined
    );
    assert.equal(consulta.mock.callCount(), 1);
});

test("Un doctor no puede consultar el perfil de paciente", async t => {
    const token = crearSesion({
        _id: ID,
        rol: "doctor"
    });

    t.after(() => cerrarSesionesDeUsuario(ID));

    const respuesta = await solicitarPerfil(token);

    assert.equal(respuesta.codigo, 403);
});