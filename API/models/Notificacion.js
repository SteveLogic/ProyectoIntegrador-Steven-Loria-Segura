
const mongoose = require("mongoose");

const notificacionSchema = new mongoose.Schema(
    {
        paciente: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Usuario",
            required: true
        },

        cita: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Cita",
            required: true
        },

        tipo: {
            type: String,
            enum: ["reserva", "reprogramacion", "cancelacion"],
            required: true
        },

        titulo: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100
        },

        mensaje: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500
        },

        leida: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

notificacionSchema.index({
    paciente: 1,
    createdAt: -1
});

module.exports = mongoose.model(
    "Notificacion",
    notificacionSchema,
    "notificaciones"
);