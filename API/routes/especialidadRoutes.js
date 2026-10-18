
const express = require("express");

const {
    crearEspecialidad,
    obtenerEspecialidades,
    obtenerEspecialidadPorId,
    actualizarEspecialidad,
    desactivarEspecialidad

} = require("../controllers/especialidadController");

const router = express.Router();

// Crear especialidad médica
router.post("/", crearEspecialidad);

// Consultar todas las especialidades
router.get("/", obtenerEspecialidades);

// Consultar especialidad por ID
router.get("/:id", obtenerEspecialidadPorId);

// Actualizar especialidad médica
router.put("/:id", actualizarEspecialidad);

// Desactivar especialidad médica
router.delete("/:id", desactivarEspecialidad);

module.exports = router;
