const { test } = require('node:test');
const assert = require('node:assert/strict');
const Cita = require('../models/Cita');
const Notificacion = require('../models/Notificacion');
const Usuario = require('../models/Usuario');

// Stub de disponibilidad, sin conexiones ni escrituras a MongoDB.
const horarios = require('../utils/horarios');
const originalEvaluar = horarios.evaluarHorario;
horarios.evaluarHorario = async ({ hora }) => hora === '09:17'
  ? { valido: false, codigo: 400, mensaje: 'La hora no pertenece a una franja de 30 minutos.' }
  : { valido: true }; 
const { reprogramarCita, cancelarCita } = require('../controllers/citaController');
horarios.evaluarHorario = originalEvaluar;

const PACIENTE = '111111111111111111111111';
const DOCTOR = '222222222222222222222222';
const CITA = '333333333333333333333333';
const FECHA_FUTURA = '2099-01-07';
const FECHA_NUEVA = '2099-01-08';
const FECHA_PASADA = '2025-01-07';

function documento(overrides = {}) {
  return { _id: CITA, paciente: PACIENTE, doctor: DOCTOR,
    fecha: FECHA_FUTURA, hora: '09:00', estado: 'pendiente', ...overrides };
}
function respuesta() {
  return { codigo: 200, datos: null,
    status(codigo) { this.codigo = codigo; return this; },
    json(datos) { this.datos = datos; return this; } };
}
function request(cuerpo = { fecha: FECHA_NUEVA, hora: '09:30' }) {
  return { params: { id: CITA }, body: cuerpo,
    sesion: { usuarioId: PACIENTE, rol: 'paciente' } };
}
function sinEscrituras(t, cita) {
  t.mock.method(Cita, 'findById', async () => cita);
  const actualizar = t.mock.method(Cita, 'findOneAndUpdate', async () => {
    throw Error('No debe haber escrituras durante este caso');
  });
  const avisar = t.mock.method(Notificacion, 'create', async () => {
    throw Error('No debe enviarse aviso durante este caso');
  });
  return { actualizar, avisar };
}

test('KAN-12: una cita pendiente pasada no puede reprogramarse', async t => {
  const { actualizar, avisar } = sinEscrituras(t, documento({ fecha: FECHA_PASADA }));
  const res = respuesta();
  await reprogramarCita(request(), res);
  assert.equal(res.codigo, 409);
  assert.match(res.datos.mensaje, /ya pasaron/i);
  assert.equal(actualizar.mock.callCount(), 0);
  assert.equal(avisar.mock.callCount(), 0);
});

test('KAN-12: una cita confirmada pasada tampoco puede reprogramarse', async t => {
  const { actualizar } = sinEscrituras(t, documento({ fecha: FECHA_PASADA, estado: 'confirmada' }));
  const res = respuesta();
  await reprogramarCita(request(), res);
  assert.equal(res.codigo, 409);
  assert.equal(actualizar.mock.callCount(), 0);
});

test('KAN-12: una cita pendiente pasada no puede cancelarse', async t => {
  const { actualizar, avisar } = sinEscrituras(t, documento({ fecha: FECHA_PASADA }));
  const res = respuesta();
  await cancelarCita(request({}), res);
  assert.equal(res.codigo, 409);
  assert.match(res.datos.mensaje, /ya pasaron/i);
  assert.equal(actualizar.mock.callCount(), 0);
  assert.equal(avisar.mock.callCount(), 0);
});

test('KAN-12: una cita confirmada pasada tampoco puede cancelarse', async t => {
  const { actualizar } = sinEscrituras(t, documento({ fecha: FECHA_PASADA, estado: 'confirmada' }));
  const res = respuesta();
  await cancelarCita(request({}), res);
  assert.equal(res.codigo, 409);
  assert.equal(actualizar.mock.callCount(), 0);
});

