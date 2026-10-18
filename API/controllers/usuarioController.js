
const bcrypt = require("bcryptjs");
const Usuario = require("../models/Usuario");

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



// Exportar las funciones
module.exports = {
    crearUsuario,
    obtenerUsuarios,
    obtenerUsuarioPorId,
    actualizarUsuario,
    eliminarUsuario
};