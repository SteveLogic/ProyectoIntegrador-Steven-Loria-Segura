const { test } = require('node:test');
const assert = require('node:assert/strict');

const Cita = require('../models/Cita');
const Usuario = require('../models/Usuario');
const Doctor = require('../models/Doctor');
const Especialidad = require('../models/Especialidad');
const Notificacion = require('../models/Notificacion');

// Se reemplaza temporalmente la validación de horarios para no usar MongoDB.
const horarios = require('../utils/horarios');
const validarOriginal = horarios.evaluarHorario;
horarios.evaluarHorario = async () => ({ valido: true });
const { crearCita, reprogramarCita } = require('../controllers/citaController');
horarios.evaluarHorario = validarOriginal;

const PACIENTE = '111111111111111111111111';
const DOCTOR = '333333333333333333333333';
const ESPECIALIDAD = '888888888888888888888888';
const CITA = '666666666666666666666666';

function respuesta() {
  return {
    codigo: 200,
    datos: null,
    status(codigo) { this.codigo = codigo; return this; },
    json(datos) { this.datos = datos; return this; }
  };
}

function peticionReserva() {
  return {
    sesion: { usuarioId: PACIENTE, rol: 'paciente' },
    body: {
      paciente: PACIENTE,
      doctor: DOCTOR,
      especialidad: ESPECIALIDAD,
      fecha: '2099-01-12',
      hora: '09:30',
      motivo: 'Consulta de prueba'
    }
  };
}

function errorDuplicado() {
  return Object.assign(new Error('E11000 duplicate key error'), { code: 11000 });
}

test('Existe un índice único para doctor, fecha y hora de citas activas', () => {
  const indice = Cita.schema.indexes().find(([campos, opciones]) =>
    campos.doctor === 1 &&
    campos.fecha === 1 &&
    campos.hora === 1 &&
    Object.keys(campos).length === 3 &&
    opciones.unique === true
  );

  assert.ok(indice, 'Falta índice único compuesto por doctor, fecha y hora');
  const filtro = indice[1].partialFilterExpression;
  assert.ok(filtro, 'El índice debe excluir las citas canceladas y completadas');
  assert.deepEqual(
    [...(filtro.estado?.$in ?? [])].sort(),
    ['pendiente', 'confirmada'].sort(),
    'El índice debe aplicarse solamente a citas pendientes o confirmadas'
  );
});

test('Una reserva con clave duplicada devuelve 409 y no genera aviso', async t => {
  t.mock.method(Usuario, 'findById', async id => ({
    rol: String(id) === PACIENTE ? 'paciente' : 'doctor'
  }));
  t.mock.method(Especialidad, 'findById', async () => ({ activo: true }));
  t.mock.method(Doctor, 'findOne', async () => ({ especialidad: ESPECIALIDAD }));
  t.mock.method(Cita, 'create', async () => { throw errorDuplicado(); });
  const avisos = t.mock.method(Notificacion, 'create', async datos => datos);

  const res = respuesta();
  await crearCita(peticionReserva(), res);

  assert.equal(res.codigo, 409, 'Una reserva duplicada debe responder HTTP 409');
  assert.match(res.datos?.mensaje ?? '', /horario|ocupad|cita/i);
  assert.equal(avisos.mock.callCount(), 0, 'Una reserva rechazada no debe avisar');
});

test('Una reprogramación con clave duplicada devuelve 409 y no genera aviso', async t => {
  t.mock.method(Cita, 'findById', async () => ({
    _id: CITA,
    paciente: PACIENTE,
    doctor: DOCTOR,
    fecha: '2099-01-12',
    hora: '09:00',
    estado: 'pendiente'
  }));
  t.mock.method(Cita, 'findOneAndUpdate', async () => { throw errorDuplicado(); });
  const avisos = t.mock.method(Notificacion, 'create', async datos => datos);

  const res = respuesta();
  await reprogramarCita({
    params: { id: CITA },
    sesion: { usuarioId: PACIENTE, rol: 'paciente' },
    body: { fecha: '2099-01-12', hora: '09:30' }
  }, res);

  assert.equal(res.codigo, 409, 'Una reprogramación duplicada debe responder HTTP 409');
  assert.match(res.datos?.mensaje ?? '', /horario|ocupad|cita/i);
  assert.equal(avisos.mock.callCount(), 0, 'Una reprogramación rechazada no debe avisar');
});
