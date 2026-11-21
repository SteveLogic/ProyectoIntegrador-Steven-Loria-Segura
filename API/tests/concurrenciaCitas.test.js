const { test } = require("node:test");
const assert = require("node:assert/strict");

const Cita = require("../models/Cita");
const Notificacion = require("../models/Notificacion");

// Simular la validación de horarios sin consultar MongoDB.
const horarios = require("../utils/horarios");
const validarOriginal = horarios.evaluarHorario;
horarios.evaluarHorario = async () => ({ valido: true });
const { reprogramarCita, cancelarCita } = require("../controllers/citaController");
horarios.evaluarHorario = validarOriginal;

const PACIENTE = "111111111111111111111111";
const ID_CITA = "666666666666666666666666";

function preparar(t) {
    let guardada = {
        _id: ID_CITA,
        paciente: PACIENTE,
        doctor: { _id: "333333333333333333333333", nombre: "Doctor Prueba" },
        fecha: "2099-01-10",
        hora: "09:00",
        estado: "pendiente"
    };
    let lecturas = 0;
    let liberar;
    const ambasLeidas = new Promise(resolve => { liberar = resolve; });

    t.mock.method(Cita, "findById", async () => {
        const instantanea = { ...guardada };
        lecturas++;
        if (lecturas <= 2) {
            if (lecturas === 2) liberar();
            await ambasLeidas;
        }
        return instantanea;
    });

    t.mock.method(Cita, "findOneAndUpdate", async (filtro, cambio) => {
        if (String(filtro._id) !== ID_CITA) return null;
        if (!filtro.estado.$in.includes(guardada.estado)) return null;
        if (filtro.fecha !== undefined && filtro.fecha !== guardada.fecha) return null;
        if (filtro.hora !== undefined && filtro.hora !== guardada.hora) return null;
        guardada = { ...guardada, ...cambio.$set };
        return { ...guardada };
    });

    const crear = t.mock.method(Notificacion, "create", async datos => datos);
    return { crear, actual: () => ({ ...guardada }) };
}

function respuesta() {
    return {
        codigo: 200,
        datos: null,
        status(codigo) { this.codigo = codigo; return this; },
        json(datos) { this.datos = datos; return this; }
    };
}

function peticion(fecha, hora) {
    return {
        params: { id: ID_CITA },
        sesion: { usuarioId: PACIENTE, rol: "paciente" },
        body: { fecha, hora }
    };
}

test("Dos reprogramaciones iguales simultáneas generan solo un aviso", async t => {
    const { crear, actual } = preparar(t);
    const a = respuesta();
    const b = respuesta();
    await Promise.all([
        reprogramarCita(peticion("2099-01-12", "09:30"), a),
        reprogramarCita(peticion("2099-01-12", "09:30"), b)
    ]);
    assert.deepEqual([a.codigo, b.codigo].sort(), [200, 200]);
    assert.equal(crear.mock.callCount(), 1);
    assert.equal(crear.mock.calls[0].arguments[0].tipo, "reprogramacion");
    assert.equal(actual().fecha, "2099-01-12");
    assert.equal(actual().hora, "09:30");
});

test("Reprogramaciones simultáneas distintas no se sobrescriben", async t => {
    const { crear, actual } = preparar(t);
    const a = respuesta();
    const b = respuesta();
    await Promise.all([
        reprogramarCita(peticion("2099-01-12", "09:30"), a),
        reprogramarCita(peticion("2099-01-13", "10:00"), b)
    ]);
    assert.deepEqual([a.codigo, b.codigo].sort(), [200, 409]);
    assert.equal(crear.mock.callCount(), 1);
    assert.equal(actual().fecha, "2099-01-12");
});

test("Dos cancelaciones simultáneas generan solo un aviso", async t => {
    const { crear, actual } = preparar(t);
    const a = respuesta();
    const b = respuesta();
    await Promise.all([
        cancelarCita(peticion(), a),
        cancelarCita(peticion(), b)
    ]);
    assert.deepEqual([a.codigo, b.codigo].sort(), [200, 409]);
    assert.equal(crear.mock.callCount(), 1);
    assert.equal(crear.mock.calls[0].arguments[0].tipo, "cancelacion");
    assert.equal(actual().estado, "cancelada");
});
