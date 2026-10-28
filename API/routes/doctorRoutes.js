
const express = require("express");
const router = express.Router();

const {
  crearDoctor,
  listarDoctores,
  obtenerDoctorPorId,
  actualizarDoctor,
  desactivarDoctor,
  asignarEspecialidadDoctor
} = require("../controllers/doctorController");

// Registrar un perfil médico
router.post("/", crearDoctor);

// Listar todos los doctores
router.get("/", listarDoctores);

// Consultar un doctor por ID
router.get("/:id", obtenerDoctorPorId);

router.put("/:id/especialidad", asignarEspecialidadDoctor);

// Actualizar la información profesional
router.put("/:id", actualizarDoctor);

// Desactivar un doctor (eliminación lógica)
router.delete("/:id", desactivarDoctor);

module.exports = router;
