const mongoose = require('mongoose');

// Registro clínico académico: una atención por cita completada.
// Las relaciones se obtienen en el servidor desde la cita; nunca del cuerpo del POST.
const atencionSchema = new mongoose.Schema({
  cita: { type: mongoose.Schema.Types.ObjectId, ref: 'Cita', required: true, unique: true },
  paciente: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
  motivo: { type: String, required: true, trim: true, maxlength: 500 },
  observaciones: { type: String, required: true, trim: true, maxlength: 1000 },
  diagnostico: { type: String, required: true, trim: true, maxlength: 500 },
  indicaciones: { type: String, trim: true, maxlength: 500, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Atencion', atencionSchema, 'atenciones');
