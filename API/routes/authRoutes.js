const express = require("express");
const bcrypt = require("bcryptjs");
const Usuario = require("../models/Usuario");

const router = express.Router();


// Iniciar sesión
router.post("/login", async (req, res) => {
    try {
        const { email, password, rol } = req.body;

        // Validar campos obligatorios
        if (!email || !password || !rol) {
            return res.status(400).json({
                mensaje: "Todos los campos son obligatorios."
            });
        }

        // Buscar usuario por correo
        const usuario = await Usuario.findOne({
            email: email.trim().toLowerCase()
        });

        // Mensaje genérico por seguridad
        if (!usuario) {
            return res.status(401).json({
                mensaje: "Correo, contraseña o tipo de usuario incorrectos."
            });
        }

        // Comparar contraseña con el hash almacenado
        const passwordCorrecta = await bcrypt.compare(
            password,
            usuario.password
        );

        // Validar contraseña y rol
        if (!passwordCorrecta || usuario.rol !== rol) {
            return res.status(401).json({
                mensaje: "Correo, contraseña o tipo de usuario incorrectos."
            });
        }

        // Login correcto
        res.status(200).json({
            mensaje: "Inicio de sesión exitoso.",
            usuario: {
                id: usuario._id,
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.rol
            }
        });

    } catch (error) {
        res.status(500).json({
            mensaje: "Error interno al iniciar sesión.",
            error: error.message
        });
    }
});

router.post("/verificar-correo", async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                mensaje: "El correo electrónico es obligatorio."
            });
        }

        const usuario = await Usuario.findOne({
            email: email.trim().toLowerCase()
        });

        if (!usuario) {
            return res.status(404).json({
                mensaje: "No existe una cuenta registrada con ese correo electrónico."
            });
        }

        res.status(200).json({
            mensaje: "Correo electrónico encontrado.",
            usuario: {
                id: usuario._id,
                email: usuario.email
            }
        });

    } catch (error) {
        res.status(500).json({
            mensaje: "Error interno al verificar el correo electrónico.",
            error: error.message
        });
    }
});
router.put("/restablecer-password", async (req, res) => {
    try {
        const { email, nuevaPassword } = req.body;

        if (!email || !nuevaPassword) {
            return res.status(400).json({
                mensaje: "El correo electrónico y la nueva contraseña son obligatorios."
            });
        }

        // Validar requisitos de contraseña
        const passwordValida =
            nuevaPassword.length >= 8 &&
            /[A-Z]/.test(nuevaPassword) &&
            /[a-z]/.test(nuevaPassword) &&
            /[0-9]/.test(nuevaPassword);

        if (!passwordValida) {
            return res.status(400).json({
                mensaje:
                    "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número."
            });
        }

        const usuario = await Usuario.findOne({
            email: email.trim().toLowerCase()
        });

        if (!usuario) {
            return res.status(404).json({
                mensaje: "No existe una cuenta registrada con ese correo electrónico."
            });
        }

        const passwordHash = await bcrypt.hash(nuevaPassword, 10);

        usuario.password = passwordHash;

        await usuario.save();

        res.status(200).json({
            mensaje: "Contraseña actualizada correctamente."
        });

    } catch (error) {
        res.status(500).json({
            mensaje: "Error interno al restablecer la contraseña.",
            error: error.message
        });
    }
});


module.exports = router;