
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const { crearSesion } = require("../middleware/sesiones");
const Disponibilidad = require("../models/Disponibilidad");
const rutas = require("../routes/disponibilidadRoutes");

const DOCTOR_A = "111111111111111111111111";
const DOCTOR_B = "222222222222222222222222";
const ADMIN = "333333333333333333333333";
const FRANJA = "444444444444444444444444";
const PACIENTE = "555555555555555555555555";

let servidor;
let urlBase;

before(async () => {
    const app = express();
    app.use(express.json());
    app.use("/api/disponibilidad", rutas);

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

async function solicitar(metodo, ruta, opciones = {}) {
    const headers = {
        "Content-Type": "application/json"
    };

    if (opciones.rol) {
        const token = crearSesion({
            _id: opciones.usuarioId,
            rol: opciones.rol
        });

        headers.Authorization = `Bearer ${token}`;
    }

    const configuracion = {
        method: metodo,
        headers
    };

    if (metodo === "POST" || metodo === "PUT") {
        configuracion.body = JSON.stringify(opciones.cuerpo || {});
    }

    const respuesta = await fetch(
        `${urlBase}/api/disponibilidad${ruta}`,
        configuracion
    );

    return {
        codigo: respuesta.status,
        datos: await respuesta.json()
    };
}

const documentoSimulado = () => ({
    _id: FRANJA,
    doctor: DOCTOR_A
});

test("Las consultas públicas no requieren sesión", async () => {
    const lista = await solicitar("GET", "/");
    const slots = await solicitar("GET", "/slots");

    // Ambas solicitudes llegan a la validación de parámetros.
    assert.equal(lista.codigo, 400);
    assert.equal(slots.codigo, 400);
});

test("Operaciones sin sesión devuelven 401", async () => {
    const operaciones = [
        ["POST", "/"],
        ["PUT", `/${FRANJA}`],
        ["DELETE", `/${FRANJA}`]
    ];

    for (const [metodo, ruta] of operaciones) {
        const respuesta = await solicitar(metodo, ruta);
        assert.equal(respuesta.codigo, 401);
    }
});

test("Paciente no puede administrar horarios", async t => {
    t.mock.method(
        Disponibilidad,
        "findById",
        async () => documentoSimulado()
    );

    const borrar = t.mock.method(
        Disponibilidad,
        "findOneAndDelete",
        async () => documentoSimulado()
    );

    const opciones = {
        rol: "paciente",
        usuarioId: PACIENTE
    };

    for (const [metodo, ruta] of [
        ["POST", "/"],
        ["PUT", `/${FRANJA}`],
        ["DELETE", `/${FRANJA}`]
    ]) {
        const respuesta = await solicitar(metodo, ruta, {
            ...opciones,
            cuerpo: { doctor: DOCTOR_A }
        });

        assert.equal(respuesta.codigo, 403);
    }

    assert.equal(borrar.mock.callCount(), 0);
});

test("Doctor no puede modificar horarios ajenos", async t => {
    t.mock.method(
        Disponibilidad,
        "findById",
        async () => documentoSimulado()
    );

    const borrar = t.mock.method(
        Disponibilidad,
        "findOneAndDelete",
        async () => documentoSimulado()
    );

    const opciones = {
        rol: "doctor",
        usuarioId: DOCTOR_B,
        cuerpo: {
            doctor: DOCTOR_A,
            diaSemana: -1,
            horaInicio: "09:00",
            horaFin: "10:00"
        }
    };

    for (const [metodo, ruta] of [
        ["POST", "/"],
        ["PUT", `/${FRANJA}`],
        ["DELETE", `/${FRANJA}`]
    ]) {
        const respuesta = await solicitar(
            metodo,
            ruta,
            opciones
        );

        assert.equal(respuesta.codigo, 403);
    }

    assert.equal(borrar.mock.callCount(), 0);
});

test("Doctor propietario supera la autorización", async t => {
    t.mock.method(
        Disponibilidad,
        "findById",
        async () => documentoSimulado()
    );

    const opciones = {
        rol: "doctor",
        usuarioId: DOCTOR_A,
        cuerpo: {
            doctor: DOCTOR_A,
            diaSemana: -1,
            horaInicio: "09:00",
            horaFin: "10:00"
        }
    };

    const crear = await solicitar("POST", "/", opciones);
    const editar = await solicitar(
        "PUT",
        `/${FRANJA}`,
        opciones
    );

    // Supera permisos, pero falla la validación de fecha/horas.
    assert.equal(crear.codigo, 400);
    assert.equal(editar.codigo, 400);
});

test("Propietario y administrador pueden eliminar una franja simulada", async t => {
    t.mock.method(
        Disponibilidad,
        "findById",
        async () => documentoSimulado()
    );

    const borrar = t.mock.method(
        Disponibilidad,
        "findOneAndDelete",
        async filtro => {
            assert.equal(String(filtro._id), FRANJA);
            assert.equal(String(filtro.doctor), DOCTOR_A);
            return documentoSimulado();
        }
    );

    const propietario = await solicitar(
        "DELETE",
        `/${FRANJA}`,
        {
            rol: "doctor",
            usuarioId: DOCTOR_A
        }
    );

    const administrador = await solicitar(
        "DELETE",
        `/${FRANJA}`,
        {
            rol: "administrador",
            usuarioId: ADMIN
        }
    );

    assert.equal(propietario.codigo, 200);
    assert.equal(administrador.codigo, 200);
    assert.equal(borrar.mock.callCount(), 2);
});
