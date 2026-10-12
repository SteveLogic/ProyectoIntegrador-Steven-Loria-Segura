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


module.exports = router;