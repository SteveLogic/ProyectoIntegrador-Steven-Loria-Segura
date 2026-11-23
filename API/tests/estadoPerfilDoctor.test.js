const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const Doctor = require('../models/Doctor');
const Usuario = require('../models/Usuario');
const Especialidad = require('../models/Especialidad');
const Cita = require('../models/Cita');
const Disponibilidad = require('../models/Disponibilidad');
const { crearSesion } = require('../middleware/sesiones');
const rutasDoctores = require('../routes/doctorRoutes');
const { evaluarHorario } = require('../utils/horarios');
const { reprogramarCita } = require('../controllers/citaController');

const PERFIL = '111111111111111111111111';
const DOCTOR_USUARIO = '222222222222222222222222';
const ESPECIALIDAD = '333333333333333333333333';
const PACIENTE = '444444444444444444444444';
const CITA = '555555555555555555555555';

let server;
let base;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/doctores', rutasDoctores);
  server = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
});

async function solicitar(cuerpo, { rol = 'administrador', id = PERFIL } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (rol) {
    const token = crearSesion({ _id: rol === 'administrador' ? PACIENTE : DOCTOR_USUARIO, rol });
    headers.Authorization = `Bearer ${token}`;
  }
  const respuesta = await fetch(`${base}/api/doctores/${id}/estado`, {
    method: 'PATCH', headers, body: JSON.stringify(cuerpo)
  });
  const texto = await respuesta.text();
  let datos;
  try { datos = JSON.parse(texto); } catch { datos = { mensaje: texto }; }
  return { codigo: respuesta.status, datos };
}
function perfil(activo) {
  return { _id: PERFIL, usuario: DOCTOR_USUARIO, especialidad: ESPECIALIDAD, activo };
}

// Ninguna prueba usa credenciales reales o modifica MongoDB/Atlas.
test('KAN-8: solo el administrador puede cambiar el estado', async t => {
  const consultar = t.mock.method(Doctor, 'findById', async () => { throw Error('No consultar BD'); });
  assert.equal((await solicitar({ activo: false }, { rol: null })).codigo, 401);
  assert.equal((await solicitar({ activo: false }, { rol: 'paciente' })).codigo, 403);
  assert.equal((await solicitar({ activo: false }, { rol: 'doctor' })).codigo, 403);
  assert.equal(consultar.mock.callCount(), 0);
});

test('KAN-8: rechaza ID inválido y cambios no autorizados', async t => {
  const consultar = t.mock.method(Doctor, 'findById', async () => { throw Error('No consultar BD'); });
  assert.equal((await solicitar({ activo: false }, { id: 'no-valido' })).codigo, 400);
  for (const cuerpo of [null, {}, {activo:'false'}, {activo:1}, {activo:true,rol:'administrador'}, []]) {
    assert.equal((await solicitar(cuerpo)).codigo, 400);
  }
  assert.equal(consultar.mock.callCount(), 0);
});

test('KAN-8: un perfil inexistente devuelve 404', async t => {
  t.mock.method(Doctor, 'findById', async () => null);
  assert.equal((await solicitar({ activo: false })).codigo, 404);
});

test('KAN-8: no cambia perfiles que ya tienen el estado solicitado', async t => {
  t.mock.method(Doctor, 'findById', async () => perfil(false));
  const escritura = t.mock.method(Doctor, 'findOneAndUpdate', async () => { throw Error('No escribir'); });
  assert.equal((await solicitar({ activo: false })).codigo, 409);
  assert.equal(escritura.mock.callCount(), 0);
});

test('KAN-8: desactivar cambia únicamente Doctor.activo de forma condicional', async t => {
  t.mock.method(Doctor, 'findById', async () => perfil(true));
  let filtro, cambios, opciones;
  const escritura = t.mock.method(Doctor, 'findOneAndUpdate', async (f, c, o) => {
    filtro = f; cambios = c; opciones = o;
    return perfil(false);
  });
  t.mock.method(Doctor, 'populate', async doc => doc);
  const respuesta = await solicitar({ activo: false });
  assert.equal(respuesta.codigo, 200);
  assert.equal(respuesta.datos.doctor.activo, false);
  assert.deepEqual(filtro, { _id: PERFIL, activo: true });
  assert.deepEqual(cambios, { $set: { activo: false } });
  assert.equal(opciones.runValidators, true);
  assert.equal(escritura.mock.callCount(), 1);
});

test('KAN-8: un cambio concurrente de estado responde 409', async t => {
  t.mock.method(Doctor, 'findById', async () => perfil(true));
  t.mock.method(Doctor, 'findOneAndUpdate', async () => null);
  assert.equal((await solicitar({ activo: false })).codigo, 409);
});

test('KAN-8: no reactiva si el usuario está inactivo o cambió de rol', async t => {
  t.mock.method(Doctor, 'findById', async () => perfil(false));
  const usuario = t.mock.method(Usuario, 'findById', async () => ({ rol: 'doctor', activo: false }));
  const especialidad = t.mock.method(Especialidad, 'findById', async () => { throw Error('No consultar especialidad'); });
  const escritura = t.mock.method(Doctor, 'findOneAndUpdate', async () => { throw Error('No escribir'); });
  assert.equal((await solicitar({ activo: true })).codigo, 409);
  usuario.mock.mockImplementation(async () => ({ rol: 'paciente', activo: true }));
  assert.equal((await solicitar({ activo: true })).codigo, 409);
  assert.equal(especialidad.mock.callCount(), 0);
  assert.equal(escritura.mock.callCount(), 0);
});