test('KAN-12: una cita no presentada es terminal y no puede reprogramarse', async t => {
  const { actualizar } = sinEscrituras(t, documento({ estado: 'no_presentada' }));
  const res = respuesta();
  await reprogramarCita(request(), res);
  assert.equal(res.codigo, 409);
  assert.equal(actualizar.mock.callCount(), 0);
});

test('KAN-12: una cita no presentada no puede cancelarse', async t => {
  const { actualizar } = sinEscrituras(t, documento({ estado: 'no_presentada' }));
  const res = respuesta();
  await cancelarCita(request({}), res);
  assert.equal(res.codigo, 409);
  assert.equal(actualizar.mock.callCount(), 0);
});

test('KAN-12: reprogramación válida preserva doctor y paciente y actualiza solo fecha y hora', async t => {
  const anterior = documento();
  t.mock.method(Cita, 'findById', async () => anterior);
  const actualizar = t.mock.method(Cita, 'findOneAndUpdate', async (filtro, cambios, opciones) => {
    assert.equal(filtro._id, CITA);
    assert.equal(filtro.fecha, FECHA_FUTURA);
    assert.equal(filtro.hora, '09:00');
    assert.deepEqual(filtro.estado.$in, ['pendiente', 'confirmada']);
    assert.deepEqual(cambios, { $set: { fecha: FECHA_NUEVA, hora: '09:30' } });
    assert.equal(opciones.runValidators, true);
    return { ...anterior, ...cambios.$set };
  });
  t.mock.method(Usuario, 'findById', async () => ({ nombre: 'Doctor de prueba' }));
  const avisar = t.mock.method(Notificacion, 'create', async datos => datos);
  const res = respuesta();
  await reprogramarCita(request(), res);
  assert.equal(res.codigo, 200);
  assert.equal(res.datos.cita.paciente, PACIENTE);
  assert.equal(res.datos.cita.doctor, DOCTOR);
  assert.equal(actualizar.mock.callCount(), 1);
  assert.equal(avisar.mock.callCount(), 1);
});

test('KAN-12: cancelación futura usa filtro atómico de estado, fecha y hora', async t => {
  const anterior = documento();
  t.mock.method(Cita, 'findById', async () => anterior);
  const actualizar = t.mock.method(Cita, 'findOneAndUpdate', async (filtro, cambios, opciones) => {
    assert.equal(filtro._id, CITA);
    assert.equal(filtro.fecha, FECHA_FUTURA);
    assert.equal(filtro.hora, '09:00');
    assert.deepEqual(filtro.estado.$in, ['pendiente', 'confirmada']);
    assert.deepEqual(cambios, { $set: { estado: 'cancelada' } });
    assert.equal(opciones.runValidators, true);
    return { ...anterior, estado: 'cancelada' };
  });
  t.mock.method(Usuario, 'findById', async () => ({ nombre: 'Doctor de prueba' }));
  const avisar = t.mock.method(Notificacion, 'create', async datos => datos);
  const res = respuesta();
  await cancelarCita(request({}), res);
  assert.equal(res.codigo, 200);
  assert.equal(res.datos.cita.estado, 'cancelada');
  assert.equal(actualizar.mock.callCount(), 1);
  assert.equal(avisar.mock.callCount(), 1);
});

test('KAN-12: si la cita cambia durante la cancelación, devuelve 409 y no notifica', async t => {
  t.mock.method(Cita, 'findById', async () => documento());
  t.mock.method(Cita, 'findOneAndUpdate', async () => null);
  const avisar = t.mock.method(Notificacion, 'create', async datos => datos);
  const res = respuesta();
  await cancelarCita(request({}), res);
  assert.equal(res.codigo, 409);
  assert.equal(avisar.mock.callCount(), 0);
});

test('KAN-12: horario nuevo inválido se rechaza sin modificar la cita', async t => {
  const { actualizar } = sinEscrituras(t, documento());
  const res = respuesta();
  await reprogramarCita(request({ fecha: FECHA_NUEVA, hora: '09:17' }), res);
  assert.equal(res.codigo, 400);
  assert.equal(actualizar.mock.callCount(), 0);
});
