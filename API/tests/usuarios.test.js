
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const Usuario = require("../models/Usuario");
const { crearSesion } = require("../middleware/sesiones");
const usuarioRoutes = require("../routes/usuarioRoutes");

const findOriginal = Usuario.find;

let servidor;
let baseURL;
let consultasBD = 0;

before(async () => {
    // Simular las consultas de usuarios.
    // No se realizará ninguna conexión a MongoDB.
    Usuario.find = () => {
        consultasBD++;

        return {
            select: async () => []
        };
    };

    const app = express();
    app.use(express.json());
    app.use("/api/usuarios", usuarioRoutes);

    await new Promise(resolve => {
        servidor = app.listen(0, "127.0.0.1", resolve);
    });

    baseURL = `http://127.0.0.1:${servidor.address().port}`;
});

after(async () => {
    Usuario.find = findOriginal;

    if (servidor) {
        await new Promise(resolve => servidor.close(resolve));
    }
});

async function solicitar(metodo, rol = null) {
    const headers = {};

    if (rol) {
        const token = crearSesion({
            _id: `usuario-${rol}`,
            rol
        });

        headers.Authorization = `Bearer ${token}`;
    }

    return fetch(`${baseURL}/api/usuarios`, {
        method: metodo,
        headers
    });
}

test("GET sin autenticación devuelve 401", async () => {
    const respuesta = await solicitar("GET");

    assert.equal(respuesta.status, 401);
});

test("POST sin autenticación devuelve 401", async () => {
    const respuesta = await solicitar("POST");

    assert.equal(respuesta.status, 401);
});

test("Paciente no puede consultar usuarios", async () => {
    const respuesta = await solicitar("GET", "paciente");

    assert.equal(respuesta.status, 403);
});

test("Doctor no puede consultar usuarios", async () => {
    const respuesta = await solicitar("GET", "doctor");

    assert.equal(respuesta.status, 403);
});

test("Administrador puede consultar usuarios", async () => {
    const respuesta = await solicitar(
        "GET",
        "administrador"
    );

    assert.equal(respuesta.status, 200);

    const usuarios = await respuesta.json();

    assert.deepEqual(usuarios, []);
    assert.equal(consultasBD, 1);
});
