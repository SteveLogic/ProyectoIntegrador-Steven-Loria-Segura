const express = require("express");
const bcrypt = require("bcryptjs");
const Usuario = require("../models/Usuario");
const { crearSesion, requerirSesion, cerrarSesion, cerrarSesionesDeUsuario } = require("../middleware/sesiones");

const router = express.Router();

// Iniciar sesión según el rol del usuario.
router.post("/login", async (req, res) => {
    try {
        const { email, password, rol } = req.body || {};

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            typeof rol !== "string" ||
            !email.trim() || !password || !rol
        ) {
            return res.status(400).json({
                mensaje: "Todos los campos son obligatorios."
            });
        }

        const usuario = await Usuario.findOne({
            email: email.trim().toLowerCase()
        });

        if (!usuario) {
            return res.status(401).json({
                mensaje: "Correo, contraseña o tipo de usuario incorrectos."
            });
        }

        const passwordCorrecta = await bcrypt.compare(password, usuario.password);

        if (!passwordCorrecta || usuario.rol !== rol) {
            return res.status(401).json({
                mensaje: "Correo, contraseña o tipo de usuario incorrectos."
            });
        }

        return res.status(200).json({
            mensaje: "Inicio de sesión exitoso.",
            token: crearSesion(usuario),
            usuario: {
                id: usuario._id,
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.rol
            }
        });
    } catch (error) {
        console.error("Error al iniciar sesión:", error);
        return res.status(500).json({
            mensaje: "Error interno al iniciar sesión."
        });
    }
});

// Temporal: deshabilitada hasta implementar verificación de identidad por correo.
// Conocer una dirección de email no demuestra que se es dueño de la cuenta.
router.post("/verificar-correo", (req, res) => {
    return res.status(503).json({
        mensaje: "La recuperación por correo no está disponible temporalmente."
    });
});

// Se mantiene la ruta para evitar que clientes antiguos puedan cambiar contraseñas.
router.put("/restablecer-password", (req, res) => {
    return res.status(403).json({
        mensaje: "No se puede restablecer una contraseña sin verificar la identidad."
    });
});

// Cambiar contraseña con sesión válida y contraseña actual.
router.put("/cambiar-password", requerirSesion, async (req, res) => {
    try {
        const { passwordActual, nuevaPassword } = req.body || {};

        if (
            typeof passwordActual !== "string" ||
            typeof nuevaPassword !== "string" ||
            !passwordActual || !nuevaPassword
        ) {
            return res.status(400).json({
                mensaje: "La contraseña actual y la nueva son obligatorias."
            });
        }

        // bcrypt utiliza como máximo 72 bytes de la contraseña.
        const passwordValida =
            nuevaPassword.length >= 8 &&
            Buffer.byteLength(nuevaPassword, "utf8") <= 72 &&
            /[A-Z]/.test(nuevaPassword) &&
            /[a-z]/.test(nuevaPassword) &&
            /[0-9]/.test(nuevaPassword);

        if (!passwordValida) {
            return res.status(400).json({
                mensaje: "La nueva contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número, y no superar 72 bytes."
            });
        }

        const usuario = await Usuario.findById(req.sesion.usuarioId);
        if (!usuario) {
            return res.status(401).json({ mensaje: "Sesión inválida." });
        }

        const correcta = await bcrypt.compare(passwordActual, usuario.password);
        if (!correcta) {
            return res.status(403).json({
                mensaje: "La contraseña actual es incorrecta."
            });
        }

        if (passwordActual === nuevaPassword) {
            return res.status(400).json({
                mensaje: "La nueva contraseña debe ser diferente a la actual."
            });
        }

        usuario.password = await bcrypt.hash(nuevaPassword, 10);
        await usuario.save();

        cerrarSesionesDeUsuario(usuario._id);

        return res.status(200).json({
            mensaje: "Contraseña actualizada correctamente. Vuelve a iniciar sesión."
        });
    } catch (error) {
        console.error("Error al cambiar contraseña:", error);
        return res.status(500).json({
            mensaje: "No se pudo actualizar la contraseña."
        });
    }
});

router.post("/logout", requerirSesion, cerrarSesion);

module.exports = router;
