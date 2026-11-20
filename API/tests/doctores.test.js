
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const { crearSesion } = require("../middleware/sesiones");
const doctorRoutes = require("../routes/doctorRoutes");

let servidor;
let urlBase;

before(async () => {
    const app = express();

    app.use(express.json());
    app.use("/api/doctores", doctorRoutes);

    await new Promise(resolve => {
        servidor = app.listen(0, "127.0.0.1", resolve);
    });

    urlBase = `http://127.0.0.1:${servidor.address().port}`;
});

after(async () => {
    if (servidor) {
        await new Promise(resolve => servidor.close(resolve));
    }
});

async function solicitar(metodo, ruta, rol = null) {
    const headers = {
        "Content-Type": "application/json"
    };

    if (rol) {
        const token = crearSesion({
            _id: `usuario-${rol}`,
            rol
        });

        headers.Authorization = `Bearer ${token}`;
    }

    const respuesta = await fetch(
        `${urlBase}/api/doctores${ruta}`,
        {
            method: metodo,
            headers,
            ...(
                metodo === "POST" || metodo === "PUT"
                    ? { body: JSON.stringify({}) }
                    : {}
            )
        }
    );

    return {
        codigo: respuesta.status,
        datos: await respuesta.json()
    };
}

// ID ficticio válido para pruebas de autorización
const idFicticio = "000000000000000000000000";

const operaciones = [
    ["POST", "/"],
    ["PUT", `/${idFicticio}`],
    ["PUT", `/${idFicticio}/especialidad`],
    ["DELETE", `/${idFicticio}`]
];

test("Operaciones administrativas sin sesión devuelven 401", async () => {
    for (const [metodo, ruta] of operaciones) {
        const respuesta = await solicitar(metodo, ruta);

        assert.equal(respuesta.codigo, 401);
    }
});

test("Paciente no puede modificar doctores", async () => {
    for (const [metodo, ruta] of operaciones) {
        const respuesta = await solicitar(
            metodo,
            ruta,
            "paciente"
        );

        assert.equal(respuesta.codigo, 403);
    }
});

test("Doctor no puede modificar perfiles médicos", async () => {
    for (const [metodo, ruta] of operaciones) {
        const respuesta = await solicitar(
            metodo,
            ruta,
            "doctor"
        );

        assert.equal(respuesta.codigo, 403);
    }
});

test("Administrador supera permisos pero debe validar datos", async () => {
    const respuesta = await solicitar(
        "POST",
        "/",
        "administrador"
    );

    assert.equal(respuesta.codigo, 400);
    assert.match(
        respuesta.datos.mensaje,
        /usuario|especialidad|colegiado/i
    );
});
