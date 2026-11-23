const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const { esProxima, clasificar } = require('../../js/citas-paciente.js');
const ahora = new Date(2026, 10, 23, 10, 15); // 23 noviembre 2026, 10:15 hora local.
const cita = (fecha, hora, estado = 'pendiente', extra = {}) => ({ fecha, hora, estado, ...extra });

test('KAN-17: cita pendiente futura se muestra como próxima', () => {
  assert.equal(esProxima(cita('2026-11-24', '08:00'), ahora), true);
});

test('KAN-17: cita confirmada de hoy sigue siendo próxima si aún no comienza', () => {
  assert.equal(esProxima(cita('2026-11-23', '10:30', 'confirmada'), ahora), true);
});

test('KAN-17: cita que ya comenzó hoy se incluye en historial', () => {
  assert.equal(esProxima(cita('2026-11-23', '10:00'), ahora), false);
  assert.equal(esProxima(cita('2026-11-23', '09:30', 'confirmada'), ahora), false);
});

test('KAN-17: canceladas futuras y completadas no se mezclan con próximas', () => {
  for (const estado of ['cancelada', 'completada', 'no_presentada']) {
    assert.equal(esProxima(cita('2026-12-01', '11:00', estado), ahora), false, estado);
  }
});

test('KAN-17: datos incompletos o inválidos no se tratan como próximas', () => {
  assert.equal(esProxima(null, ahora), false);
  assert.equal(esProxima(cita('', '09:00'), ahora), false);
  assert.equal(esProxima(cita('2026-12-01', 'xx'), ahora), false);
  assert.equal(esProxima(cita('2026-12-01', '09:00', 'desconocida'), ahora), false);
});

test('KAN-17: futuras se ordenan cronológicamente de más cercana a más lejana', () => {
  const { proximas, historial } = clasificar([
    cita('2026-12-04', '12:30'),
    cita('2026-11-23', '10:30', 'confirmada'),
    cita('2026-11-24', '09:00'),
  ], ahora);
  assert.deepEqual(proximas.map(c => c.hora), ['10:30', '09:00', '12:30']);
  assert.equal(historial.length, 0);
});

test('KAN-17: historial se ordena desde la cita más reciente', () => {
  const { proximas, historial } = clasificar([
    cita('2026-11-01', '08:00', 'completada'),
    cita('2026-11-22', '09:00', 'no_presentada'),
    cita('2026-11-23', '09:00', 'confirmada'),
  ], ahora);
  assert.equal(proximas.length, 0);
  assert.deepEqual(historial.map(c => c.fecha), ['2026-11-23', '2026-11-22', '2026-11-01']);
});

test('KAN-17: cada cita aparece una sola vez y en una sola sección', () => {
  const registros = [
    cita('2026-11-24', '09:00'),
    cita('2026-11-24', '10:00', 'cancelada'),
    cita('2026-11-10', '10:00'),
    cita('2026-11-23', '10:30', 'confirmada'),
  ];
  const { proximas, historial } = clasificar(registros, ahora);
  assert.equal(proximas.length, 2);
  assert.equal(historial.length, 2);
  assert.equal(new Set([...proximas, ...historial]).size, registros.length);
});

test('KAN-17: una lista vacía produce ambas secciones vacías', () => {
  assert.deepEqual(clasificar([], ahora), {proximas: [], historial: []});
});

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'paciente.html'), 'utf8');

test('KAN-17: el HTML tiene dos tablas separadas y carga el clasificador', () => {
  assert.match(html, /src="js\/citas-paciente\.js"/);
  for (const id of ['filasCitasPaciente', 'filasHistorialCitasPaciente', 'contadorProximasCitasPaciente', 'contadorHistorialCitasPaciente', 'sinProximasCitasPaciente', 'sinHistorialCitasPaciente']) {
    assert.equal((html.match(new RegExp(`id="${id}"`, 'g')) || []).length, 1, id);
  }
  assert.match(html, /Próximas citas/);
  assert.match(html, /Historial de citas/);
});

// Ejercitamos el render real de "Mis citas" sin abrir navegador y sin acceder a MongoDB.
function crearEntorno(citas, filtros = {}) {
  const inicio = html.indexOf('    function crearFilaCitaPaciente(');
  const fin = html.indexOf('    async function cargarCitasPaciente()', inicio);
  assert.ok(inicio > -1 && fin > inicio, 'No se encuentra el código de renderizado');
  const elementos = new Map();
  const obtener = id => {
    if (!elementos.has(id)) {
      elementos.set(id, {
        children: [], value: '', textContent: '', hidden: false,
        replaceChildren() { this.children = []; },
        append(...args) { this.children.push(...args); }
      });
    }
    return elementos.get(id);
  };
  function nodo(etiqueta, clase = '', texto = '') {
    return {
      etiqueta, clase, textContent: texto, children: [],
      append(...args) { this.children.push(...args); },
      addEventListener() {}
    };
  }
  const contexto = vm.createContext({
    document: { getElementById: obtener },
    window: { CITAS_PACIENTE: { clasificar: lista => clasificar(lista, ahora) } },
    citasPaciente: citas,
    buscarCitasPaciente: { value: filtros.busqueda || '' },
    estadoCitasPaciente: { value: filtros.estado || '' },
    tablaCitasPaciente: obtener('filasCitasPaciente'),
    normalizarTexto: valor => String(valor || '').toLowerCase(),
    nodo
  });
  vm.runInContext(`${html.slice(inicio, fin)}\nfiltrarCitas();`, contexto);
  return obtener;
}

test('KAN-17: el render no presenta acciones de cambio en citas históricas', () => {
  const obtener = crearEntorno([
    cita('2026-11-22', '09:00', 'pendiente', {doctor: {nombre: 'Doctor Demo'}, especialidad: {nombre:'Pediatría'}}),
    cita('2026-11-24', '09:00', 'confirmada', {doctor: {nombre: 'Doctor Demo'}, especialidad: {nombre:'Pediatría'}})
  ]);
  const futuras = obtener('filasCitasPaciente').children;
  const historial = obtener('filasHistorialCitasPaciente').children;
  assert.equal(futuras.length, 1);
  assert.equal(historial.length, 1);
  assert.deepEqual(futuras[0].children.at(-1).children.map(b => b.textContent), ['Reprogramar', 'Cancelar']);
  assert.equal(historial[0].children.at(-1).textContent, 'Sin acciones');
});

test('KAN-17: muestra mensaje informativo cuando no hay citas', () => {
  const obtener = crearEntorno([]);
  assert.equal(obtener('contadorCitasPaciente').textContent, 'Aún no tienes citas registradas.');
  assert.equal(obtener('sinProximasCitasPaciente').hidden, false);
  assert.equal(obtener('sinHistorialCitasPaciente').hidden, false);
  assert.equal(obtener('resumenProximasCitas').textContent, '0');
});

test('KAN-17: filtros por estado y doctor se aplican a ambas secciones', () => {
  const obtener = crearEntorno([
    cita('2026-11-25', '09:00', 'pendiente', {doctor: {nombre: 'Ana'}}),
    cita('2026-11-25', '10:00', 'confirmada', {doctor: {nombre: 'Laura'}}),
    cita('2026-11-20', '10:00', 'cancelada', {doctor: {nombre: 'Ana'}}),
  ], { busqueda: 'ana', estado: 'pendiente' });
  assert.equal(obtener('filasCitasPaciente').children.length, 1);
  assert.equal(obtener('filasHistorialCitasPaciente').children.length, 0);
  assert.equal(obtener('contadorCitasPaciente').textContent, '1 de 3 citas registradas');
});
