const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validarAtencion, fechaCitaYaPaso } = require('../utils/validacionAtencion');
const { crearSesion, requerirSesion, requerirDoctor, cerrarSesion } = require('../middleware/sesiones');

const valido = { motivo: 'Consulta ficticia', observaciones: 'Sin molestias inventadas', diagnostico: 'Diagnóstico académico ficticio', indicaciones: '' };

test('Registro válido con campos obligatorios y opcionales', () => {
  const r=validarAtencion(valido);
  assert.equal(r.valido,true);
  assert.equal(r.datos.indicaciones,'');
});
test('Normaliza espacios en campos de texto',()=> {
  assert.equal(validarAtencion({...valido,motivo:'  control  '}).datos.motivo,'control');
});
test('Rechaza campos obligatorios vacíos', () => {
  for(const k of ['motivo','observaciones','diagnostico']) {
    assert.equal(validarAtencion({...valido,[k]:'  '}).valido,false);
  }
});
test('Rechaza campos con tipo incorrecto',()=> {
  assert.equal(validarAtencion({...valido,motivo:42}).valido,false);
  assert.equal(validarAtencion({...valido,indicaciones:42}).valido,false);
});
test('Rechaza campos demasiado largos',()=> {
  for(const [k,n] of [['motivo',501],['observaciones',1001],['diagnostico',501],['indicaciones',501]]) {
    assert.equal(validarAtencion({...valido,[k]:'x'.repeat(n)}).valido,false);
  }
});
test('Rechaza cuerpos nulos/arrays',()=> {
  assert.equal(validarAtencion(null).valido,false);
  assert.equal(validarAtencion([]).valido,false);
});
test('Una cita pasada es elegible, una futura no',()=> {
  const ahora=Date.parse('2026-11-15T12:00:00-06:00');
  assert.equal(fechaCitaYaPaso({fecha:'2026-11-14',hora:'09:00'},ahora),true);
  assert.equal(fechaCitaYaPaso({fecha:'2026-11-16',hora:'09:00'},ahora),false);
  assert.equal(fechaCitaYaPaso({fecha:'2026-11-15',hora:'12:00'},ahora),true);
});
test('Rechaza formato inválido de cita',()=> {
  assert.equal(fechaCitaYaPaso({fecha:'15/11/2026',hora:'14:00'}),false);
  assert.equal(fechaCitaYaPaso({fecha:'2026-11-15',hora:'12:61'}),false);
});
function resSimulado(){
 const res={codigo:200,cuerpo:null,status(v){this.codigo=v;return this;},json(v){this.cuerpo=v;return this;}};
 return res;
}
function procesarAuth(token){
 let nextLlamado=false;
 const req={get:()=>token?`Bearer ${token}`:''};
 const res=resSimulado();
 requerirSesion(req,res,()=>{nextLlamado=true;});
 return {req,res,nextLlamado};
}
test('Sesión nueva autoriza al doctor y exige rol',()=> {
 const token=crearSesion({_id:'abc123',rol:'doctor'});
 const r=procesarAuth(token);
 assert.equal(r.nextLlamado,true);
 assert.equal(r.req.sesion.usuarioId,'abc123');
 let ok=false;
 requerirDoctor(r.req,resSimulado(),()=>{ok=true;});
 assert.equal(ok,true);
});
test('Rechaza token faltante o mal formado',()=> {
 assert.equal(procesarAuth('').res.codigo,401);
 assert.equal(procesarAuth('invalido').res.codigo,401);
});
test('Paciente no puede ejecutar acciones del doctor',()=> {
 const token=crearSesion({_id:'paciente123',rol:'paciente'});
 const r=procesarAuth(token);
 const res=resSimulado();let ok=false;
 requerirDoctor(r.req,res,()=>{ok=true;});
 assert.equal(ok,false);
 assert.equal(res.codigo,403);
});
test('Cerrar sesión invalida el token',()=> {
 const token=crearSesion({_id:'abc123',rol:'doctor'});
 const r=procesarAuth(token);
 cerrarSesion(r.req,resSimulado());
 assert.equal(procesarAuth(token).res.codigo,401);
});
