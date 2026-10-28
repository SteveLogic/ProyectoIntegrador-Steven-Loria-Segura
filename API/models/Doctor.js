
const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
      unique: true
    },

    especialidad: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Especialidad",
      required: true
    },

    numeroColegiado: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    telefono: {
      type: String,
      trim: true,
      default: ""
    },

    activo: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Doctor", doctorSchema);
