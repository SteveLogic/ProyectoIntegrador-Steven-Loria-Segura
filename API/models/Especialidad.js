
const mongoose = require("mongoose");

// Esquema de especialidades médicas
const especialidadSchema = new mongoose.Schema({

    nombre: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 80
    },

    descripcion: {
        type: String,
        trim: true,
        default: ""
    },

    activo: {
        type: Boolean,
        default: true
    }

}, {
    timestamps: true
});

// Exportar el modelo
module.exports = mongoose.model(
    "Especialidad",
    especialidadSchema,
    "especialidades"
);
