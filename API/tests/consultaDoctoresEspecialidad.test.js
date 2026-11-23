const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// KAN-98: comprobación del filtro REAL del portal, con DOM simulado y sin Atlas.
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'paciente.html'), 'utf8');
const inicio = html.indexOf('    function filtrarDoctores() {');
const fin = html.indexOf('    async function cargarCatalogoMedico()', inicio);
assert.ok(inicio !== -1 && fin > inicio, 'No fue posible encontrar el filtro real de doctores');
const codigoFiltro = html.slice(inicio, fin);

const crearDoctor = (nombre, especialidad, activo = true) => ({
  activo, usuario: { _id: `u-${nombre}`, nombre, rol: 'doctor' },
  especialidad: { _id: especialidad, nombre: especialidad === 'ped' ? 'Pediatría' : 'Cardiología' },
  numeroColegiado: `COL-${nombre}`
});

function nodo(tag, clase, texto) {
  return {
    tag, clase, textContent: texto ?? '', children: [], events: {}, attributes: {},
    classList: { add() {}, remove() {} },
    append(...args) { this.children.push(...args); },
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(name, handler) { this.events[name] = handler; }
  };
}

function escenario({ especialidad = '', busqueda = '', doctores } = {}) {
  const directorio = { children: [], replaceChildren() { this.children = []; }, append(item) { this.children.push(item); } };
  const contador = { textContent: '' };
  const vacio = { hidden: true };
  const filtroEspecialidad = { value: especialidad };
  const filtroDoctor = { value: busqueda };
  const reservaEspecialidad = { value: '' };
  const reservaFecha = { focus() { contexto.enfocado = true; } };
  const selecionados = [];
  const contexto = {
    nodo, directorioDoctores: directorio, contadorDoctores: contador, sinDoctores: vacio,
    filtroEspecialidad, filtroDoctor, reservaEspecialidad, reservaFecha,
    doctoresActivos: doctores ?? [crearDoctor('Doctor Prueba', 'ped'), crearDoctor('Doctor Cardio', 'car')],
    normalizarTexto: texto => String(texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(),
    actualizarDoctoresReserva: id => selecionados.push(id),
    document: {
      querySelectorAll: () => [],
      getElementById: id => id === 'reservarCita' ? { scrollIntoView() { contexto.navegado = true; } } : null
    },
    enfocado: false, navegado: false
  };
  vm.runInNewContext(`${codigoFiltro}\nthis.ejecutarFiltro = filtrarDoctores;`, contexto, { timeout: 1000 });
  return { contexto, directorio, contador, vacio, filtroEspecialidad, filtroDoctor, reservaEspecialidad, selecionados, ejecutar: () => contexto.ejecutarFiltro() };
}

function tarjeta(e, indice = 0) { return e.directorio.children[indice].children[0]; }

test('KAN-98: sin filtro muestra todos los doctores activos del catálogo', () => {
  const e = escenario(); e.ejecutar();
  assert.equal(e.directorio.children.length, 2);
  assert.equal(e.contador.textContent, '2 de 2 doctores activos');
  assert.equal(e.vacio.hidden, true);
});

test('KAN-98: la especialidad pediatría excluye doctores de cardiología', () => {
  const e = escenario({ especialidad: 'ped' }); e.ejecutar();
  assert.equal(e.directorio.children.length, 1);
  assert.match(JSON.stringify(tarjeta(e)), /Doctor Prueba/);
  assert.doesNotMatch(JSON.stringify(tarjeta(e)), /Doctor Cardio/);
});

test('KAN-98: especialidad sin médicos informa que no hay resultados', () => {
  const e = escenario({ especialidad: 'general' }); e.ejecutar();
  assert.equal(e.directorio.children.length, 0);
  assert.equal(e.contador.textContent, '0 de 2 doctores activos');
  assert.equal(e.vacio.hidden, false);
});

test('KAN-98: la búsqueda por nombre admite mayúsculas y acentos', () => {
  const e = escenario({ busqueda: 'PÉDRO', doctores: [crearDoctor('Pedro Ruiz', 'ped'), crearDoctor('Ana Sol', 'ped')] });
  e.ejecutar();
  assert.equal(e.directorio.children.length, 1);
  assert.match(JSON.stringify(tarjeta(e)), /Pedro Ruiz/);
});

test('KAN-98: los filtros combinados especialidad y nombre se aplican juntos', () => {
  const e = escenario({ especialidad: 'ped', busqueda: 'prueba', doctores: [crearDoctor('Doctor Prueba', 'ped'), crearDoctor('Otro Prueba', 'car'), crearDoctor('Ana', 'ped')] });
  e.ejecutar();
  assert.equal(e.directorio.children.length, 1);
  assert.match(JSON.stringify(tarjeta(e)), /Doctor Prueba/);
});

test('KAN-98: el botón de selección conserva la especialidad y el usuario doctor', () => {
  const e = escenario({ especialidad: 'ped' }); e.ejecutar();
  const card = tarjeta(e);
  const boton = card.children[2];
  assert.equal(boton.textContent, 'Seleccionar para cita');
  boton.events.click();
  assert.equal(e.reservaEspecialidad.value, 'ped');
  assert.deepEqual(e.selecionados, ['u-Doctor Prueba']);
  assert.equal(e.contexto.navegado, true);
  assert.equal(e.contexto.enfocado, true);
});

test('KAN-98: el HTML descarta doctores inactivos y especialidades inactivas antes de filtrar', () => {
  assert.match(html, /especialidades\.filter\(e => e\.activo === true && e\._id\)/);
  assert.match(html, /d\.activo === true && d\.usuario\?\.rol === 'doctor'/);
  assert.match(html, /idsEspecialidades\.has\(d\.especialidad\._id\)/);
});

test('KAN-98: limpiar filtros reactiva la lista completa sin crear registros', () => {
  const e = escenario({ especialidad: 'ped', busqueda: 'inexistente' });
  e.ejecutar(); assert.equal(e.directorio.children.length, 0);
  e.filtroEspecialidad.value = ''; e.filtroDoctor.value = '';
  e.ejecutar(); assert.equal(e.directorio.children.length, 2);
  assert.equal(e.vacio.hidden, true);
});
