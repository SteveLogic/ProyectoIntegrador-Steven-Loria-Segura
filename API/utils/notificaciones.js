
const Notificacion = require("../models/Notificacion");

async function registrarNotificacionCita(cita, tipo) {
    const mensajes = {
        reserva: {
            titulo: "Cita médica registrada",
            mensaje: `Tu cita médica fue registrada para el ${cita.fecha} a las ${cita.hora}.`
        },
        reprogramacion: {
            titulo: "Cita médica reprogramada",
            mensaje: `Tu cita médica fue reprogramada para el ${cita.fecha} a las ${cita.hora}.`
        },
        cancelacion: {
            titulo: "Cita médica cancelada",
            mensaje: `Tu cita médica del ${cita.fecha} a las ${cita.hora} fue cancelada.`
        }
    };

    if (!cita || !mensajes[tipo]) {
        return null;
    }

    try {
        const pacienteId = cita.paciente?._id || cita.paciente;

        const notificacion = await Notificacion.create({
            paciente: pacienteId,
            cita: cita._id,
            tipo,
            titulo: mensajes[tipo].titulo,
            mensaje: mensajes[tipo].mensaje,
            leida: false
        });

        return notificacion;

    } catch (error) {
        console.error(
            `Error al registrar notificación de ${tipo}:`,
            error
        );

        // La operación de la cita ya fue exitosa.
        // Un error de notificación no debe revertirla.
        return null;
    }
}

module.exports = {
    registrarNotificacionCita
};