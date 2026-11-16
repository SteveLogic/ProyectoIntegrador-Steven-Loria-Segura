const express = require('express');
const { requerirSesion, requerirDoctor } = require('../middleware/sesiones');
const {
  registrarAtencion, obtenerAtencionPorCita, obtenerHistorialPaciente
} = require('../controllers/atencionController');
const router = express.Router();

router.use(requerirSesion);
router.post('/', requerirDoctor, registrarAtencion);
router.get('/cita/:citaId', obtenerAtencionPorCita);
router.get('/paciente/:pacienteId', obtenerHistorialPaciente);
module.exports = router;
