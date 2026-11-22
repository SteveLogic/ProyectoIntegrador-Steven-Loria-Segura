const mongoose = require('mongoose');
const Cita = require('../models/Cita');
const { fechaCitaYaPaso } = require('../utils/validacionAtencion');
const { registrarNotificacionCita } = require('../utils/notificaciones');

/**
 * Cambios controlados por el doctor propietario de la cita.
 * Una cita pendiente/confirmada puede terminar como completada,
 * no presentada (solo después de su horario) o cancelada (antes del horario).
 * findOneAndUpdate usa estado previo como condición para evitar carreras.
 */
async function actualizarEstadoDoctor(req, res) {
  const { id } = req.params;
  const cuerpo = req.body;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ mensaje: 'Identificador de cita inválido.' });
  }
  if (!cuerpo || Array.isArray(cuerpo) || typeof cuerpo !== 'object' ||
      Object.keys(cuerpo).length !== 1 ||
      !['completada', 'cancelada', 'no_presentada'].includes(cuerpo.estado)) {
    return res.status(400).json({ mensaje: 'Estado inválido. Usa completada, cancelada o no_presentada.' });
  }
  try {
    const cita = await Cita.findById(id);
    if (!cita) return res.status(404).json({ mensaje: 'Cita no encontrada.' });
    if (String(cita.doctor) !== req.sesion.usuarioId) {
      return res.status(403).json({ mensaje: 'Solo el doctor asignado puede modificar esta cita.' });
    }
    if (!['pendiente', 'confirmada'].includes(cita.estado)) {
      return res.status(409).json({ mensaje: 'Una cita finalizada no puede volver a cambiar de estado.' });
    }
    const transcurrida = fechaCitaYaPaso(cita);
    if (cuerpo.estado === 'cancelada' && transcurrida) {
      return res.status(409).json({ mensaje: 'No puedes cancelar una cita cuyo horario ya transcurrió.' });
    }
    if (cuerpo.estado !== 'cancelada' && !transcurrida) {
      return res.status(409).json({ mensaje: 'Solo puedes marcar como atendida o no presentada una cita pasada.' });
    }

    const resultado = await Cita.findOneAndUpdate(
      { _id: cita._id, doctor: req.sesion.usuarioId, estado: { $in: ['pendiente', 'confirmada'] } },
      { $set: { estado: cuerpo.estado } },
      { returnDocument: 'after', runValidators: true }
    );
    if (!resultado) return res.status(409).json({ mensaje: 'La cita cambió de estado. Actualiza la agenda.' });
    if (cuerpo.estado === 'cancelada') {
      await registrarNotificacionCita(resultado, 'cancelacion');
    }
    return res.json({ mensaje: 'Estado de cita actualizado correctamente.', cita: resultado });
  } catch (error) {
    console.error('Error al actualizar estado de cita:', error);
    if (error?.name === 'ValidationError') return res.status(400).json({ mensaje: 'El estado no es válido.' });
    return res.status(500).json({ mensaje: 'No se pudo actualizar el estado de la cita.' });
  }
}

module.exports = { actualizarEstadoDoctor };
