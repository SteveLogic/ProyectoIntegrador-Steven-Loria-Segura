
const bcrypt = require("bcryptjs");
const Usuario = require("../models/Usuario");
const { cerrarSesionesDeUsuario } = require("../middleware/sesiones");
const Doctor = require("../models/Doctor");

// Crear usuario
const crearUsuario = async (req, res) => {
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
};

// Consultar usuarios
const obtenerUsuarios = async (req, res) => {
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
};


 // Consultar un usuario por su ID
const obtenerUsuarioPorId = async (req, res) => {
    try {
        const id = req.params.id;

        // Comprobar que el ID tenga un formato válido
        if (!Usuario.db.base.isValidObjectId(id)) {
            return res.status(400).json({
                mensaje: "El ID proporcionado no es válido."
            });
        }

        const usuario = await Usuario
            .findById(id)
            .select("-password");

        if (!usuario) {
            return res.status(404).json({
                mensaje: "Usuario no encontrado."
            });
        }

        res.status(200).json(usuario);

    } catch (error) {
        res.status(500).json({
            mensaje: "Error interno al consultar el usuario."
        });
    }
};


 // Actualizar los datos de un usuario
const actualizarUsuario = async (req, res) => {
    try {
        const id = req.params.id;

        // Validar el ID
        if (!Usuario.db.base.isValidObjectId(id)) {
            return res.status(400).json({
                mensaje: "El ID proporcionado no es válido."
            });
        }

        const { nombre, email } = req.body;

        // Preparar los campos que se van a actualizar
        const cambios = {};

        if (nombre !== undefined) {
            cambios.nombre = nombre;
        }

        if (email !== undefined) {
            if (typeof email !== "string") {
                return res.status(400).json({
                    mensaje: "El correo debe ser texto."
                });
            }

            cambios.email = email.trim().toLowerCase();
        }

        if (Object.keys(cambios).length === 0) {
            return res.status(400).json({
                mensaje: "Debe proporcionar datos para actualizar."
            });
        }

        // Buscar el usuario y actualizarlo en MongoDB
        const usuarioActualizado = await Usuario.findByIdAndUpdate(
            id,
            { $set: cambios },
            {
                returnDocument: "after",
                runValidators: true
            }
        ).select("-password");

        if (!usuarioActualizado) {
            return res.status(404).json({
                mensaje: "Usuario no encontrado."
            });
        }

        res.status(200).json({
            mensaje: "Usuario actualizado correctamente.",
            usuario: usuarioActualizado
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                mensaje: "El correo electrónico ya está registrado."
            });
        }

        if (error.name === "ValidationError") {
            return res.status(400).json({
                mensaje: "Los datos proporcionados no son válidos."
            });
        }

        res.status(500).json({
            mensaje: "Error interno al actualizar el usuario."
        });
    }
};


 // Eliminar usuario por ID
const eliminarUsuario = async (req, res) => {
    try {
        const id = req.params.id;

        // Validar el formato del ID
        if (!Usuario.db.base.isValidObjectId(id)) {
            return res.status(400).json({
                mensaje: "El ID proporcionado no es válido."
            });
        }

        // Buscar y eliminar el usuario
        const usuarioEliminado = await Usuario
            .findByIdAndDelete(id)
            .select("-password");

        if (!usuarioEliminado) {
            return res.status(404).json({
                mensaje: "Usuario no encontrado."
            });
        }

        res.status(200).json({
            mensaje: "Usuario eliminado correctamente.",
            usuario: usuarioEliminado
        });

    } catch (error) {
        res.status(500).json({
            mensaje: "Error interno al eliminar el usuario."
        });
    }
};

 // Activar o desactivar la cuenta de un usuario.
