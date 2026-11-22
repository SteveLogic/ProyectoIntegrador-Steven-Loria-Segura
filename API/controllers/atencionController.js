const mongoose = require('mongoose');
const Cita = require('../models/Cita');
const Atencion = require('../models/Atencion');
const { validarAtencion, fechaCitaYaPaso } = require('../utils/validacionAtencion');

function errorServidor(res, error, mensaje) {
  console.error(mensaje, error);
  if (error?.code === 11000) {
    return res.status(409).json({ mensaje: 'Esta cita ya tiene una atención registrada.' });
  }
  if (error?.name === 'ValidationError') {
    return res.status(400).json({ mensaje: 'Los datos de la atención no cumplen las validaciones.' });
  }
  return res.status(500).json({ mensaje: 'Error interno en el módulo de atención.' });
}

// Confirmar la finalización de una cita pasada exclusivamente por su doctor.
const completarCita = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ mensaje: 'Identificador de cita inválido.' });
    }
    const cita = await Cita.findById(req.params.id);
    if (!cita) return res.status(404).json({ mensaje: 'Cita no encontrada.' });
    if (String(cita.doctor) !== req.sesion.usuarioId) {
      return res.status(403).json({ mensaje: 'La cita no está asignada a tu cuenta de doctor.' });
    }
    if (!fechaCitaYaPaso(cita)) {
      return res.status(409).json({ mensaje: 'Solo puedes completar una cita cuya fecha y hora ya hayan transcurrido.' });
    }
    if (!['pendiente', 'confirmada'].includes(cita.estado)) {
      return res.status(409).json({ mensaje: 'Esta cita no puede cambiarse a completada.' });
    }
    const resultado = await Cita.findOneAndUpdate(
      { _id: cita._id, doctor: req.sesion.usuarioId, estado: { $in: ['pendiente', 'confirmada'] } },
      { $set: { estado: 'completada' } },
      {
          returnDocument: "after",
          runValidators: true
      }
    );
    if (!resultado) return res.status(409).json({ mensaje: 'La cita cambió de estado. Actualiza la agenda.' });
    return res.json({ mensaje: 'Cita marcada como completada.', cita: resultado });
  } catch (error) { return errorServidor(res, error, 'Error al completar cita'); }
};

const registrarAtencion = async (req, res) => {
  try {
    const id = req.body?.cita;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ mensaje: 'Selecciona una cita válida.' });
    const evaluacion = validarAtencion(req.body);
    if (!evaluacion.valido) return res.status(400).json({ mensaje: evaluacion.mensaje });
    const cita = await Cita.findById(id);
    if (!cita) return res.status(404).json({ mensaje: 'Cita no encontrada.' });
    if (String(cita.doctor) !== req.sesion.usuarioId) {
      return res.status(403).json({ mensaje: 'No puedes registrar una atención de otro doctor.' });
    }
    if (cita.estado !== 'completada' || !fechaCitaYaPaso(cita)) {
      return res.status(409).json({ mensaje: 'La cita debe estar completada y su horario debe haber transcurrido.' });
    }
    const registro = await Atencion.create({
      cita: cita._id,
      paciente: cita.paciente,
      doctor: cita.doctor,
      ...evaluacion.datos
    });
    return res.status(201).json({ mensaje: 'Atención registrada en el historial del paciente.', atencion: registro });
  } catch (error) { return errorServidor(res, error, 'Error al registrar atención'); }
};

// Consultar el registro de una cita, solo si pertenece al doctor o al propio paciente.
const obtenerAtencionPorCita = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.citaId)) {
      return res.status(400).json({ mensaje: 'Identificador de cita inválido.' });
    }
    const cita = await Cita.findById(req.params.citaId);
    if (!cita) return res.status(404).json({ mensaje: 'Cita no encontrada.' });
    const esDoctor = req.sesion.rol === 'doctor' && String(cita.doctor) === req.sesion.usuarioId;
    const esPaciente = req.sesion.rol === 'paciente' && String(cita.paciente) === req.sesion.usuarioId;
    if (!esDoctor && !esPaciente) return res.status(403).json({ mensaje: 'No tienes permiso para consultar esta atención.' });
    const atencion = await Atencion.findOne({ cita: cita._id });
    if (!atencion) return res.status(404).json({ mensaje: 'Esta cita aún no tiene una atención registrada.' });
    return res.json(atencion);
  } catch (error) { return errorServidor(res, error, 'Error al consultar atención'); }
};

// Historial acotado: doctor ve solo sus propias atenciones del paciente; el paciente, solo las suyas.
const obtenerHistorialPaciente = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.pacienteId)) {
      return res.status(400).json({ mensaje: 'Identificador de paciente inválido.' });
    }
    const criterio = { paciente: req.params.pacienteId };
    if (req.sesion.rol === 'doctor') criterio.doctor = req.sesion.usuarioId;
    else if (req.sesion.rol === 'paciente' && req.sesion.usuarioId !== req.params.pacienteId) {
      return res.status(403).json({ mensaje: 'No puedes consultar el historial de otro paciente.' });
    } else if (req.sesion.rol !== 'paciente') return res.status(403).json({ mensaje: 'Acceso no permitido.' });
    const registros = await Atencion.find(criterio)
      .populate('cita', 'fecha hora especialidad estado')
      .sort({ createdAt: -1 })
      .limit(50);
    return res.json(registros);
  } catch (error) { return errorServidor(res, error, 'Error al consultar historial'); }
};

module.exports = { completarCita, registrarAtencion, obtenerAtencionPorCita, obtenerHistorialPaciente };
