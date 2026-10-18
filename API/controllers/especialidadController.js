
const mongoose = require("mongoose");
const Especialidad = require("../models/Especialidad");

// Crear una nueva especialidad médica
const crearEspecialidad = async (req, res) => {
    try {
        const { nombre, descripcion } = req.body;

        // Validar que el nombre sea correcto
        if (typeof nombre !== "string" || !nombre.trim()) {
            return res.status(400).json({
                mensaje: "El nombre de la especialidad es obligatorio."
            });
        }

        // Validar la descripción, cuando se proporciona
        if (
            descripcion !== undefined &&
            typeof descripcion !== "string"
        ) {
            return res.status(400).json({
                mensaje: "La descripción debe ser texto."
            });
        }

        // Crear y guardar la especialidad en MongoDB
        const nuevaEspecialidad = await Especialidad.create({
            nombre: nombre.trim(),
            descripcion
        });

        res.status(201).json({
            mensaje: "Especialidad creada correctamente.",
            especialidad: nuevaEspecialidad
        });

    } catch (error) {

        // Evitar especialidades duplicadas
        if (error.code === 11000) {
            return res.status(400).json({
                mensaje: "Esta especialidad ya está registrada."
            });
        }

        // Errores de validación de Mongoose
        if (error.name === "ValidationError") {
            return res.status(400).json({
                mensaje: "Los datos proporcionados no son válidos.",
                error: error.message
            });
        }

        res.status(500).json({
            mensaje: "Error interno al crear la especialidad."
        });
    }
};

// Consultar todas las especialidades médicas
const obtenerEspecialidades = async (req, res) => {
    try {
        const especialidades = await Especialidad.find();

        res.status(200).json(especialidades);

    } catch (error) {
        res.status(500).json({
            mensaje: "Error interno al consultar las especialidades."
        });
    }
};

 // Consultar una especialidad médica por ID
const obtenerEspecialidadPorId = async (req, res) => {
    try {
        const id = req.params.id;

        // Validar el formato del ID
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                mensaje: "El ID proporcionado no es válido."
            });
        }

        // Buscar la especialidad en MongoDB
        const especialidad = await Especialidad.findById(id);

        if (!especialidad) {
            return res.status(404).json({
                mensaje: "Especialidad no encontrada."
            });
        }

        res.status(200).json(especialidad);

    } catch (error) {
        res.status(500).json({
            mensaje: "Error interno al consultar la especialidad."
        });
    }
};


 // Actualizar una especialidad médica
const actualizarEspecialidad = async (req, res) => {
    try {
        const id = req.params.id;

        // Validar el ID
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                mensaje: "El ID proporcionado no es válido."
            });
        }

        const { nombre, descripcion } = req.body;

        const cambios = {};

        // Validar nombre si fue proporcionado
        if (nombre !== undefined) {
            if (typeof nombre !== "string" || !nombre.trim()) {
                return res.status(400).json({
                    mensaje: "El nombre debe ser un texto válido."
                });
            }

            cambios.nombre = nombre.trim();
        }

        // Validar descripción si fue proporcionada
        if (descripcion !== undefined) {
            if (typeof descripcion !== "string") {
                return res.status(400).json({
                    mensaje: "La descripción debe ser texto."
                });
            }

            cambios.descripcion = descripcion.trim();
        }

        if (Object.keys(cambios).length === 0) {
            return res.status(400).json({
                mensaje: "Debe proporcionar datos para actualizar."
            });
        }

        const especialidadActualizada =
            await Especialidad.findByIdAndUpdate(
                id,
                { $set: cambios },
                {
                    returnDocument: "after",
                    runValidators: true
                }
            );

        if (!especialidadActualizada) {
            return res.status(404).json({
                mensaje: "Especialidad no encontrada."
            });
        }

        res.status(200).json({
            mensaje: "Especialidad actualizada correctamente.",
            especialidad: especialidadActualizada
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                mensaje: "Esta especialidad ya está registrada."
            });
        }

        if (error.name === "ValidationError") {
            return res.status(400).json({
                mensaje: "Los datos proporcionados no son válidos."
            });
        }

        res.status(500).json({
            mensaje: "Error interno al actualizar la especialidad."
        });
    }


};

 // Desactivar una especialidad médica
const desactivarEspecialidad = async (req, res) => {
    try {
        const id = req.params.id;

        // Validar el formato del ID
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                mensaje: "El ID proporcionado no es válido."
            });
        }

        // Buscar la especialidad y marcarla como inactiva
        const especialidadDesactivada =
            await Especialidad.findByIdAndUpdate(
                id,
                { $set: { activo: false } },
                {
                    returnDocument: "after",
                    runValidators: true
                }
            );

        if (!especialidadDesactivada) {
            return res.status(404).json({
                mensaje: "Especialidad no encontrada."
            });
        }

        res.status(200).json({
            mensaje: "Especialidad desactivada correctamente.",
            especialidad: especialidadDesactivada
        });

    } catch (error) {
        res.status(500).json({
            mensaje: "Error interno al desactivar la especialidad."
        });
    }
};



// Exportar ambas funciones
module.exports = {
    crearEspecialidad,
    obtenerEspecialidades,
    obtenerEspecialidadPorId,
    actualizarEspecialidad,
    desactivarEspecialidad
};
