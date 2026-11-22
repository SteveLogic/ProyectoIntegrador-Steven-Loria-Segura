const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const Cita = require('../models/Cita');
const Usuario = require('../models/Usuario');
const Notificacion = require('../models/Notificacion');
const rutas = require('../routes/citaRoutes');
const { crearSesion, cerrarSesionesDeUsuario } = require('../middleware/sesiones');

const DOCTOR = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const OTRO = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const CITA = 'cccccccccccccccccccccccc';

async function cambiarEstado(cuerpo, { rol = 'doctor', id = CITA } = {}) {
  const app = express();
  app.use(express.json());
  app.use('/api/citas', rutas);
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const token = rol ? crearSesion({ _id: DOCTOR, rol }) : null;
  try {
    const r = await fetch(`http://127.0.0.1:${server.address().port}/api/citas/${id}/estado`, {
      method: 'PATCH', headers: {'Content-Type':'application/json', ...(token ? {Authorization: `Bearer ${token}`} : {})},
      body: JSON.stringify(cuerpo)
    });
    return { codigo: r.status, datos: await r.json() };
  } finally {
    cerrarSesionesDeUsuario(DOCTOR);
    await new Promise(resolve => server.close(resolve));
  }
}

function cita({doctor = DOCTOR, estado = 'pendiente', fecha = '2024-01-01'} = {}) {
  return { _id: CITA, doctor, paciente: OTRO, estado, fecha, hora: '09:00' };
}

test('Estado de cita: rechaza sesión faltante y paciente', async () => {
  assert.equal((await cambiarEstado({estado:'no_presentada'}, {rol:null})).codigo,401);
  assert.equal((await cambiarEstado({estado:'no_presentada'}, {rol:'paciente'})).codigo,403);
});

test('Estado de cita: rechaza ID inválido y cambios ajenos a estado', async t => {
  const db=t.mock.method(Cita,'findById',async()=>{throw new Error('No acceder BD');});
  assert.equal((await cambiarEstado({estado:'no_presentada'},{id:'invalid'})).codigo,400);
  assert.equal((await cambiarEstado({estado:'desconocida'})).codigo,400);
  assert.equal((await cambiarEstado({estado:'completada',doctor:OTRO})).codigo,400);
  assert.equal(db.mock.callCount(),0);
});

test('Estado de cita: devuelve 404 cuando no existe', async t => {
  t.mock.method(Cita,'findById',async()=>null);
  assert.equal((await cambiarEstado({estado:'no_presentada'})).codigo,404);
});

test('Estado de cita: solo el doctor asignado puede modificarla', async t => {
  t.mock.method(Cita,'findById',async()=>cita({doctor:OTRO}));
  assert.equal((await cambiarEstado({estado:'no_presentada'})).codigo,403);
});

test('Estado de cita: no permite marcar no presentada antes del horario', async t => {
  t.mock.method(Cita,'findById',async()=>cita({fecha:'2035-01-01'}));
  assert.equal((await cambiarEstado({estado:'no_presentada'})).codigo,409);
});

test('Estado de cita: no permite cancelar una cita pasada', async t => {
  t.mock.method(Cita,'findById',async()=>cita());
  assert.equal((await cambiarEstado({estado:'cancelada'})).codigo,409);
});

test('Estado de cita: no permite modificar una ya finalizada', async t => {
  t.mock.method(Cita,'findById',async()=>cita({estado:'no_presentada'}));
  assert.equal((await cambiarEstado({estado:'completada'})).codigo,409);
});

test('Estado de cita: marca no presentada de forma atómica y persistible', async t => {
  t.mock.method(Cita,'findById',async()=>cita());
  let actualizacion;
  t.mock.method(Cita,'findOneAndUpdate',async (filtro,cambios,opciones)=>{
    actualizacion={filtro,cambios,opciones};
    return {...cita(),estado:'no_presentada'};
  });
  const r=await cambiarEstado({estado:'no_presentada'});
  assert.equal(r.codigo,200);
  assert.equal(r.datos.cita.estado,'no_presentada');
  assert.deepEqual(actualizacion.cambios,{$set:{estado:'no_presentada'}});
  assert.deepEqual(actualizacion.filtro.estado,{$in:['pendiente','confirmada']});
  assert.equal(actualizacion.opciones.runValidators,true);
});

test('Estado de cita: registra la cita atendida y detecta conflicto concurrente', async t => {
  t.mock.method(Cita,'findById',async()=>cita());
  t.mock.method(Cita,'findOneAndUpdate',async()=>null);
  assert.equal((await cambiarEstado({estado:'completada'})).codigo,409);
});

test('Estado de cita: el doctor puede cancelar una futura y se informa al paciente', async t => {
  t.mock.method(Cita,'findById',async()=>cita({fecha:'2035-01-01'}));
  t.mock.method(Cita,'findOneAndUpdate',async()=>({...cita({fecha:'2035-01-01'}),estado:'cancelada'}));
  t.mock.method(Usuario,'findById',async()=>({nombre:'Doctor Demo'}));
  const creada=t.mock.method(Notificacion,'create',async datos=>datos);
  const r=await cambiarEstado({estado:'cancelada'});
  assert.equal(r.codigo,200);
  assert.equal(r.datos.cita.estado,'cancelada');
  assert.equal(creada.mock.callCount(),1);
});
