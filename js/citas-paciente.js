/* KAN-17: clasificacion de citas para las vistas del paciente. */
(function (raiz) {
  'use strict';

  const ESTADOS_VIGENTES = new Set(['pendiente', 'confirmada']);

  function esProxima(cita, ahora = new Date()) {
    if (!cita || !ESTADOS_VIGENTES.has(cita.estado) ||
        typeof cita.fecha !== 'string' || typeof cita.hora !== 'string') {
      return false;
    }

    // Fecha y hora de la clinica, expresadas en la hora local del navegador.
    // Las citas canceladas/completadas/no presentadas siempre van al historial.
    const inicio = new Date(`${cita.fecha}T${cita.hora}:00`);
    return Number.isFinite(inicio.getTime()) && inicio.getTime() > ahora.getTime();
  }

  function clasificar(citas, ahora = new Date()) {
    const proximas = [];
    const historial = [];

    for (const cita of Array.isArray(citas) ? citas : []) {
      (esProxima(cita, ahora) ? proximas : historial).push(cita);
    }

    const clave = cita => `${cita.fecha || ''}T${cita.hora || ''}`;
    proximas.sort((a, b) => clave(a).localeCompare(clave(b)));
    historial.sort((a, b) => clave(b).localeCompare(clave(a)));
    return { proximas, historial };
  }

  const api = { esProxima, clasificar };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (raiz) raiz.CITAS_PACIENTE = api;
})(typeof window === 'undefined' ? null : window);
