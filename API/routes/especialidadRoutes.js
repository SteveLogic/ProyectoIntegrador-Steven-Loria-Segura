
const express = require("express");

const {
    crearEspecialidad,
    obtenerEspecialidades,
    obtenerEspecialidadPorId,
    actualizarEspecialidad,
    desactivarEspecialidad
} = require("../controllers/especialidadController");

// Middleware de autenticación y autorización
const {
    requerirSesion,
    requerirAdministrador
} = require("../middleware/sesiones");

const router = express.Router();

// Consultar todas las especialidades (público)
router.get("/", obtenerEspecialidades);

// Consultar especialidad por ID (público)
router.get("/:id", obtenerEspecialidadPorId);

// Crear especialidad (solo administrador)
router.post(
    "/",
    requerirSesion,
    requerirAdministrador,
    crearEspecialidad
);

// Actualizar especialidad (solo administrador)
router.put(
    "/:id",
    requerirSesion,
    requerirAdministrador,
    actualizarEspecialidad
);

// Desactivar especialidad (solo administrador)
router.delete(
    "/:id",
    requerirSesion,
    requerirAdministrador,
    desactivarEspecialidad
);

module.exports = router;
