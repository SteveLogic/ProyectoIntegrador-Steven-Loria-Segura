// Reglas puras que también se pueden probar sin MongoDB.
const LIMITES = { motivo: 500, observaciones: 1000, diagnostico: 500, indicaciones: 500 };
function validarAtencion(cuerpo) {
  if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) {
    return { valido: false, mensaje: 'El registro de atención debe ser un objeto JSON.' };
  }
  const datos = {};
  for (const [campo, limite] of Object.entries(LIMITES)) {
    const valor = cuerpo[campo];
    if (campo !== 'indicaciones' && (typeof valor !== 'string' || !valor.trim())) {
      return { valido: false, mensaje: `El campo ${campo} es obligatorio.` };
    }
    if (campo === 'indicaciones' && valor != null && typeof valor !== 'string') {
      return { valido: false, mensaje: 'El campo indicaciones debe ser texto.' };
    }
    datos[campo] = typeof valor === 'string' ? valor.trim() : '';
    if (datos[campo].length > limite) {
      return { valido: false, mensaje: `El campo ${campo} supera el máximo de ${limite} caracteres.` };
    }
  }
  return { valido: true, datos };
}

function fechaCitaYaPaso(cita, fechaActual = Date.now()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cita?.fecha || '') ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(cita?.hora || '')) return false;
  const marca = Date.parse(`${cita.fecha}T${cita.hora}:00-06:00`);
  return Number.isFinite(marca) && marca <= fechaActual;
}
module.exports = { validarAtencion, fechaCitaYaPaso };