const cambiarEstadoUsuario = async (req, res) => {
    const id = req.params.id;

    // Validar el identificador.
    if (!Usuario.db.base.isValidObjectId(id)) {
        return res.status(400).json({
            mensaje: "El ID del usuario no es válido."
        });
    }

    // Aceptar únicamente el campo activo como booleano.
    const datos = req.body;

    if (
        !datos ||
        typeof datos !== "object" ||
        Array.isArray(datos) ||
        Object.keys(datos).length !== 1 ||
        typeof datos.activo !== "boolean"
    ) {
        return res.status(400).json({
            mensaje: "Debes proporcionar el estado activo como booleano."
        });
    }

    // Impedir que el administrador desactive su propia cuenta.
    if (
        datos.activo === false &&
        String(req.sesion.usuarioId) === id
    ) {
        return res.status(403).json({
            mensaje: "No puedes desactivar tu propia cuenta."
        });
    }

    try {
        const usuario = await Usuario.findByIdAndUpdate(
            id,
            {
                $set: {
                    activo: datos.activo
                }
            },
           {
                returnDocument: "after",
                runValidators: true
            }
        ).select("-password");

        if (!usuario) {
            return res.status(404).json({
                mensaje: "Usuario no encontrado."
            });
        }

        // Invalidar sesiones abiertas al desactivar una cuenta.
        if (datos.activo === false) {
            cerrarSesionesDeUsuario(id);
        }

        return res.status(200).json({
            mensaje: datos.activo
                ? "Cuenta activada correctamente."
                : "Cuenta desactivada correctamente.",
            usuario
        });

    } catch (error) {
        console.error("Error al cambiar estado de usuario:", error);

        return res.status(500).json({
            mensaje: "No se pudo actualizar el estado del usuario."
        });
    }
};

const cambiarRolUsuario = async (req, res) => {
    const id = req.params.id;
    const datos = req.body;

    // Validar el identificador del usuario.
    if (!Usuario.db.base.isValidObjectId(id)) {
        return res.status(400).json({
            mensaje: "El ID del usuario no es válido."
        });
    }

    // Aceptar únicamente un rol permitido.
    const rolesPermitidos = [
        "paciente",
        "doctor",
        "administrador"
    ];

    if (
        !datos ||
        typeof datos !== "object" ||
        Array.isArray(datos) ||
        Object.keys(datos).length !== 1 ||
        typeof datos.rol !== "string" ||
        !rolesPermitidos.includes(datos.rol)
    ) {
        return res.status(400).json({
            mensaje: "Debes proporcionar un rol válido."
        });
    }

    // Evitar que el administrador cambie su propio rol.
    if (String(req.sesion.usuarioId) === id) {
        return res.status(403).json({
            mensaje: "No puedes modificar tu propio rol."
        });
    }

    try {
        // Comprobar que el usuario existe.
        const usuarioActual = await Usuario.findById(id);

        if (!usuarioActual) {
            return res.status(404).json({
                mensaje: "Usuario no encontrado."
            });
        }

        // Si el usuario ya tiene ese rol, no modificar nada.
        if (usuarioActual.rol === datos.rol) {
            return res.status(200).json({
                mensaje: "El usuario ya tiene ese rol.",
                usuario: {
                    _id: usuarioActual._id,
                    nombre: usuarioActual.nombre,
                    email: usuarioActual.email,
                    rol: usuarioActual.rol,
                    activo: usuarioActual.activo !== false
                }
            });
        }

        // No desvincular un doctor con perfil profesional registrado.
        if (usuarioActual.rol === "doctor") {
            const perfilMedico = await Doctor.exists({
                usuario: id
            });

            if (perfilMedico) {
                return res.status(409).json({
                    mensaje:
                        "No puedes cambiar el rol de un doctor " +
                        "que tiene un perfil médico asociado."
                });
            }
        }

        // Actualizar el rol con las validaciones de Mongoose.
        const usuarioActualizado =
            await Usuario.findByIdAndUpdate(
                id,
                {
                    $set: {
                        rol: datos.rol
                    }
                },
                {
                    returnDocument: "after",
                    runValidators: true
                }
            ).select("-password");

        if (!usuarioActualizado) {
            return res.status(404).json({
                mensaje: "Usuario no encontrado."
            });
        }

        // Invalidar los permisos conservados en sesiones anteriores.
        cerrarSesionesDeUsuario(id);

        return res.status(200).json({
            mensaje: "Rol actualizado correctamente.",
            usuario: usuarioActualizado
        });

    } catch (error) {
        console.error("Error al cambiar rol de usuario:", error);

        if (
            error.name === "ValidationError" ||
            error.name === "CastError"
        ) {
            return res.status(400).json({
                mensaje: "El rol proporcionado no es válido."
            });
        }

        return res.status(500).json({
            mensaje: "No se pudo actualizar el rol del usuario."
        });
    }
};





// Exportar las funciones
module.exports = {
    crearUsuario,
    obtenerUsuarios,
    obtenerUsuarioPorId,
    actualizarUsuario,
    eliminarUsuario,
    cambiarEstadoUsuario,
    cambiarRolUsuario
};