const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const Doctor = require('../models/Doctor');
const Usuario = require('../models/Usuario');
const Especialidad = require('../models/Especialidad');
const rutas = require('../routes/doctorRoutes');
const { crearSesion } = require('../middleware/sesiones');

const USUARIO = '111111111111111111111111';
const ESPECIALIDAD = '222222222222222222222222';
const PERFIL = '333333333333333333333333';
const correcto = {
  usuario: USUARIO,
  especialidad: ESPECIALIDAD,
  numeroColegiado: 'COL-2026-075',
  telefono: '8888-3333'
};

let servidor;
let base;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/doctores', rutas);
  servidor = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(async () => {
  if (servidor) await new Promise(resolve => servidor.close(resolve));
});

async function solicitar(metodo, ruta, cuerpo) {
  const token = crearSesion({ _id: USUARIO, rol: 'administrador' });
  const respuesta = await fetch(`${base}/api/doctores${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(cuerpo)
  });
  return { codigo: respuesta.status, datos: await respuesta.json() };
}

// Las pruebas usan métodos simulados: no escriben en MongoDB local ni en Atlas.
test('KAN-85: crear rechaza cada campo obligatorio faltante y señala cuál corregir', async t => {
  const busqueda = t.mock.method(Usuario, 'findById', async () => { throw Error('No consultar BD'); });
  for (const [cuerpo, campo] of [
    [{}, /usuario/i],
    [{ ...correcto, usuario: '' }, /usuario/i],
    [{ ...correcto, especialidad: null }, /especialidad/i],
    [{ ...correcto, numeroColegiado: '  ' }, /colegiado/i]
  ]) {
    const respuesta = await solicitar('POST', '/', cuerpo);
    assert.equal(respuesta.codigo, 400);
    assert.match(respuesta.datos.mensaje, campo);
  }
  assert.equal(busqueda.mock.callCount(), 0);
});

test('KAN-85: registrar valida formato y longitud del colegiado antes de consultar BD', async t => {
  const busqueda = t.mock.method(Usuario, 'findById', async () => { throw Error('No consultar BD'); });
  for (const valor of ['AB', 'X'.repeat(81), 'COL<>2026']) {
    const respuesta = await solicitar('POST', '/', { ...correcto, numeroColegiado: valor });
    assert.equal(respuesta.codigo, 400, valor);
    assert.match(respuesta.datos.mensaje, /colegiado/i);
  }
  assert.equal(busqueda.mock.callCount(), 0);
});

test('KAN-85: registrar valida el teléfono opcional sin guardar formatos incorrectos', async t => {
  const busqueda = t.mock.method(Usuario, 'findById', async () => { throw Error('No consultar BD'); });
  for (const valor of [1234, null, 'abc-def', '123', '1'.repeat(31), '8888-0000-ext', '8888+3333']) {
    const respuesta = await solicitar('POST', '/', { ...correcto, telefono: valor });
    assert.equal(respuesta.codigo, 400, String(valor));
    assert.match(respuesta.datos.mensaje, /tel[eé]fono/i);
  }
  assert.equal(busqueda.mock.callCount(), 0);
});

test('KAN-85: crear rechaza IDs incorrectos y campos que no pertenecen al formulario', async t => {
  const busqueda = t.mock.method(Usuario, 'findById', async () => { throw Error('No consultar BD'); });
  for (const cuerpo of [
    { ...correcto, usuario: 'no-es-un-id' },
    { ...correcto, especialidad: 42 },
    { ...correcto, activo: false },
    [correcto]
  ]) {
    const respuesta = await solicitar('POST', '/', cuerpo);
    assert.equal(respuesta.codigo, 400);
  }
  assert.equal(busqueda.mock.callCount(), 0);
});

test('KAN-85: registro válido normaliza datos y guarda solamente los campos permitidos', async t => {
  t.mock.method(Usuario, 'findById', async () => ({ _id: USUARIO, rol: 'doctor' }));
  t.mock.method(Especialidad, 'findById', async () => ({ _id: ESPECIALIDAD, activo: true }));
  let registrado;
  const insertar = t.mock.method(Doctor, 'create', async datos => {
    registrado = datos;
    return { _id: PERFIL, ...datos };
  });
  t.mock.method(Doctor, 'findById', () => ({
    populate() { return this; },
    then(resolve) { return Promise.resolve({ _id: PERFIL, ...registrado }).then(resolve); }
  }));
  const respuesta = await solicitar('POST', '/', {
    ...correcto,
    numeroColegiado: '  COL-2026-075  ',
    telefono: '  +506 8888-3333  '
  });
  assert.equal(respuesta.codigo, 201);
  assert.equal(insertar.mock.callCount(), 1);
  assert.deepEqual(registrado, {
    usuario: USUARIO, especialidad: ESPECIALIDAD,
    numeroColegiado: 'COL-2026-075', telefono: '+506 8888-3333'
  });
});

test('KAN-85: no registra usuarios que no sean doctores o especialidades inactivas', async t => {
  const usuario = t.mock.method(Usuario, 'findById', async () => ({ rol: 'paciente' }));
  const especialidad = t.mock.method(Especialidad, 'findById', async () => ({ activo: false }));
  const insertar = t.mock.method(Doctor, 'create', async () => { throw Error('No escribir'); });
  const rechazadoPorRol = await solicitar('POST', '/', correcto);
  assert.equal(rechazadoPorRol.codigo, 400);
  assert.match(rechazadoPorRol.datos.mensaje, /rol|doctor/i);
  usuario.mock.mockImplementation(async () => ({ rol: 'doctor' }));
  const rechazadaPorEstado = await solicitar('POST', '/', correcto);
  assert.equal(rechazadaPorEstado.codigo, 400);
  assert.match(rechazadaPorEstado.datos.mensaje, /especialidad/i);
  assert.equal(insertar.mock.callCount(), 0);
  assert.equal(especialidad.mock.callCount(), 1);
});

test('KAN-85: actualización rechaza datos incompletos, excesivos o con formato incorrecto', async t => {
  const escribir = t.mock.method(Doctor, 'findByIdAndUpdate', async () => { throw Error('No escribir'); });
  for (const [cuerpo, campo] of [
    [{}, /campo/i],
    [{ numeroColegiado: '  ' }, /colegiado/i],
    [{ numeroColegiado: 'A'.repeat(81) }, /colegiado/i],
    [{ numeroColegiado: 1234 }, /colegiado/i],
    [{ telefono: null }, /tel[eé]fono/i],
    [{ telefono: 'texto incorrecto' }, /tel[eé]fono/i],
    [{ telefono: '1'.repeat(31) }, /tel[eé]fono/i],
    [{ activo: false, telefono: '8888-1111' }, /activo/i],
    [{ especialidad: 'no-es-id' }, /especialidad/i]
  ]) {
    const respuesta = await solicitar('PUT', `/${PERFIL}`, cuerpo);
    assert.equal(respuesta.codigo, 400, JSON.stringify(cuerpo));
    assert.match(respuesta.datos.mensaje, campo);
  }
  assert.equal(escribir.mock.callCount(), 0);
});

test('KAN-85: actualizar normaliza los datos válidos sin cambiar otros campos', async t => {
  let filtro, modificacion, opciones;
  const actualizar = t.mock.method(Doctor, 'findByIdAndUpdate', (id, cambios, opt) => {
    filtro = id; modificacion = cambios; opciones = opt;
    return { populate() { return this; }, then(resolve) { return Promise.resolve({ _id: id }).then(resolve); } };
  });
  const respuesta = await solicitar('PUT', `/${PERFIL}`, {
    numeroColegiado: ' COL-2026-076 ', telefono: ' 8888-1111 '
  });
  assert.equal(respuesta.codigo, 200);
  assert.equal(actualizar.mock.callCount(), 1);
  assert.equal(filtro, PERFIL);
  assert.deepEqual(modificacion, { $set: { numeroColegiado: 'COL-2026-076', telefono: '8888-1111' } });
  assert.equal(opciones.runValidators, true);
});

test('KAN-85: permite dejar en blanco el teléfono opcional al actualizar', async t => {
  let cambios;
  t.mock.method(Doctor, 'findByIdAndUpdate', (id, datos) => {
    cambios = datos;
    return { populate() { return this; }, then(resolve) { return Promise.resolve({ _id: id }).then(resolve); } };
  });
  const respuesta = await solicitar('PUT', `/${PERFIL}`, { telefono: '  ' });
  assert.equal(respuesta.codigo, 200);
  assert.deepEqual(cambios, { $set: { telefono: '' } });
});

test('KAN-85: conserva HTTP 409 para colegiados duplicados en registro y edición', async t => {
  t.mock.method(Usuario, 'findById', async () => ({ rol: 'doctor' }));
  t.mock.method(Especialidad, 'findById', async () => ({ activo: true }));
  t.mock.method(Doctor, 'create', async () => { throw Object.assign(new Error('Duplicado'), { code: 11000 }); });
  t.mock.method(Doctor, 'findByIdAndUpdate', () => { throw Object.assign(new Error('Duplicado'), { code: 11000 }); });
  const crear = await solicitar('POST', '/', correcto);
  const editar = await solicitar('PUT', `/${PERFIL}`, { numeroColegiado: 'COL-2026-076' });
  assert.equal(crear.codigo, 409);
  assert.equal(editar.codigo, 409);
  assert.match(crear.datos.mensaje, /perfil registrado/i);
  assert.match(editar.datos.mensaje, /colegiado/i);
});

test('KAN-85: asignar especialidad rechaza campos indebidos y formatos inválidos', async t => {
  const buscarDoctor = t.mock.method(Doctor, 'findById', async () => { throw Error('No consultar BD'); });
  for (const cuerpo of [
    {},
    { especialidad: null },
    { especialidad: 22 },
    { especialidad: 'sin-id' },
    { especialidad: ESPECIALIDAD, activo: false },
    []
  ]) {
    const respuesta = await solicitar('PUT', `/${PERFIL}/especialidad`, cuerpo);
    assert.equal(respuesta.codigo, 400, JSON.stringify(cuerpo));
    assert.match(respuesta.datos.mensaje, /especialidad|campo|objeto|activo/i);
  }
  assert.equal(buscarDoctor.mock.callCount(), 0);
});
