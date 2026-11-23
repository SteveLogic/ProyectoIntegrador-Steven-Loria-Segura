
const express = require("express");
const router = express.Router();

const {
    crearDoctor,
    listarDoctores,
    obtenerDoctorPorId,
    actualizarDoctor,
    desactivarDoctor,
    cambiarEstadoDoctor,
    asignarEspecialidadDoctor
} = require("../controllers/doctorController");

const {
    requerirSesion,
    requerirAdministrador
} = require("../middleware/sesiones");

// Consultar todos los doctores (público)
router.get("/", listarDoctores);

// Consultar un doctor por ID (público)
router.get("/:id", obtenerDoctorPorId);

// Registrar un perfil médico (solo administrador)
router.post(
    "/",
    requerirSesion,
    requerirAdministrador,
    crearDoctor
);

// Asignar especialidad (solo administrador)
router.put(
    "/:id/especialidad",
    requerirSesion,
    requerirAdministrador,
    asignarEspecialidadDoctor
);

// Actualizar información profesional (solo administrador)
router.put(
    "/:id",
    requerirSesion,
    requerirAdministrador,
    actualizarDoctor
);

// Activar/desactivar el perfil médico (solo administrador).
router.patch(
    "/:id/estado",
    requerirSesion,
    requerirAdministrador,
    cambiarEstadoDoctor
);

// Desactivar doctor (ruta anterior, conservada por compatibilidad)
router.delete(
    "/:id",
    requerirSesion,
    requerirAdministrador,
    desactivarDoctor
);

module.exports = router;
