
const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const bcrypt = require("bcryptjs");

const Usuario = require("../models/Usuario");
const authRoutes = require("../routes/authRoutes");

const {
    cerrarSesionesDeUsuario
} = require("../middleware/sesiones");

const ID = "111111111111111111111111";
const PASSWORD = "PruebaSegura123";
const HASH = bcrypt.hashSync(PASSWORD, 4);

async function intentarLogin() {
    const app = express();

    app.use(express.json());
    app.use("/api/auth", authRoutes);

    const servidor = await new Promise(resolve => {
        const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });

    try {
        const respuesta = await fetch(
            `http://127.0.0.1:${servidor.address().port}/api/auth/login`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: "paciente@example.com",
                    password: PASSWORD,
                    rol: "paciente"
                })
            }
        );

        return {
            codigo: respuesta.status,
            datos: await respuesta.json()
        };

    } finally {
        cerrarSesionesDeUsuario(ID);

        await new Promise(resolve =>
            servidor.close(resolve)
        );
    }
}

test("Los usuarios nuevos quedan activos por defecto", () => {
    const usuario = new Usuario({
        nombre: "Paciente Prueba",
        email: "paciente@example.com",
        password: HASH,
        rol: "paciente"
    });

    assert.equal(usuario.activo, true);
});

test("Una cuenta inactiva no puede iniciar sesión", async t => {
    t.mock.method(Usuario, "findOne", async () => ({
        _id: ID,
        nombre: "Paciente Prueba",
        email: "paciente@example.com",
        password: HASH,
        rol: "paciente",
        activo: false
    }));

    const resultado = await intentarLogin();

    assert.equal(resultado.codigo, 403);
    assert.equal(resultado.datos.token, undefined);
});

test("Una cuenta activa puede iniciar sesión", async t => {
    t.mock.method(Usuario, "findOne", async () => ({
        _id: ID,
        nombre: "Paciente Prueba",
        email: "paciente@example.com",
        password: HASH,
        rol: "paciente",
        activo: true
    }));

    const resultado = await intentarLogin();

    assert.equal(resultado.codigo, 200);
    assert.match(resultado.datos.token, /^[a-f0-9]{64}$/);
});

test("Una cuenta existente sin campo activo conserva el acceso", async t => {
    t.mock.method(Usuario, "findOne", async () => ({
        _id: ID,
        nombre: "Paciente Antiguo",
        email: "paciente@example.com",
        password: HASH,
        rol: "paciente"
    }));

    const resultado = await intentarLogin();

    assert.equal(resultado.codigo, 200);
    assert.match(resultado.datos.token, /^[a-f0-9]{64}$/);
});
