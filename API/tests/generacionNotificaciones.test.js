
const { test } = require("node:test");
const assert = require("node:assert/strict");

const Notificacion = require("../models/Notificacion");
const {
    registrarNotificacionCita
} = require("../utils/notificaciones");

const PACIENTE_ID = "111111111111111111111111";
const CITA_ID = "222222222222222222222222";

function citaSimulada() {
    return {
        _id: CITA_ID,
        paciente: PACIENTE_ID,
        fecha: "2026-11-24",
        hora: "09:30",
        motivo: "Dato clínico confidencial"
    };
}

const tipos = [
    ["reserva", "registrada"],
    ["reprogramacion", "reprogramada"],
    ["cancelacion", "cancelada"]
];

for (const [tipo, palabraEsperada] of tipos) {
    test(`Genera correctamente una notificación de ${tipo}`, async t => {
        const crear = t.mock.method(
            Notificacion,
            "create",
            async datos => ({
                _id: "333333333333333333333333",
                ...datos
            })
        );

        const resultado = await registrarNotificacionCita(
            citaSimulada(),
            tipo
        );

        assert.equal(crear.mock.callCount(), 1);

        const datosGuardados = crear.mock.calls[0].arguments[0];

        assert.equal(String(datosGuardados.paciente), PACIENTE_ID);
        assert.equal(String(datosGuardados.cita), CITA_ID);
        assert.equal(datosGuardados.tipo, tipo);
        assert.equal(datosGuardados.leida, false);

        assert.match(
            datosGuardados.mensaje,
            /2026-11-24/
        );

        assert.match(
            datosGuardados.mensaje,
            /09:30/
        );

        assert.match(
            datosGuardados.mensaje,
            new RegExp(palabraEsperada, "i")
        );

        assert.doesNotMatch(
            JSON.stringify(datosGuardados),
            /Dato clínico confidencial/
        );

        assert.equal(resultado.tipo, tipo);
    });
}

test("Admite un paciente representado por un documento poblado", async t => {
    const crear = t.mock.method(
        Notificacion,
        "create",
        async datos => datos
    );

    const cita = citaSimulada();
    cita.paciente = {
        _id: PACIENTE_ID,
        nombre: "Paciente de prueba"
    };

    await registrarNotificacionCita(cita, "reserva");

    const datos = crear.mock.calls[0].arguments[0];

    assert.equal(String(datos.paciente), PACIENTE_ID);
});

test("No genera notificaciones para un tipo desconocido", async t => {
    const crear = t.mock.method(
        Notificacion,
        "create",
        async datos => datos
    );

    const resultado = await registrarNotificacionCita(
        citaSimulada(),
        "desconocido"
    );

    assert.equal(resultado, null);
    assert.equal(crear.mock.callCount(), 0);
});

test("Un error al guardar la notificación no se propaga", async t => {
    const crear = t.mock.method(
        Notificacion,
        "create",
        async () => {
            throw new Error("Error simulado de MongoDB");
        }
    );

    const registrarError = t.mock.method(
        console,
        "error",
        () => {}
    );

    const resultado = await registrarNotificacionCita(
        citaSimulada(),
        "reserva"
    );

    assert.equal(resultado, null);
    assert.equal(crear.mock.callCount(), 1);
    assert.equal(registrarError.mock.callCount(), 1);
});
