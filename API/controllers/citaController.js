
const mongoose = require("mongoose");
const Cita = require("../models/Cita");
const Usuario = require("../models/Usuario");
const Especialidad = require("../models/Especialidad");
const Doctor = require("../models/Doctor");
const {evaluarHorario} = require("../utils/horarios");
const { registrarNotificacionCita } = require("../utils/notificaciones");

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

        // Comprobar permisos para registrar citas.
        const { usuarioId, rol } = req.sesion;

        if (rol !== "paciente" && rol !== "administrador") {
            return res.status(403).json({
                mensaje: "No tienes permiso para registrar citas."
            });
        }

        // Un paciente solamente puede reservar citas para sí mismo.
        if (rol === "paciente" && String(paciente) !== usuarioId) {
            return res.status(403).json({
                mensaje: "No puedes registrar citas para otro paciente."
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

        // Exigir franja semanal válida y bloquear citas solapadas de 30 minutos.
        const verificacion = await evaluarHorario({doctor,fecha,hora});
        if (!verificacion.valido) {
            return res.status(verificacion.codigo).json({mensaje:verificacion.mensaje});
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
        // Notificar al paciente después de guardar la cita.
        await registrarNotificacionCita(nuevaCita, "reserva");

        res.status(201).json({
            mensaje: "Cita médica registrada correctamente.",
            cita: nuevaCita
        });

    } catch (error) {
        if (error.code === 11000) {
             return res.status(409).json({
             mensaje: "El doctor ya tiene una cita en ese horario."
            });
        }

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
        const { usuarioId, rol } = req.sesion;

        const filtro = {};

        if (rol === "paciente") {
            filtro.paciente = usuarioId;
        } else if (rol === "doctor") {
            filtro.doctor = usuarioId;
        } else if (rol !== "administrador") {
            return res.status(403).json({
                mensaje: "No tienes permiso para consultar las citas."
            });
        }

        const citas = await Cita.find(filtro)
            .populate("paciente", "nombre email rol")
            .populate("doctor", "nombre email rol")
            .populate("especialidad", "nombre descripcion activo");

        return res.status(200).json(citas);

    } catch (error) {
        console.error("Error al consultar citas:", error);

        return res.status(500).json({
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

        const { usuarioId, rol } = req.sesion;

        const esPacientePropietario =
            rol === "paciente" &&
            String(cita.paciente?._id) === usuarioId;

        const esDoctorAsignado =
            rol === "doctor" &&
            String(cita.doctor?._id) === usuarioId;

        const esAdministrador = rol === "administrador";

        if (!esPacientePropietario && !esDoctorAsignado && !esAdministrador) {
            return res.status(403).json({
                mensaje: "No tienes permiso para consultar esta cita."
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

        // Verificar autorización antes de modificar la cita.
        const { usuarioId, rol } = req.sesion;

        const esPacientePropietario =
            rol === "paciente" &&
            String(cita.paciente) === usuarioId;

        const esAdministrador = rol === "administrador";

        if (!esPacientePropietario && !esAdministrador) {
            return res.status(403).json({
                mensaje: "No tienes permiso para reprogramar esta cita."
            });
        }


        // No permitir reprogramar citas cerradas
        if (["cancelada", "completada"].includes(cita.estado)) {
            return res.status(409).json({
                mensaje: "No se puede reprogramar una cita cancelada o completada."
            });
        }

        // Evitar reprogramaciones repetidas con la misma fecha y hora.
        // Si no hubo cambios, no se genera una nueva notificación.
        if (cita.fecha === fecha && cita.hora === hora) {
            return res.status(200).json({
                mensaje: "La cita ya está programada para esta fecha y hora.",
                cita
            });
        }


        // Reprogramar solo dentro de una franja y sin solaparse con otras citas.
        const verificacion = await evaluarHorario({doctor:cita.doctor,fecha,hora,excluirCita:cita._id});
        if (!verificacion.valido) {
            return res.status(verificacion.codigo).json({mensaje:verificacion.mensaje});
        }


        // Actualización condicional para evitar operaciones simultáneas.
        // Solo se modifica si la cita conserva la fecha y hora originales.
        const citaActualizada = await Cita.findOneAndUpdate(
            {
                _id: id,
                fecha: cita.fecha,
                hora: cita.hora,
                estado: { $in: ["pendiente", "confirmada"] }
            },
            {
                $set: { fecha, hora }
            },
            {
                returnDocument: "after",
                runValidators: true
            }
        );

        // Otra solicitud pudo modificar la cita antes que esta.
        if (!citaActualizada) {
            const citaActual = await Cita.findById(id);

            if (!citaActual) {
                return res.status(404).json({
                    mensaje: "Cita médica no encontrada."
                });
            }

            // Si otra solicitud ya aplicó exactamente el mismo cambio,
            // responder sin generar una notificación duplicada.
            if (
                citaActual.fecha === fecha &&
                citaActual.hora === hora &&
                !["cancelada", "completada"].includes(citaActual.estado)
            ) {
                return res.status(200).json({
                    mensaje: "La cita ya está programada para esta fecha y hora.",
                    cita: citaActual
                });
            }

            return res.status(409).json({
                mensaje: "La cita fue modificada por otra operación. Actualiza la información e inténtalo nuevamente."
            });
        }

        // Solo la solicitud que realizó el cambio genera la notificación.
        await registrarNotificacionCita(
            citaActualizada,
            "reprogramacion"
        );

        return res.status(200).json({
            mensaje: "Cita médica reprogramada correctamente.",
            cita: citaActualizada
        });



    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                mensaje: "El doctor ya tiene una cita en ese horario."
            });
        }
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

        // Verificar autorización antes de cancelar la cita.
        const { usuarioId, rol } = req.sesion;

        const esPacientePropietario =
            rol === "paciente" &&
            String(cita.paciente) === usuarioId;

        const esAdministrador = rol === "administrador";

        if (!esPacientePropietario && !esAdministrador) {
            return res.status(403).json({
                mensaje: "No tienes permiso para cancelar esta cita."
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


        // Cancelar de forma atómica para evitar operaciones simultáneas.
        // Solo una solicitud puede cambiar la cita a "cancelada".
        const citaCancelada = await Cita.findOneAndUpdate(
            {
                _id: cita._id,
                estado: { $in: ["pendiente", "confirmada"] }
            },
            {
                $set: { estado: "cancelada" }
            },
            {
                returnDocument: "after",
                runValidators: true
            }
        );

        // Otra solicitud pudo cancelar o completar la cita primero.
        if (!citaCancelada) {
            return res.status(409).json({
                mensaje: "La cita ya fue cancelada o completada por otra operación."
            });
        }

        // Solamente quien realizó la cancelación genera la notificación.
        await registrarNotificacionCita(
            citaCancelada,
            "cancelacion"
        );

        return res.status(200).json({
            mensaje: "Cita médica cancelada correctamente.",
            cita: citaCancelada
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
