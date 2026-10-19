
const express = require("express");

const {
    crearCita,
    obtenerCitas,
    obtenerCitaPorId,
    reprogramarCita,
    cancelarCita
} = require("../controllers/citaController");

const router = express.Router();

// Registrar una nueva cita médica
router.post("/", crearCita);

// Consultar todas las citas médicas
router.get("/", obtenerCitas);

// Consultar una cita por ID
router.get("/:id", obtenerCitaPorId);

// Reprogramar una cita médica
router.put("/:id", reprogramarCita);

// Cancelar una cita médica (eliminación lógica)
router.delete("/:id", cancelarCita);

module.exports = router;
