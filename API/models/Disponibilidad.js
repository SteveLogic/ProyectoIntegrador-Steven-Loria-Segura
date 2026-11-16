const mongoose = require('mongoose');

// Dia de la semana: domingo=0, lunes=1, ..., sabado=6.
const disponibilidadSchema = new mongoose.Schema({
  doctor: {type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true},
  diaSemana: {type: Number, min: 0, max: 6, required: true},
  horaInicio: {type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/},
  horaFin: {type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/}
}, {timestamps: true});

disponibilidadSchema.index({doctor: 1, diaSemana: 1, horaInicio: 1}, {unique: true});
module.exports = mongoose.model('Disponibilidad', disponibilidadSchema, 'disponibilidades');
