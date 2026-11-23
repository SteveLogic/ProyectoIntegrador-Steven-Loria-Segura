const { test } = require('node:test');
const assert = require('node:assert/strict');
const Doctor = require('../models/Doctor');
const Disponibilidad = require('../models/Disponibilidad');
const Cita = require('../models/Cita');
const { evaluarHorario, listarSlots } = require('../utils/horarios');

const DOCTOR_A = '111111111111111111111111';
const DOCTOR_B = '222222222222222222222222';
const FECHA = '2099-01-06';
const CITAS = [
  { _id: '333333333333333333333333', doctor: DOCTOR_A, fecha: FECHA, hora: '09:00', estado: 'pendiente' },
  { _id: '444444444444444444444444', doctor: DOCTOR_A, fecha: FECHA, hora: '09:30', estado: 'cancelada' },
  { _id: '555555555555555555555555', doctor: DOCTOR_B, fecha: FECHA, hora: '09:30', estado: 'confirmada' }
];
function preparar(t) {
  t.mock.method(Doctor, 'findOne', async () => ({ activo: true }));
  t.mock.method(Disponibilidad, 'find', () => ({
    sort() { return this; },
    lean: async () => [{ horaInicio: '09:00', horaFin: '10:00' }]
  }));
  t.mock.method(Cita, 'find', filtro => ({
    select() { return this; },
    lean: async () => CITAS.filter(c =>
      c.doctor === filtro.doctor && c.fecha === filtro.fecha &&
      filtro.estado.$in.includes(c.estado) &&
      (!filtro._id || c._id !== filtro._id.$ne))
  }));
}

test('KAN-11: el horario ocupado se rechaza para el mismo doctor', async t => {
  preparar(t);
  const r = await evaluarHorario({ doctor: DOCTOR_A, fecha: FECHA, hora: '09:00' });
  assert.equal(r.valido, false);
  assert.equal(r.codigo, 409);
});

test('KAN-11: la misma hora puede reservarse con un doctor diferente', async t => {
  preparar(t);
  const r = await evaluarHorario({ doctor: DOCTOR_B, fecha: FECHA, hora: '09:00' });
  assert.equal(r.valido, true);
});

test('KAN-11: una cita cancelada libera su franja', async t => {
  preparar(t);
  const r = await evaluarHorario({ doctor: DOCTOR_A, fecha: FECHA, hora: '09:30' });
  assert.equal(r.valido, true);
});

test('KAN-11: la fecha fuera de la franja del doctor se rechaza', async t => {
  preparar(t);
  const r = await evaluarHorario({ doctor: DOCTOR_A, fecha: FECHA, hora: '10:00' });
  assert.equal(r.valido, false);
  assert.equal(r.codigo, 409);
});

test('KAN-11: los horarios deben respetar intervalos de 30 minutos', async t => {
  preparar(t);
  const r = await evaluarHorario({ doctor: DOCTOR_A, fecha: FECHA, hora: '09:15' });
  assert.equal(r.valido, false);
  assert.equal(r.codigo, 400);
});

test('KAN-11: no se acepta una cita en el pasado', async t => {
  preparar(t);
  const r = await evaluarHorario({ doctor: DOCTOR_A, fecha: '2025-01-06', hora: '09:00' });
  assert.equal(r.valido, false);
  assert.equal(r.codigo, 400);
});

test('KAN-11 y 12: la lista marca ocupado y libre según estado real', async t => {
  preparar(t);
  const r = await listarSlots({ doctor: DOCTOR_A, fecha: FECHA });
  assert.deepEqual(r, [
    { hora: '09:00', disponible: false },
    { hora: '09:30', disponible: true }
  ]);
});

test('KAN-12: el horario original se puede excluir al proponer la reprogramación', async t => {
  preparar(t);
  const r = await listarSlots({ doctor: DOCTOR_A, fecha: FECHA, excluirCita: CITAS[0]._id });
  assert.deepEqual(r, [
    { hora: '09:00', disponible: true },
    { hora: '09:30', disponible: true }
  ]);
});

test('KAN-12: una cita activa de otro paciente nunca se excluye al reprogramar', async t => {
  preparar(t);
  const r = await evaluarHorario({ doctor: DOCTOR_B, fecha: FECHA, hora: '09:30', excluirCita: CITAS[0]._id });
  assert.equal(r.valido, false);
  assert.equal(r.codigo, 409);
});
