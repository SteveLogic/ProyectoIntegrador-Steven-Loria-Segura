const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");
const { enviarRecuperacion } = require("../utils/emailRecuperacion");
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
        // Impedir el acceso a cuentas desactivadas.
        if (usuario.activo === false) {
            return res.status(403).json({
                mensaje: "La cuenta está desactivada. Contacta con un administrador."
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


// Recuperación por correo: el enlace es de un solo uso, expira en 20 minutos.
// Respuesta uniforme para evitar revelar si una dirección está registrada.
const DURACION_RESET_MS = 20 * 60 * 1000;
const MENSAJE_RESET = "Si el correo corresponde a una cuenta activa, recibirás instrucciones para recuperar tu contraseña.";
const intentosReset = new Map();
const VENTANA_RESET_MS = 15 * 60 * 1000;
const MAX_INTENTOS_RESET = 5;

function limitarSolicitudReset(req, email) {
    const ahora = Date.now();
    if (intentosReset.size > 3000) {
        for (const [clave, datos] of intentosReset) {
            if (datos.vence <= ahora) intentosReset.delete(clave);
        }
    }
    // Dos límites independientes, por IP y por correo, en el proceso actual.
    const claves = [
        `ip:${crypto.createHash("sha256").update(req.ip || "desconocida").digest("hex")}`,
        `correo:${crypto.createHash("sha256").update(email).digest("hex")}`
    ];
    const registros = claves.map(clave => ({
        clave,
        actual: intentosReset.get(clave)
    }));
    if (registros.some(({actual}) => actual && actual.vence > ahora && actual.intentos >= MAX_INTENTOS_RESET)) {
        return true;
    }
    for (const {clave, actual} of registros) {
        if (!actual || actual.vence <= ahora) {
            intentosReset.set(clave, { intentos: 1, vence: ahora + VENTANA_RESET_MS });
        } else {
            actual.intentos += 1;
        }
    }
    return false;
}

function passwordSegura(password) {
    return typeof password === "string" && password.length >= 8 &&
        Buffer.byteLength(password, "utf8") <= 72 &&
        /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password);
}

router.post("/verificar-correo", async (req, res) => {
    const email = req.body?.email;
    if (typeof email !== "string" || email.trim().length > 150 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return res.status(400).json({ mensaje: "Ingresa un correo electrónico válido." });
    }
    if (!process.env.RESEND_API_KEY || !process.env.RESET_EMAIL_FROM || !process.env.APP_PUBLIC_URL) {
        return res.status(503).json({ mensaje: "La recuperación de contraseña no está configurada todavía." });
    }
    const normalizado = email.trim().toLowerCase();
    if (limitarSolicitudReset(req, normalizado)) {
        return res.status(429).json({ mensaje: "Demasiadas solicitudes. Inténtalo nuevamente más tarde." });
    }
    try {
        const usuario = await Usuario.findOne({ email: normalizado });
        if (usuario && usuario.activo !== false) {
            const token = crypto.randomBytes(32).toString("hex");
            const hash = crypto.createHash("sha256").update(token).digest("hex");
            const vence = new Date(Date.now() + DURACION_RESET_MS);
            await Usuario.updateOne(
                { _id: usuario._id, activo: { $ne: false } },
                { $set: { resetTokenHash: hash, resetTokenExpira: vence } }
            );
            try {
                await enviarRecuperacion({ email: normalizado, token });
            } catch (error) {
                // Evitar dejar un enlace activo que no fue enviado.
                await Usuario.updateOne({ _id: usuario._id, resetTokenHash: hash },
                    { $unset: { resetTokenHash: "", resetTokenExpira: "" } });
                console.error("No se pudo enviar el correo de recuperación:", error.message);
                return res.status(200).json({ mensaje: MENSAJE_RESET });
            }
        }
        return res.status(200).json({ mensaje: MENSAJE_RESET });
    } catch (error) {
        console.error("Error en recuperación de contraseña:", error.message);
        return res.status(503).json({ mensaje: "El servicio de recuperación no está disponible temporalmente." });
    }
});

// No se acepta el correo como prueba de identidad: únicamente el token secreto.
router.put("/restablecer-password", async (req, res) => {
    const token = req.body?.token;
    const nuevaPassword = req.body?.nuevaPassword;
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
        return res.status(400).json({ mensaje: "El enlace de recuperación no es válido o ya expiró." });
    }
    if (!passwordSegura(nuevaPassword)) {
        return res.status(400).json({ mensaje: "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número, y no superar 72 bytes." });
    }
    try {
        const hash = crypto.createHash("sha256").update(token).digest("hex");
        // Consultar el usuario antes de gastar bcrypt en un token inexistente.
        const usuario = await Usuario.findOne({
            resetTokenHash: hash,
            resetTokenExpira: { $gt: new Date() },
            activo: { $ne: false }
        });
        if (!usuario) {
            return res.status(400).json({ mensaje: "El enlace de recuperación no es válido o ya expiró." });
        }
        if (await bcrypt.compare(nuevaPassword, usuario.password)) {
            return res.status(400).json({ mensaje: "Elige una contraseña diferente a la anterior." });
        }
        const password = await bcrypt.hash(nuevaPassword, 10);
        // Actualización atómica: gana una sola solicitud, y el token se consume.
        const actualizado = await Usuario.findOneAndUpdate({
            _id: usuario._id,
            resetTokenHash: hash,
            resetTokenExpira: { $gt: new Date() },
            activo: { $ne: false }
        }, {
            $set: { password },
            $unset: { resetTokenHash: "", resetTokenExpira: "" }
        }, { new: true, runValidators: true });
        if (!actualizado) {
            return res.status(400).json({ mensaje: "El enlace de recuperación no es válido o ya expiró." });
        }
        cerrarSesionesDeUsuario(usuario._id);
        return res.status(200).json({ mensaje: "Contraseña actualizada. Inicia sesión con la nueva contraseña." });
    } catch (error) {
        console.error("Error al restablecer contraseña:", error.message);
        return res.status(500).json({ mensaje: "No se pudo restablecer la contraseña." });
    }
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
                returnDocument: "after",
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
