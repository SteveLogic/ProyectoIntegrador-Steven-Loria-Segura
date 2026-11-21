
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const { crearSesion } = require("../middleware/sesiones");
const Notificacion = require("../models/Notificacion");
const rutas = require("../routes/notificacionRoutes");

const PACIENTE_A = "111111111111111111111111";
const PACIENTE_B = "222222222222222222222222";
const DOCTOR = "333333333333333333333333";
const ADMIN = "444444444444444444444444";
const NOTIFICACION = "555555555555555555555555";

let servidor;
let urlBase;

before(async () => {
    const app = express();

    app.use(express.json());
    app.use("/api/notificaciones", rutas);

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

async function solicitar(metodo, ruta, sesion = {}) {
    const headers = {};

    if (sesion.rol) {
        const token = crearSesion({
            _id: sesion.usuarioId,
            rol: sesion.rol
        });

        headers.Authorization = `Bearer ${token}`;
    }

    const respuesta = await fetch(
        `${urlBase}/api/notificaciones${ruta}`,
        {
            method: metodo,
            headers
        }
    );

    return {
        codigo: respuesta.status,
        datos: await respuesta.json()
    };
}

test("Sin sesión no se pueden consultar ni modificar notificaciones", async () => {
    const consulta = await solicitar("GET", "/");

    const modificacion = await solicitar(
        "PATCH",
        `/${NOTIFICACION}/leida`
    );

    assert.equal(consulta.codigo, 401);
    assert.equal(modificacion.codigo, 401);
});

test("Doctor y administrador no pueden acceder a notificaciones de pacientes", async () => {
    for (const [rol, usuarioId] of [
        ["doctor", DOCTOR],
        ["administrador", ADMIN]
    ]) {
        const consulta = await solicitar(
            "GET",
            "/",
            { rol, usuarioId }
        );

        const modificacion = await solicitar(
            "PATCH",
            `/${NOTIFICACION}/leida`,
            { rol, usuarioId }
        );

        assert.equal(consulta.codigo, 403);
        assert.equal(modificacion.codigo, 403);
    }
});

test("Paciente consulta solamente sus propias notificaciones", async t => {
    const buscar = t.mock.method(
        Notificacion,
        "find",
        filtro => {
            assert.equal(String(filtro.paciente), PACIENTE_A);

            const consulta = {
                sort() {
                    return this;
                },
                limit() {
                    return this;
                },
                async lean() {
                    return [
                        {
                            _id: NOTIFICACION,
                            paciente: PACIENTE_A,
                            tipo: "reserva",
                            titulo: "Cita registrada",
                            mensaje: "Tu cita fue registrada.",
                            leida: false
                        }
                    ];
                }
            };

            return consulta;
        }
    );

    const respuesta = await solicitar("GET", "/", {
        rol: "paciente",
        usuarioId: PACIENTE_A
    });

    assert.equal(respuesta.codigo, 200);
    assert.equal(respuesta.datos.length, 1);
    assert.equal(respuesta.datos[0].paciente, PACIENTE_A);
    assert.equal(buscar.mock.callCount(), 1);
});

test("Paciente no puede usar un identificador inválido", async () => {
    const respuesta = await solicitar(
        "PATCH",
        "/identificador-invalido/leida",
        {
            rol: "paciente",
            usuarioId: PACIENTE_A
        }
    );

    assert.equal(respuesta.codigo, 400);
});

test("Paciente no puede marcar como leída una notificación ajena", async t => {
    const actualizar = t.mock.method(
        Notificacion,
        "findOneAndUpdate",
        async (filtro, cambios, opciones) => {
            assert.equal(String(filtro._id), NOTIFICACION);
            assert.equal(String(filtro.paciente), PACIENTE_B);
            assert.equal(cambios.$set.leida, true);
            assert.equal(opciones.returnDocument, "after");

            // No existe una notificación con ese ID
            // que pertenezca al paciente B.
            return null;
        }
    );

    const respuesta = await solicitar(
        "PATCH",
        `/${NOTIFICACION}/leida`,
        {
            rol: "paciente",
            usuarioId: PACIENTE_B
        }
    );

    assert.equal(respuesta.codigo, 404);
    assert.equal(actualizar.mock.callCount(), 1);
});

test("Paciente puede marcar como leída su propia notificación", async t => {
    const actualizar = t.mock.method(
        Notificacion,
        "findOneAndUpdate",
        async (filtro, cambios, opciones) => {
            assert.equal(String(filtro._id), NOTIFICACION);
            assert.equal(String(filtro.paciente), PACIENTE_A);
            assert.equal(cambios.$set.leida, true);
            assert.equal(opciones.returnDocument, "after");

            return {
                _id: NOTIFICACION,
                paciente: PACIENTE_A,
                tipo: "reserva",
                titulo: "Cita registrada",
                mensaje: "Tu cita fue registrada.",
                leida: true
            };
        }
    );

    const respuesta = await solicitar(
        "PATCH",
        `/${NOTIFICACION}/leida`,
        {
            rol: "paciente",
            usuarioId: PACIENTE_A
        }
    );

    assert.equal(respuesta.codigo, 200);
    assert.equal(respuesta.datos.notificacion.leida, true);
    assert.equal(actualizar.mock.callCount(), 1);
});