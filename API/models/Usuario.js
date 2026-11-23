const mongoose = require("mongoose");

const usuarioSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true,
        unique: true
    },

    password: {
        type: String,
        required: true
    },

    rol: {
        type: String,
        required: true,
        enum: ["paciente", "doctor", "administrador"]
    },

    resetTokenHash: { type: String, select: false },
    resetTokenExpira: { type: Date, select: false },

    activo: {
    type: Boolean,
    default: true
}
});

module.exports = mongoose.model("Usuario", usuarioSchema);