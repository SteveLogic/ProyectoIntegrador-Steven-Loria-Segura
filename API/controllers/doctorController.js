
const mongoose = require("mongoose");

const Doctor = require("../models/Doctor");
const Usuario = require("../models/Usuario");
const Especialidad = require("../models/Especialidad");

// KAN-85: validación de los datos recibidos por la API (no depender solo del HTML).
const CAMPOS_REGISTRO = new Set(["usuario", "especialidad", "numeroColegiado", "telefono"]);
const CAMPOS_EDICION = new Set(["especialidad", "numeroColegiado", "telefono"]);
const CAMPOS_ESPECIALIDAD = new Set(["especialidad"]);

function validarCuerpoDoctor(cuerpo, permitidos) {
  if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo)) {
    return "Debes proporcionar un objeto con los datos del doctor.";
  }
  const noPermitidos = Object.keys(cuerpo).filter(campo => !permitidos.has(campo));
  if (noPermitidos.length) {
    return `El campo ${noPermitidos[0]} no se puede modificar desde este formulario.`;
  }
  return null;
}

function validarNumeroColegiado(valor) {
  if (typeof valor !== "string" || !valor.trim()) {
    return "El número de colegiado es obligatorio.";
  }
  const texto = valor.trim();
  if (texto.length < 3 || texto.length > 80) {
    return "El número de colegiado debe tener entre 3 y 80 caracteres.";
  }
  if (!/^[\p{L}\p{N}][\p{L}\p{N} .\/-]*$/u.test(texto)) {
    return "El número de colegiado solo admite letras, números, espacios, puntos, barras y guiones.";
  }
  return null;
}

function validarTelefono(valor) {
  if (typeof valor !== "string") {
    return "El teléfono debe ser un texto.";
  }
  const telefono = valor.trim();
  if (telefono.length > 30) {
    return "El teléfono no puede superar los 30 caracteres.";
  }
  if (telefono) {
    const digitos = telefono.replace(/\D/g, "").length;
    if (!/^[+()0-9 .-]+$/.test(telefono) || digitos < 7 || digitos > 15 ||
        (telefono.match(/\+/g) || []).length > 1 ||
        (telefono.includes("+") && !telefono.startsWith("+"))) {
      return "El teléfono debe tener entre 7 y 15 dígitos y usar un formato válido, por ejemplo 8888-3333 o +506 8888-3333.";
    }
  }
  return null;
}

// Registrar un nuevo perfil médico
exports.crearDoctor = async (req, res) => {
  try {
    const errorCuerpo = validarCuerpoDoctor(req.body, CAMPOS_REGISTRO);
    if (errorCuerpo) return res.status(400).json({ mensaje: errorCuerpo });

    const { usuario, especialidad, numeroColegiado, telefono = "" } = req.body;
    if (typeof usuario !== "string" || !usuario.trim()) {
      return res.status(400).json({ mensaje: "Selecciona un usuario con rol doctor." });
    }
    if (typeof especialidad !== "string" || !especialidad.trim()) {
      return res.status(400).json({ mensaje: "Selecciona una especialidad médica." });
    }
    if (!mongoose.isValidObjectId(usuario) || !mongoose.isValidObjectId(especialidad)) {
      return res.status(400).json({ mensaje: "El ID del usuario o de la especialidad no es válido." });
    }
    const errorColegiado = validarNumeroColegiado(numeroColegiado);
    if (errorColegiado) return res.status(400).json({ mensaje: errorColegiado });
    const errorTelefono = validarTelefono(telefono);
    if (errorTelefono) return res.status(400).json({ mensaje: errorTelefono });

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
      telefono: telefono.trim()
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

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ mensaje: "Los datos del doctor no son válidos." });
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
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ mensaje: "El ID proporcionado no es válido." });
    }
    const errorCuerpo = validarCuerpoDoctor(req.body, CAMPOS_EDICION);
    if (errorCuerpo) return res.status(400).json({ mensaje: errorCuerpo });

    const { especialidad, numeroColegiado, telefono } = req.body;
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
      const errorColegiado = validarNumeroColegiado(numeroColegiado);
      if (errorColegiado) return res.status(400).json({ mensaje: errorColegiado });
      cambios.numeroColegiado = numeroColegiado.trim();
    }

    // Actualizar el teléfono, si se proporciona
    if (telefono !== undefined) {
      const errorTelefono = validarTelefono(telefono);
      if (errorTelefono) return res.status(400).json({ mensaje: errorTelefono });
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

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ mensaje: "Los datos del doctor no son válidos." });
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


