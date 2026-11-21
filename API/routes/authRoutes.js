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

/**
 * Registro público de pacientes.
 * El rol siempre se asigna en el servidor.
 */
router.post("/registro-paciente", async (req, res) => {
    try {
        const { nombre, email, password } = req.body || {};

        if (
            typeof nombre !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string"
        ) {
            return res.status(400).json({
                mensaje: "Todos los campos son obligatorios."
            });
        }

        const nombreLimpio = nombre.trim();
        const emailLimpio = email.trim().toLowerCase();

        if (!nombreLimpio || nombreLimpio.length > 100) {
            return res.status(400).json({
                mensaje: "El nombre debe tener entre 1 y 100 caracteres."
            });
        }

        if (
            emailLimpio.length > 150 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpio)
        ) {
            return res.status(400).json({
                mensaje: "Ingresa un correo electrónico válido."
            });
        }

        const passwordValida =
            password.length >= 8 &&
            Buffer.byteLength(password, "utf8") <= 72 &&
            /[A-Z]/.test(password) &&
            /[a-z]/.test(password) &&
            /[0-9]/.test(password);

        if (!passwordValida) {
            return res.status(400).json({
                mensaje: "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número, y no superar 72 bytes."
            });
        }

        const existente = await Usuario.findOne({
            email: emailLimpio
        });

        if (existente) {
            return res.status(409).json({
                mensaje: "El correo electrónico ya está registrado."
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const nuevoUsuario = new Usuario({
            nombre: nombreLimpio,
            email: emailLimpio,
            password: passwordHash,
            rol: "paciente"
        });

        const usuarioGuardado = await nuevoUsuario.save();

        return res.status(201).json({
            mensaje: "Cuenta de paciente creada correctamente.",
            usuario: {
                id: usuarioGuardado._id,
                nombre: usuarioGuardado.nombre,
                email: usuarioGuardado.email,
                rol: usuarioGuardado.rol
            }
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                mensaje: "El correo electrónico ya está registrado."
            });
        }

        console.error("Error al registrar paciente:", error);

        return res.status(500).json({
            mensaje: "No se pudo completar el registro."
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

 // Consultar el perfil del paciente autenticado.
router.get("/perfil", requerirSesion, async (req, res) => {
    if (req.sesion.rol !== "paciente") {
        return res.status(403).json({
            mensaje: "Solo un paciente puede consultar este perfil."
        });
    }

    try {
        const usuario = await Usuario
            .findById(req.sesion.usuarioId)
            .select("-password");

        if (!usuario || usuario.rol !== "paciente") {
            return res.status(401).json({
                mensaje: "Sesión inválida. Vuelve a iniciar sesión."
            });
        }

        return res.status(200).json({ usuario });

    } catch (error) {
        console.error("Error al consultar el perfil:", error);

        return res.status(500).json({
            mensaje: "No se pudo consultar el perfil."
        });
    }
});

 // Actualizar el nombre y correo del paciente autenticado.
router.put("/perfil", requerirSesion, async (req, res) => {
    if (req.sesion.rol !== "paciente") {
        return res.status(403).json({
            mensaje: "Solo un paciente puede editar este perfil."
        });
    }

    const datos = req.body;

    if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
        return res.status(400).json({
            mensaje: "Los datos del perfil no son válidos."
        });
    }

    // Permitir únicamente nombre y email.
    const permitidos = ["nombre", "email"];
    const campos = Object.keys(datos);

    if (
        campos.length === 0 ||
        campos.some(campo => !permitidos.includes(campo))
    ) {
        return res.status(400).json({
            mensaje: "Solo puedes modificar tu nombre y correo electrónico."
        });
    }

    const cambios = {};

    // Validar y normalizar el nombre.
    if (campos.includes("nombre")) {
        if (typeof datos.nombre !== "string") {
            return res.status(400).json({
                mensaje: "El nombre debe ser texto."
            });
        }

        const nombre = datos.nombre.trim();

        if (!nombre || nombre.length > 100) {
            return res.status(400).json({
                mensaje: "El nombre debe tener entre 1 y 100 caracteres."
            });
        }

        cambios.nombre = nombre;
    }

    // Validar y normalizar el correo electrónico.
    if (campos.includes("email")) {
        if (typeof datos.email !== "string") {
            return res.status(400).json({
                mensaje: "El correo debe ser texto."
            });
        }

        const email = datos.email.trim().toLowerCase();

        if (
            email.length > 150 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {
            return res.status(400).json({
                mensaje: "Ingresa un correo electrónico válido."
            });
        }

        cambios.email = email;
    }

    try {
        const usuario = await Usuario.findOneAndUpdate(
            {
                _id: req.sesion.usuarioId,
                rol: "paciente"
            },
            {
                $set: cambios
            },
            {
                new: true,
                runValidators: true
            }
        ).select("-password");

        if (!usuario || usuario.rol !== "paciente") {
            return res.status(401).json({
                mensaje: "Sesión inválida. Vuelve a iniciar sesión."
            });
        }

        return res.status(200).json({
            mensaje: "Perfil actualizado correctamente.",
            usuario
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                mensaje: "El correo electrónico ya está registrado."
            });
        }

        if (error.name === "ValidationError") {
            return res.status(400).json({
                mensaje: "Los datos del perfil no son válidos."
            });
        }

        console.error("Error al actualizar perfil:", error);

        return res.status(500).json({
            mensaje: "No se pudo actualizar el perfil."
        });
    }
});



router.post("/logout", requerirSesion, cerrarSesion);

module.exports = router;
