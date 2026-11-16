const mongoose = require('mongoose');
const Disponibilidad = require('../models/Disponibilidad');
const Doctor = require('../models/Doctor');
const {intervaloValido, minutos, solapan, fechaCorrecta, listarSlots} = require('../utils/horarios');

const idValido = value => typeof value === 'string' && mongoose.isValidObjectId(value);
const errorServidor = res => res.status(500).json({mensaje:'Error al consultar o modificar la disponibilidad.'});

async function listar(req,res) {
  try {
    const doctor = req.query.doctor;
    if (!idValido(doctor)) return res.status(400).json({mensaje:'Debe indicar un doctor válido.'});
    const franjas = await Disponibilidad.find({doctor}).sort({diaSemana:1,horaInicio:1}).lean();
    return res.json(franjas);
  } catch(e) {console.error(e);return errorServidor(res);}
}
async function crear(req,res) {
  try {
    const {doctor,diaSemana,horaInicio,horaFin}=req.body;
    if (!idValido(doctor) || !Number.isInteger(diaSemana) || diaSemana<0 || diaSemana>6 || !intervaloValido(horaInicio,horaFin)) {
      return res.status(400).json({mensaje:'Indica doctor, día y horas válidas, alineadas a intervalos de 30 minutos.'});
    }
    const perfil = await Doctor.findOne({usuario:doctor,activo:true});
    if (!perfil) return res.status(400).json({mensaje:'Se requiere un doctor con perfil activo.'});
    const existentes=await Disponibilidad.find({doctor,diaSemana}).lean();
    if (existentes.some(f=>solapan(minutos(horaInicio),minutos(horaFin),minutos(f.horaInicio),minutos(f.horaFin)))) {
      return res.status(409).json({mensaje:'La franja se superpone con otro horario del doctor.'});
    }
    const franja=await Disponibilidad.create({doctor,diaSemana,horaInicio,horaFin});
    return res.status(201).json({mensaje:'Franja registrada correctamente.',franja});
  } catch(e) {if(e.code===11000)return res.status(409).json({mensaje:'Ya existe un horario con ese inicio.'});console.error(e);return errorServidor(res);}
}
async function editar(req,res) {
  try {
    if (!idValido(req.params.id)) return res.status(400).json({mensaje:'Identificador inválido.'});
    const actual = await Disponibilidad.findById(req.params.id);
    if (!actual)return res.status(404).json({mensaje:'Franja no encontrada.'});
    const {diaSemana,horaInicio,horaFin}=req.body;
    if(!Number.isInteger(diaSemana)||diaSemana<0||diaSemana>6||!intervaloValido(horaInicio,horaFin)){
      return res.status(400).json({mensaje:'Día u horas inválidas: utiliza intervalos de 30 minutos.'});
    }
    const otras=await Disponibilidad.find({doctor:actual.doctor,diaSemana,_id:{$ne:actual._id}}).lean();
    if(otras.some(f=>solapan(minutos(horaInicio),minutos(horaFin),minutos(f.horaInicio),minutos(f.horaFin)))){
      return res.status(409).json({mensaje:'La franja se superpone con otro horario del doctor.'});
    }
    actual.diaSemana=diaSemana;actual.horaInicio=horaInicio;actual.horaFin=horaFin;
    await actual.save();
    return res.json({mensaje:'Franja actualizada correctamente.',franja:actual});
  }catch(e){if(e.code===11000)return res.status(409).json({mensaje:'Horario de inicio duplicado.'});console.error(e);return errorServidor(res);}
}
async function eliminar(req,res){
  try{
    if(!idValido(req.params.id))return res.status(400).json({mensaje:'Identificador inválido.'});
    const borrada=await Disponibilidad.findByIdAndDelete(req.params.id);
    if(!borrada)return res.status(404).json({mensaje:'Franja no encontrada.'});
    return res.json({mensaje:'Franja eliminada correctamente. Las citas existentes permanecen registradas.'});
  }catch(e){console.error(e);return errorServidor(res);}
}
async function slots(req,res){
  try{
    const {doctor,fecha,excluirCita}=req.query;
    if(!idValido(doctor)||!fechaCorrecta(fecha)||(excluirCita&&!idValido(excluirCita))) {
      return res.status(400).json({mensaje:'Indica un doctor, fecha e identificadores válidos.'});
    }
    const perfil=await Doctor.findOne({usuario:doctor,activo:true});
    if(!perfil)return res.status(400).json({mensaje:'El doctor no se encuentra activo.'});
    const horarios=await listarSlots({doctor,fecha,excluirCita});
    return res.json({doctor,fecha,duracionMinutos:30,horarios});
  }catch(e){console.error(e);return errorServidor(res);}
}
module.exports={listar,crear,editar,eliminar,slots};
