
const express = require("express");

const {
    crearUsuario,
    obtenerUsuarios,
    obtenerUsuarioPorId,
    actualizarUsuario,
    eliminarUsuario
} = require("../controllers/usuarioController");

const router = express.Router();

// Crear usuario
router.post("/", crearUsuario);

// Consultar todos los usuarios
router.get("/", obtenerUsuarios);

// Consultar usuario por ID
router.get("/:id", obtenerUsuarioPorId);

// Actualizar usuario
router.put("/:id", actualizarUsuario);

// Eliminar usuario
router.delete("/:id", eliminarUsuario);

module.exports = router;
