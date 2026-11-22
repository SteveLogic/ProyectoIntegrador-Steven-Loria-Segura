
const express = require("express");

const {
    crearUsuario,
    obtenerUsuarios,
    obtenerUsuarioPorId,
    actualizarUsuario,
    eliminarUsuario,
    cambiarEstadoUsuario,
    cambiarRolUsuario
} = require("../controllers/usuarioController");

const {
    requerirSesion,
    requerirAdministrador
} = require("../middleware/sesiones");

const router = express.Router();

// Todas las rutas de usuarios requieren
// una sesión válida con rol administrador.
router.use(requerirSesion, requerirAdministrador);

// Crear usuario
router.post("/", crearUsuario);

// Consultar todos los usuarios
router.get("/", obtenerUsuarios);

// Consultar usuario por ID
router.get("/:id", obtenerUsuarioPorId);

// Actualizar usuario
router.put("/:id", actualizarUsuario);

// Activar o desactivar usuarios.
router.patch("/:id/estado", cambiarEstadoUsuario);

// Cambiar el rol de un usuario.
router.patch("/:id/rol", cambiarRolUsuario);

// Eliminar usuario
router.delete("/:id", eliminarUsuario);

module.exports = router;
