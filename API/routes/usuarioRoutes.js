const express = require("express");
const bcrypt = require("bcryptjs");
const Usuario = require("../models/Usuario");

const router = express.Router();


// Crear usuario
router.post("/", async (req, res) => {
    try {

        const passwordHash = await bcrypt.hash(
            req.body.password,
            10
        );

        const nuevoUsuario = new Usuario({
            nombre: req.body.nombre,
            email: req.body.email,
            password: passwordHash,
            rol: req.body.rol
        });

        const usuarioGuardado = await nuevoUsuario.save();

        res.status(201).json({
            _id: usuarioGuardado._id,
            nombre: usuarioGuardado.nombre,
            email: usuarioGuardado.email,
            rol: usuarioGuardado.rol
        });

    } catch (error) {

        if (error.code === 11000) {
            return res.status(400).json({
                mensaje: "El correo electrónico ya está registrado."
            });
        }

        res.status(400).json({
            mensaje: "Error al crear el usuario.",
            error: error.message
        });
    }
});


// Consultar usuarios
router.get("/", async (req, res) => {
    try {

        const usuarios = await Usuario
            .find()
            .select("-password");

        res.json(usuarios);

    } catch (error) {

        res.status(500).json({
            mensaje: "Error al consultar los usuarios."
        });
    }
});


module.exports = router;