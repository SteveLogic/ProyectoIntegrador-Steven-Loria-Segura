
const express = require("express");

const {
    crearCita,
    obtenerCitas,
    obtenerCitaPorId,
    reprogramarCita,
    cancelarCita
} = require("../controllers/citaController");

const { requerirSesion, requerirDoctor } = require("../middleware/sesiones");
const { completarCita } = require("../controllers/atencionController");

const router = express.Router();

// Registrar una nueva cita médica
router.post("/", crearCita);

// Consultar todas las citas médicas
router.get("/", obtenerCitas);

// Consultar una cita por ID
router.get("/:id", obtenerCitaPorId);

// Marcar una cita pasada como completada (solo doctor asignado autenticado)
router.patch("/:id/completar", requerirSesion, requerirDoctor, completarCita);

// Reprogramar una cita médica
router.put("/:id", reprogramarCita);

// Cancelar una cita médica (eliminación lógica)
router.delete("/:id", cancelarCita);

module.exports = router;
