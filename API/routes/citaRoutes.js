
const express = require("express");

const {
    crearCita,
    obtenerCitas,
    obtenerCitaPorId,
    reprogramarCita,
    cancelarCita
} = require("../controllers/citaController");

const {
    requerirSesion,
    requerirDoctor
} = require("../middleware/sesiones");

const { completarCita } = require("../controllers/atencionController");
const { actualizarEstadoDoctor } = require("../controllers/estadoCitaController");

const router = express.Router();

// Todas las operaciones de citas requieren una sesión válida.
router.use(requerirSesion);

// Registrar una nueva cita médica.
router.post("/", crearCita);

// Consultar citas según los permisos del usuario.
router.get("/", obtenerCitas);

// Consultar una cita por ID.
router.get("/:id", obtenerCitaPorId);

// Completar una cita: únicamente el doctor asignado.
router.patch("/:id/completar", requerirDoctor, completarCita);

// Actualizar estado (atendida, cancelada, no presentada) como doctor asignado.
router.patch("/:id/estado", requerirDoctor, actualizarEstadoDoctor);

// Reprogramar una cita.
router.put("/:id", reprogramarCita);

// Cancelar una cita.
router.delete("/:id", cancelarCita);

module.exports = router;
