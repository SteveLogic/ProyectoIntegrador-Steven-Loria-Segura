
const express = require("express");
const router = express.Router();

const {
    obtenerNotificaciones,
    marcarNotificacionLeida
} = require("../controllers/notificacionController");

const {
    requerirSesion
} = require("../middleware/sesiones");

// Todas las rutas requieren una sesión válida.
router.use(requerirSesion);

// Consultar las notificaciones del paciente autenticado.
router.get("/", obtenerNotificaciones);

// Marcar una notificación propia como leída.
router.patch("/:id/leida", marcarNotificacionLeida);

module.exports = router;