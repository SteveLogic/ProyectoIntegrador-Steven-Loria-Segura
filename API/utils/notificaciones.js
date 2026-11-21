
const Notificacion = require("../models/Notificacion");
const Usuario = require("../models/Usuario");

async function registrarNotificacionCita(cita, tipo) {
    const tiposValidos = [
        "reserva",
        "reprogramacion",
        "cancelacion"
    ];

    if (!cita || !tiposValidos.includes(tipo)) {
        return null;
    }

    try {
        const pacienteId = cita.paciente?._id || cita.paciente;
        const doctorId = cita.doctor?._id || cita.doctor;

        // Obtener el nombre si el doctor ya está poblado.
        let nombreDoctor =
            typeof cita.doctor?.nombre === "string"
                ? cita.doctor.nombre.trim()
                : "";

        // Consultar MongoDB si solamente tenemos el ID.
        if (!nombreDoctor && doctorId) {
            const usuarioDoctor = await Usuario.findById(
                doctorId,
                "nombre"
            );

            nombreDoctor =
                typeof usuarioDoctor?.nombre === "string"
                    ? usuarioDoctor.nombre.trim()
                    : "";
        }

        const nombreMostrar = nombreDoctor || "el doctor asignado";

        const mensajes = {
            reserva: {
                titulo: "Cita médica registrada",
                mensaje: `Tu cita médica con ${nombreMostrar} fue registrada para el ${cita.fecha} a las ${cita.hora}.`
            },

            reprogramacion: {
                titulo: "Cita médica reprogramada",
                mensaje: `Tu cita médica con ${nombreMostrar} fue reprogramada para el ${cita.fecha} a las ${cita.hora}.`
            },

            cancelacion: {
                titulo: "Cita médica cancelada",
                mensaje: `Tu cita médica con ${nombreMostrar} del ${cita.fecha} a las ${cita.hora} fue cancelada.`
            }
        };

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

        // Un fallo de notificación no revierte la operación de la cita.
        return null;
    }
}

module.exports = {
    registrarNotificacionCita
};
