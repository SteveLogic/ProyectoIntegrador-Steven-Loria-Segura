
const mongoose = require("mongoose");

// Esquema de citas médicas
const citaSchema = new mongoose.Schema({

    paciente: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Usuario",
        required: true
    },

    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Usuario",
        required: true
    },

    especialidad: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Especialidad",
        required: true
    },

    fecha: {
        type: String,
        required: true,
        match: /^\d{4}-\d{2}-\d{2}$/
    },

    hora: {
        type: String,
        required: true,
        match: /^([01]\d|2[0-3]):[0-5]\d$/
    },

    motivo: {
        type: String,
        trim: true,
        maxlength: 500,
        default: ""
    },

    estado: {
        type: String,
        enum: ["pendiente", "confirmada", "cancelada", "completada"],
        default: "pendiente"
    }

}, {
    timestamps: true
});

// Exportar el modelo
module.exports = mongoose.model(
    "Cita",
    citaSchema,
    "citas"
);
