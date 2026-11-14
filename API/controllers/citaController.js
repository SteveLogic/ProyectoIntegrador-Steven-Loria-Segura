
const mongoose = require("mongoose");
const Cita = require("../models/Cita");
const Usuario = require("../models/Usuario");
const Especialidad = require("../models/Especialidad");
const Doctor = require("../models/Doctor");

// Fecha/hora local de Costa Rica (UTC-6); validar formato, día real y futuro.
function horarioValido(fecha, hora) {
    if (typeof fecha !== "string" || typeof hora !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) return false;
    const [y, m, d] = fecha.split("-").map(Number);
    const diaUTC = new Date(Date.UTC(y, m - 1, d));
    if (diaUTC.getUTCFullYear() !== y || diaUTC.getUTCMonth() !== m - 1 || diaUTC.getUTCDate() !== d) return false;
    const fechaLocal = new Date(`${fecha}T${hora}:00-06:00`);
    return !Number.isNaN(fechaLocal.getTime()) && fechaLocal.getTime() > Date.now();
}

// Crear una nueva cita médica
const crearCita = async (req, res) => {
    try {
        const {
            paciente,
            doctor,
            especialidad,
            fecha,
            hora,
            motivo
        } = req.body;

        // Verificar campos obligatorios
        if (!paciente || !doctor || !especialidad || !fecha || !hora) {
            return res.status(400).json({
                mensaje: "Todos los campos obligatorios deben completarse."
            });
        }

        // Validar los identificadores de MongoDB
        if (![paciente, doctor, especialidad].every(
            id => mongoose.isValidObjectId(id)
        )) {
            return res.status(400).json({
                mensaje: "Uno o más identificadores no son válidos."
            });
        }

        // Rechazar horarios con formato inválido o en el pasado.
        if (!horarioValido(fecha, hora)) {
            return res.status(400).json({
                mensaje: "La fecha y hora deben ser válidas y futuras (hora de Costa Rica)."
            });
        }

        // Comprobar que el paciente existe y tiene el rol correcto
        const pacienteEncontrado = await Usuario.findById(paciente);

        if (!pacienteEncontrado || pacienteEncontrado.rol !== "paciente") {
            return res.status(400).json({
                mensaje: "El paciente no existe o su rol no es válido."
            });
        }

        // Comprobar que el doctor existe y tiene el rol correcto
        const doctorEncontrado = await Usuario.findById(doctor);

        if (!doctorEncontrado || doctorEncontrado.rol !== "doctor") {
            return res.status(400).json({
                mensaje: "El doctor no existe o su rol no es válido."
            });
        }

        // Comprobar que la especialidad está activa
        const especialidadEncontrada =
            await Especialidad.findById(especialidad);

        if (!especialidadEncontrada || !especialidadEncontrada.activo) {
            return res.status(400).json({
                mensaje: "La especialidad no existe o está inactiva."
            });
        }

        // La cita debe corresponder al perfil médico activo y su especialidad.
        const perfilMedico = await Doctor.findOne({ usuario: doctor, activo: true });
        if (!perfilMedico || String(perfilMedico.especialidad) !== String(especialidad)) {
            return res.status(400).json({
                mensaje: "El doctor no está activo o no pertenece a la especialidad indicada."
            });
        }

        // Verificar que el doctor no tenga una cita en ese horario
        const citaExistente = await Cita.exists({
            doctor,
            fecha,
            hora,
            estado: { $ne: "cancelada" }
        });

        if (citaExistente) {
            return res.status(409).json({
                mensaje: "El doctor ya tiene una cita en ese horario."
            });
        }

        // Registrar la cita en MongoDB
        const nuevaCita = await Cita.create({
            paciente,
            doctor,
            especialidad,
            fecha,
            hora,
            motivo
        });

        res.status(201).json({
            mensaje: "Cita médica registrada correctamente.",
            cita: nuevaCita
        });

    } catch (error) {
        if (error.name === "ValidationError") {
            return res.status(400).json({
                mensaje: "Los datos de la cita no son válidos.",
                error: error.message
            });
        }

        res.status(500).json({
            mensaje: "Error interno al registrar la cita."
        });
    }
};


 // Consultar todas las citas médicas