test('KAN-8: no reactiva un perfil cuya especialidad está inactiva', async t => {
  t.mock.method(Doctor, 'findById', async () => perfil(false));
  t.mock.method(Usuario, 'findById', async () => ({ rol: 'doctor', activo: true }));
  t.mock.method(Especialidad, 'findById', async () => ({ activo: false }));
  const escritura = t.mock.method(Doctor, 'findOneAndUpdate', async () => { throw Error('No escribir'); });
  assert.equal((await solicitar({ activo: true })).codigo, 409);
  assert.equal(escritura.mock.callCount(), 0);
});

test('KAN-8: reactiva si el usuario es doctor activo y la especialidad está activa', async t => {
  t.mock.method(Doctor, 'findById', async () => perfil(false));
  t.mock.method(Usuario, 'findById', async () => ({ rol: 'doctor', activo: true }));
  t.mock.method(Especialidad, 'findById', async () => ({ activo: true }));
  const escritura = t.mock.method(Doctor, 'findOneAndUpdate', async (f, c) => {
    assert.deepEqual(f, { _id: PERFIL, activo: false });
    assert.deepEqual(c, { $set: { activo: true } });
    return perfil(true);
  });
  t.mock.method(Doctor, 'populate', async doc => doc);
  const respuesta = await solicitar({ activo: true });
  assert.equal(respuesta.codigo, 200);
  assert.equal(respuesta.datos.doctor.activo, true);
  assert.equal(escritura.mock.callCount(), 1);
});

test('KAN-8: perfil inactivo impide evaluar horarios para reservas y reprogramaciones', async t => {
  const consultaPerfil = t.mock.method(Doctor, 'findOne', async () => null);
  const horarios = t.mock.method(Disponibilidad, 'find', async () => { throw Error('No consultar disponibilidad'); });
  const resultado = await evaluarHorario({ doctor: DOCTOR_USUARIO, fecha: '2099-01-06', hora: '09:00' });
  assert.equal(resultado.valido, false);
  assert.equal(resultado.codigo, 409);
  assert.deepEqual(consultaPerfil.mock.calls[0].arguments[0], { usuario: DOCTOR_USUARIO, activo: true });
  assert.equal(horarios.mock.callCount(), 0);
});

test('KAN-8: no se reprograman citas hacia un doctor con perfil inactivo', async t => {
  t.mock.method(Cita, 'findById', async () => ({
    _id: CITA, doctor: DOCTOR_USUARIO, paciente: PACIENTE,
    fecha: '2099-01-05', hora: '09:00', estado: 'pendiente'
  }));
  t.mock.method(Doctor, 'findOne', async () => null);
  const escritura = t.mock.method(Cita, 'findOneAndUpdate', async () => { throw Error('No escribir'); });
  const respuesta = {
    codigo: null, datos: null,
    status(codigo) { this.codigo = codigo; return this; },
    json(datos) { this.datos = datos; return this; }
  };
  await reprogramarCita({
    params: { id: CITA }, body: { fecha: '2099-01-06', hora: '09:00' },
    sesion: { usuarioId: PACIENTE, rol: 'paciente' }
  }, respuesta);
  assert.equal(respuesta.codigo, 409);
  assert.match(respuesta.datos.mensaje, /no est[aá] activo/i);
  assert.equal(escritura.mock.callCount(), 0);
});

test('KAN-8: un perfil activo permite evaluar una franja libre existente', async t => {
  t.mock.method(Doctor, 'findOne', async () => perfil(true));
  t.mock.method(Disponibilidad, 'find', () => ({
    lean: async () => [{ horaInicio: '09:00', horaFin: '10:00' }]
  }));
  t.mock.method(Cita, 'find', () => ({
    select() { return this; },
    lean: async () => []
  }));
  const resultado = await evaluarHorario({ doctor: DOCTOR_USUARIO, fecha: '2099-01-06', hora: '09:00' });
  assert.deepEqual(resultado, { valido: true });
});

test('KAN-8: la API pública de horarios rechaza un perfil inactivo', async t => {
  const rutasDisponibilidad = require('../routes/disponibilidadRoutes');
  const consulta = t.mock.method(Doctor, 'findOne', async () => null);
  const app = express();
  app.use('/api/disponibilidad', rutasDisponibilidad);
  const s = await new Promise(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  try {
    const url = `http://127.0.0.1:${s.address().port}/api/disponibilidad/slots?doctor=${DOCTOR_USUARIO}&fecha=2099-01-06`;
    const respuesta = await fetch(url);
    assert.equal(respuesta.status, 400);
    assert.match((await respuesta.json()).mensaje, /no se encuentra activo/i);
    assert.equal(consulta.mock.callCount(), 1);
  } finally {
    await new Promise(resolve => s.close(resolve));
  }
});
