const router = require("express").Router();

const controller = require("../controllers/disponibilidadController");

const {
    requerirSesion
} = require("../middleware/sesiones");

// Consultas públicas de disponibilidad
router.get("/slots", controller.slots);
router.get("/", controller.listar);

// Operaciones que requieren autenticación
router.post("/", requerirSesion, controller.crear);
router.put("/:id", requerirSesion, controller.editar);
router.delete("/:id", requerirSesion, controller.eliminar);

module.exports = router;
