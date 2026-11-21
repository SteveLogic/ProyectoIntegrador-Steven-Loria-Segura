
const mongoose = require("mongoose");
const Notificacion = require("../models/Notificacion");

// Consultar notificaciones del paciente autenticado.
const obtenerNotificaciones = async (req, res) => {
    try {
        const { usuarioId, rol } = req.sesion;

        if (rol !== "paciente") {
            return res.status(403).json({
                mensaje: "Solo un paciente puede consultar sus notificaciones."
            });
        }

        const notificaciones = await Notificacion.find({
            paciente: usuarioId
        })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        return res.status(200).json(notificaciones);

    } catch (error) {
        console.error("Error al consultar notificaciones:", error);

        return res.status(500).json({
            mensaje: "No se pudieron consultar las notificaciones."
        });
    }
};

// Marcar una notificación propia como leída.
const marcarNotificacionLeida = async (req, res) => {
    try {
        const { usuarioId, rol } = req.sesion;
        const { id } = req.params;

        if (rol !== "paciente") {
            return res.status(403).json({
                mensaje: "Solo un paciente puede modificar sus notificaciones."
            });
        }

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                mensaje: "El identificador de la notificación no es válido."
            });
        }

        const notificacion = await Notificacion.findOneAndUpdate(
            {
                _id: id,
                paciente: usuarioId
            },
            {
                $set: { leida: true }
            },
            {
                returnDocument: "after"
            }
        );

        if (!notificacion) {
            return res.status(404).json({
                mensaje: "Notificación no encontrada."
            });
        }

        return res.status(200).json({
            mensaje: "Notificación marcada como leída.",
            notificacion
        });

    } catch (error) {
        console.error("Error al actualizar notificación:", error);

        return res.status(500).json({
            mensaje: "No se pudo actualizar la notificación."
        });
    }
};

module.exports = {
    obtenerNotificaciones,
    marcarNotificacionLeida
};
