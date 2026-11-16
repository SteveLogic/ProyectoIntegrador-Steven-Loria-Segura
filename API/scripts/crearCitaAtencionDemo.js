// SOLO PARA PRUEBAS ACADÉMICAS. Ejecutar una vez desde API/: node scripts/crearCitaAtencionDemo.js
// Inserta una cita pasada ficticia para poder probar el flujo «completar → registrar atención».
require('dotenv').config();
const mongoose = require('mongoose');
const Usuario = require('../models/Usuario');
const Doctor = require('../models/Doctor');
const Cita = require('../models/Cita');
const conectarDB = require('../config/database');
const MARCA = '[PRUEBA ACADÉMICA 06A] cita ficticia para registrar atención';

function ayerCostaRica() {
  const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Costa_Rica', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(ayer);
  const valor = tipo => partes.find(p => p.type === tipo)?.value;
  return `${valor('year')}-${valor('month')}-${valor('day')}`;
}

async function principal() {
  if (!process.env.MONGO_URI) throw new Error('Configura MONGO_URI en API/.env antes de ejecutar.');
  await conectarDB();
  const doctor = await Usuario.findOne({ email: process.env.DOCTOR_DEMO_EMAIL || 'doctor@citas.com', rol: 'doctor' });
  const paciente = await Usuario.findOne({ email: process.env.PACIENTE_DEMO_EMAIL || 'paciente.demo20261023@citas.com', rol: 'paciente' });
  if (!doctor || !paciente) throw new Error('No se encontraron las dos cuentas ficticias de prueba. No se creó ninguna cita.');
  const perfil = await Doctor.findOne({ usuario: doctor._id, activo: true });
  if (!perfil) throw new Error('El doctor de prueba no tiene un perfil médico activo.');
  const existente = await Cita.findOne({ doctor: doctor._id, paciente: paciente._id, motivo: MARCA });
  if (existente) {
    console.log('La cita académica ya existe:', existente._id.toString(), existente.fecha, existente.hora);
    return;
  }
  const cita = await Cita.create({
    doctor: doctor._id,
    paciente: paciente._id,
    especialidad: perfil.especialidad,
    fecha: ayerCostaRica(),
    hora: '08:30',
    estado: 'confirmada',
    motivo: MARCA
  });
  console.log('Cita ficticia creada:', cita._id.toString(), cita.fecha, cita.hora);
  console.log('Inicia sesión como doctor, abre Consultas, marca la cita como completada y registra la atención.');
}
principal().catch(err => { console.error(err.message); process.exitCode = 1; })
  .finally(async () => { await mongoose.connection.close(); });
