
const mongoose = require("mongoose");

const Doctor = require("../models/Doctor");
const Usuario = require("../models/Usuario");
const Especialidad = require("../models/Especialidad");

// Registrar un nuevo perfil médico
exports.crearDoctor = async (req, res) => {
  try {
    const { usuario, especialidad, numeroColegiado, telefono } = req.body;

    // Validar campos obligatorios
    if (!usuario || !especialidad ||
        typeof numeroColegiado !== "string" ||
        !numeroColegiado.trim()) {
      return res.status(400).json({
        mensaje: "Usuario, especialidad y número de colegiado son obligatorios."
      });
    }

    // Validar identificadores de MongoDB
    if (!mongoose.isValidObjectId(usuario) ||
        !mongoose.isValidObjectId(especialidad)) {
      return res.status(400).json({
        mensaje: "El ID del usuario o de la especialidad no es válido."
      });
    }

    // Comprobar que el usuario existe y tiene rol doctor
    const usuarioEncontrado = await Usuario.findById(usuario);

    if (!usuarioEncontrado || usuarioEncontrado.rol !== "doctor") {
      return res.status(400).json({
        mensaje: "El usuario debe existir y tener el rol de doctor."
      });
    }

    // Comprobar que la especialidad está disponible
    const especialidadEncontrada = await Especialidad.findById(especialidad);

    if (!especialidadEncontrada || !especialidadEncontrada.activo) {
      return res.status(400).json({
        mensaje: "La especialidad no existe o está inactiva."
      });
    }

    // Crear el perfil médico
    const nuevoDoctor = await Doctor.create({
      usuario,
      especialidad,
      numeroColegiado: numeroColegiado.trim(),
      telefono: telefono || ""
    });

    const doctorRegistrado = await Doctor.findById(nuevoDoctor._id)
      .populate("usuario", "nombre email rol")
      .populate("especialidad", "nombre descripcion activo");

    return res.status(201).json({
      mensaje: "Doctor registrado correctamente.",
      doctor: doctorRegistrado
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        mensaje: "El usuario o número de colegiado ya tiene un perfil registrado."
      });
    }

    console.error(error);

    return res.status(500).json({
      mensaje: "Error interno al registrar el doctor."
    });
  }
};

// Listar todos los perfiles médicos
exports.listarDoctores = async (req, res) => {
  try {
    const doctores = await Doctor.find()
      .populate("usuario", "nombre email rol")
      .populate("especialidad", "nombre descripcion activo");

    return res.status(200).json(doctores);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      mensaje: "Error al consultar los doctores."
    });
  }
};

// Consultar un perfil médico por ID
exports.obtenerDoctorPorId = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        mensaje: "El ID proporcionado no es válido."
      });
    }

    const doctor = await Doctor.findById(id)
      .populate("usuario", "nombre email rol")
      .populate("especialidad", "nombre descripcion activo");

    if (!doctor) {
      return res.status(404).json({
        mensaje: "Doctor no encontrado."
      });
    }

    return res.status(200).json(doctor);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      mensaje: "Error interno al consultar el doctor."
    });
  }
};

 // Actualizar la información profesional de un doctor
exports.actualizarDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const { especialidad, numeroColegiado, telefono } = req.body;

    // Validar el identificador
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        mensaje: "El ID proporcionado no es válido."
      });
    }

    const cambios = {};

    // Validar una nueva especialidad, si se proporciona
    if (especialidad !== undefined) {
      if (!mongoose.isValidObjectId(especialidad)) {
        return res.status(400).json({
          mensaje: "El ID de la especialidad no es válido."
        });
      }

      const especialidadEncontrada =
        await Especialidad.findById(especialidad);

      if (!especialidadEncontrada || !especialidadEncontrada.activo) {
        return res.status(400).json({
          mensaje: "La especialidad no existe o está inactiva."
        });
      }

      cambios.especialidad = especialidad;
    }

    // Validar el número de colegiado
    if (numeroColegiado !== undefined) {
      if (typeof numeroColegiado !== "string" ||
          !numeroColegiado.trim()) {
        return res.status(400).json({
          mensaje: "El número de colegiado no es válido."
        });
      }

      cambios.numeroColegiado = numeroColegiado.trim();
    }

    // Actualizar el teléfono, si se proporciona
    if (telefono !== undefined) {
      if (typeof telefono !== "string") {
        return res.status(400).json({
          mensaje: "El teléfono debe ser un texto."
        });
      }

      cambios.telefono = telefono.trim();
    }

    if (Object.keys(cambios).length === 0) {
      return res.status(400).json({
        mensaje: "Debe proporcionar al menos un campo para actualizar."
      });
    }

    const doctorActualizado = await Doctor.findByIdAndUpdate(
      id,
      { $set: cambios },
      { returnDocument: "after", runValidators: true }
    )
      .populate("usuario", "nombre email rol")
      .populate("especialidad", "nombre descripcion activo");

    if (!doctorActualizado) {
      return res.status(404).json({
        mensaje: "Doctor no encontrado."
      });
    }

    return res.status(200).json({
      mensaje: "Doctor actualizado correctamente.",
      doctor: doctorActualizado
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        mensaje: "El número de colegiado ya está registrado."
      });
    }

    console.error(error);

    return res.status(500).json({
      mensaje: "Error interno al actualizar el doctor."
    });
  }
};

 // Desactivar un perfil médico sin eliminarlo de MongoDB
exports.desactivarDoctor = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        mensaje: "El ID proporcionado no es válido."
      });
    }

    const doctor = await Doctor.findById(id);

    if (!doctor) {
      return res.status(404).json({
        mensaje: "Doctor no encontrado."
      });
    }

    if (!doctor.activo) {
      return res.status(409).json({
        mensaje: "El doctor ya se encuentra desactivado."
      });
    }

    doctor.activo = false;
    await doctor.save();

    const doctorDesactivado = await Doctor.findById(id)
      .populate("usuario", "nombre email rol")
      .populate("especialidad", "nombre descripcion activo");

    return res.status(200).json({
      mensaje: "Doctor desactivado correctamente.",
      doctor: doctorDesactivado
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      mensaje: "Error interno al desactivar el doctor."
    });
  }
};