/**
 * Activar/desactivar un perfil médico, sin eliminar citas ni cambiar Usuario.activo.
 * PATCH /api/doctores/:id/estado  { activo: boolean }
 * Solo lo puede invocar un administrador (validación de rol en la ruta).
 */
exports.cambiarEstadoDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const cuerpo = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ mensaje: "El ID del perfil médico no es válido." });
    }

    if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo) ||
        Object.keys(cuerpo).length !== 1 || typeof cuerpo.activo !== "boolean") {
      return res.status(400).json({ mensaje: "Envía únicamente el campo activo con valor true o false." });
    }

    const { activo } = cuerpo;
    const perfil = await Doctor.findById(id);
    if (!perfil) {
      return res.status(404).json({ mensaje: "Perfil médico no encontrado." });
    }
    if (perfil.activo === activo) {
      return res.status(409).json({
        mensaje: activo ? "El perfil médico ya está activo." : "El perfil médico ya está inactivo."
      });
    }

    // No reactivar perfiles si su usuario o especialidad no pueden operar.
    if (activo) {
      const usuario = await Usuario.findById(perfil.usuario);
      if (!usuario || usuario.rol !== "doctor" || usuario.activo === false) {
        return res.status(409).json({
          mensaje: "No se puede activar: la cuenta debe existir, estar activa y tener rol doctor."
        });
      }
      const especialidad = await Especialidad.findById(perfil.especialidad);
      if (!especialidad || especialidad.activo !== true) {
        return res.status(409).json({
          mensaje: "No se puede activar: la especialidad debe estar activa."
        });
      }
    }

    // Actualización condicional: evita que dos solicitudes opuestas
    // reescriban el estado a partir de una lectura desactualizada.
    const doctor = await Doctor.findOneAndUpdate(
      { _id: id, activo: !activo },
      { $set: { activo } },
      { new: true, runValidators: true }
    );

    if (!doctor) {
      return res.status(409).json({
        mensaje: "El estado del perfil cambió durante la operación. Actualiza la tabla."
      });
    }

    const doctorPoblado = await Doctor.populate(doctor, [
      { path: "usuario", select: "nombre email rol activo" },
      { path: "especialidad", select: "nombre descripcion activo" }
    ]);

    return res.status(200).json({
      mensaje: `Perfil médico ${activo ? "activado" : "desactivado"} correctamente. Las citas existentes se conservan.`,
      doctor: doctorPoblado
    });
  } catch (error) {
    console.error("Error al cambiar estado del perfil médico:", error);
    return res.status(500).json({ mensaje: "Error interno al modificar el estado del perfil médico." });
  }
};


/**
 * Asignar o cambiar la especialidad de un doctor.
 * PUT /api/doctores/:id/especialidad
 */
exports.asignarEspecialidadDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const errorCuerpo = validarCuerpoDoctor(req.body, CAMPOS_ESPECIALIDAD);
    if (errorCuerpo) return res.status(400).json({ mensaje: errorCuerpo });
    const { especialidad } = req.body;

    // Validar el identificador del doctor.
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        mensaje: "El ID proporcionado no es válido."
      });
    }

    // Verificar que se haya enviado una especialidad.
    if (typeof especialidad !== "string" || !especialidad.trim()) {
      return res.status(400).json({ mensaje: "La especialidad es obligatoria." });
    }

    // Validar el identificador de la especialidad.
    if (!mongoose.isValidObjectId(especialidad)) {
      return res.status(400).json({
        mensaje: "El ID de la especialidad no es válido."
      });
    }

    // Buscar el perfil médico.
    const doctor = await Doctor.findById(id);

    if (!doctor) {
      return res.status(404).json({
        mensaje: "Doctor no encontrado."
      });
    }

    // Comprobar que la especialidad exista.
    const especialidadEncontrada =
      await Especialidad.findById(especialidad);

    if (!especialidadEncontrada) {
      return res.status(404).json({
        mensaje: "Especialidad no encontrada."
      });
    }

    // No permitir asignaciones a especialidades inactivas.
    if (!especialidadEncontrada.activo) {
      return res.status(400).json({
        mensaje: "La especialidad debe estar activa."
      });
    }

    // Actualizar la asignación y guardar.
    doctor.especialidad = especialidadEncontrada._id;
    await doctor.save();

    // Incluir los datos relacionados en la respuesta.
    await doctor.populate("usuario", "nombre email rol");
    await doctor.populate(
      "especialidad",
      "nombre descripcion activo"
    );

    return res.status(200).json({
      mensaje: "Especialidad asignada correctamente.",
      doctor
    });

  } catch (error) {
    console.error("Error al asignar especialidad:", error);

    return res.status(500).json({
      mensaje: "Error interno al asignar la especialidad."
    });
  }
};

