// Reglas compartidas para reservas y reprogramaciones. Zona horaria: Costa Rica (UTC-06).
const Disponibilidad = require('../models/Disponibilidad');
const Cita = require('../models/Cita');
const Doctor = require('../models/Doctor');
const DURACION = 30;
const formatoFecha = /^\d{4}-\d{2}-\d{2}$/;
const formatoHora = /^([01]\d|2[0-3]):[0-5]\d$/;
const minutos = hora => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));
const horaDe = valor => `${String(Math.floor(valor / 60)).padStart(2, '0')}:${String(valor % 60).padStart(2, '0')}`;

function fechaCorrecta(fecha) {
  if (typeof fecha !== 'string' || !formatoFecha.test(fecha)) return false;
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const d = new Date(Date.UTC(anio, mes - 1, dia));
  return d.getUTCFullYear() === anio && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
}
function fechaHoraFutura(fecha, hora) {
  return fechaCorrecta(fecha) && typeof hora === 'string' && formatoHora.test(hora) &&
    new Date(`${fecha}T${hora}:00-06:00`).getTime() > Date.now();
}
function diaDe(fecha) { return new Date(`${fecha}T12:00:00Z`).getUTCDay(); }
function intervaloValido(inicio, fin) {
  if (typeof inicio !== 'string' || typeof fin !== 'string' ||
      !formatoHora.test(inicio) || !formatoHora.test(fin)) return false;
  const a = minutos(inicio), b = minutos(fin);
  // Bloques alineados a media hora; evita intervalos que atraviesan medianoche.
  return a % DURACION === 0 && b % DURACION === 0 && b > a && b - a >= DURACION;
}
function solapan(inicioA, finA, inicioB, finB) { return inicioA < finB && inicioB < finA; }

async function evaluarHorario({doctor, fecha, hora, excluirCita}) {
  if (!fechaHoraFutura(fecha, hora)) return {valido:false, codigo:400, mensaje:'Fecha y hora inválidas o pasadas (hora de Costa Rica).'};
  const inicio = minutos(hora);
  if (inicio % DURACION !== 0 || inicio + DURACION > 1440) {
    return {valido:false, codigo:400, mensaje:'Selecciona una hora exacta disponible, en intervalos de 30 minutos.'};
  }
  // Este método se utiliza tanto al reservar como al reprogramar.
  // Un perfil desactivado no debe admitir nuevas reservas ni cambios de horario.
  const perfilActivo = await Doctor.findOne({usuario:doctor,activo:true});
  if (!perfilActivo) {
    return {valido:false, codigo:409, mensaje:'El doctor no está activo para nuevas reservas o reprogramaciones.'};
  }
  const franjas = await Disponibilidad.find({doctor, diaSemana:diaDe(fecha)}).lean();
  if (!franjas.some(f => inicio >= minutos(f.horaInicio) && inicio + DURACION <= minutos(f.horaFin))) {
    return {valido:false, codigo:409, mensaje:'El doctor no atiende en esa fecha y hora. Consulta sus horarios disponibles.'};
  }
  const filtro = {doctor, fecha, estado:{$in:['pendiente','confirmada']}};
  if (excluirCita) filtro._id = {$ne:excluirCita};
  const citas = await Cita.find(filtro).select('hora').lean();
  if (citas.some(c => solapan(inicio, inicio + DURACION, minutos(c.hora), minutos(c.hora) + DURACION))) {
    return {valido:false, codigo:409, mensaje:'El doctor ya tiene una cita en ese horario.'};
  }
  return {valido:true};
}
async function listarSlots({doctor, fecha, excluirCita}) {
  const franjas = await Disponibilidad.find({doctor, diaSemana:diaDe(fecha)}).sort({horaInicio:1}).lean();
  const filtro = {doctor,fecha,estado:{$in:['pendiente','confirmada']}};
  if (excluirCita) filtro._id = {$ne:excluirCita};
  const citas = await Cita.find(filtro).select('hora').lean();
  const horarios = new Set();
  for (const franja of franjas) {
    for (let t=minutos(franja.horaInicio); t+DURACION<=minutos(franja.horaFin); t+=DURACION) horarios.add(t);
  }
  return [...horarios].sort((a,b)=>a-b).map(t=>({
    hora:horaDe(t),
    disponible:fechaHoraFutura(fecha,horaDe(t)) && !citas.some(c=>solapan(t,t+DURACION,minutos(c.hora),minutos(c.hora)+DURACION))
  }));
}
module.exports={DURACION,minutos,fechaCorrecta,fechaHoraFutura,intervaloValido,solapan,evaluarHorario,listarSlots};