const obtenerCitas = async (req, res) => {
    try {
        const citas = await Cita.find()
            .populate("paciente", "nombre email rol")
            .populate("doctor", "nombre email rol")
            .populate("especialidad", "nombre descripcion activo");

        res.status(200).json(citas);

    } catch (error) {
        res.status(500).json({
            mensaje: "Error interno al consultar las citas."
        });
    }
};


 // Consultar una cita médica por ID
const obtenerCitaPorId = async (req, res) => {
    try {
        const id = req.params.id;

        // Validar el formato del ID
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                mensaje: "El ID proporcionado no es válido."
            });
        }

        // Buscar la cita y consultar sus relaciones
        const cita = await Cita.findById(id)
            .populate("paciente", "nombre email rol")
            .populate("doctor", "nombre email rol")
            .populate("especialidad", "nombre descripcion activo");

        if (!cita) {
            return res.status(404).json({
                mensaje: "Cita médica no encontrada."
            });
        }

        res.status(200).json(cita);

    } catch (error) {
        res.status(500).json({
            mensaje: "Error interno al consultar la cita."
        });
    }
};


 // Reprogramar una cita médica
const reprogramarCita = async (req, res) => {
    try {
        const id = req.params.id;
        const { fecha, hora } = req.body;

        // Validar el identificador
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                mensaje: "El ID proporcionado no es válido."
            });
        }

        // Validar los campos obligatorios
        if (typeof fecha !== "string" ||
            typeof hora !== "string" ||
            !fecha || !hora) {
            return res.status(400).json({
                mensaje: "La fecha y la hora son obligatorias."
            });
        }

        if (!horarioValido(fecha, hora)) {
            return res.status(400).json({
                mensaje: "La nueva fecha y hora deben ser válidas y futuras (hora de Costa Rica)."
            });
        }

        // Buscar la cita original
        const cita = await Cita.findById(id);

        if (!cita) {
            return res.status(404).json({
                mensaje: "Cita médica no encontrada."
            });
        }

        // No permitir reprogramar citas cerradas
        if (["cancelada", "completada"].includes(cita.estado)) {
            return res.status(409).json({
                mensaje: "No se puede reprogramar una cita cancelada o completada."
            });
        }

        // Comprobar conflictos de horario con otras citas
        const conflicto = await Cita.exists({
            _id: { $ne: cita._id },
            doctor: cita.doctor,
            fecha,
            hora,
            estado: { $ne: "cancelada" }
        });

        if (conflicto) {
            return res.status(409).json({
                mensaje: "El doctor ya tiene una cita en ese horario."
            });
        }

        // Guardar la nueva fecha y hora
        const citaActualizada = await Cita.findByIdAndUpdate(
            id,
            { $set: { fecha, hora } },
            {
                returnDocument: "after",
                runValidators: true
            }
        );

        res.status(200).json({
            mensaje: "Cita médica reprogramada correctamente.",
            cita: citaActualizada
        });

    } catch (error) {
        if (error.name === "ValidationError") {
            return res.status(400).json({
                mensaje: "La fecha o la hora no tienen un formato válido."
            });
        }

        res.status(500).json({
            mensaje: "Error interno al reprogramar la cita."
        });
    }
};


 // Cancelar una cita médica (eliminación lógica)
const cancelarCita = async (req, res) => {
    try {
        const id = req.params.id;

        // Validar el identificador
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                mensaje: "El ID proporcionado no es válido."
            });
        }

        // Buscar la cita en MongoDB
        const cita = await Cita.findById(id);

        if (!cita) {
            return res.status(404).json({
                mensaje: "Cita médica no encontrada."
            });
        }

        // Evitar cancelar una cita que ya fue cancelada
        if (cita.estado === "cancelada") {
            return res.status(409).json({
                mensaje: "La cita ya se encuentra cancelada."
            });
        }

        // Evitar cancelar una cita completada
        if (cita.estado === "completada") {
            return res.status(409).json({
                mensaje: "No se puede cancelar una cita completada."
            });
        }

        // Cambiar el estado sin eliminar el documento
        cita.estado = "cancelada";

        await cita.save();

        res.status(200).json({
            mensaje: "Cita médica cancelada correctamente.",
            cita
        });

    } catch (error) {
        res.status(500).json({
            mensaje: "Error interno al cancelar la cita."
        });
    }
};





module.exports = {
    crearCita,
    obtenerCitas,
    obtenerCitaPorId,
    reprogramarCita,
    cancelarCita
};
