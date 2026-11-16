// Sesiones efímeras para la demostración académica local.
// Se invalidan al reiniciar Node.js: el usuario debe volver a iniciar sesión.
const crypto = require('node:crypto');
const sesiones = new Map();
const DURACION_MS = 2 * 60 * 60 * 1000;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function crearSesion(usuario) {
  const ahora = Date.now();
  for (const [clave, datos] of sesiones) {
    if (datos.vence <= ahora) sesiones.delete(clave);
  }
  const token = crypto.randomBytes(32).toString('hex');
  sesiones.set(hashToken(token), {
    usuarioId: String(usuario._id),
    rol: usuario.rol,
    vence: ahora + DURACION_MS
  });
  return token;
}

function requerirSesion(req, res, next) {
  const coincidencia = /^Bearer ([a-f0-9]{64})$/.exec(req.get('Authorization') || '');
  if (!coincidencia) return res.status(401).json({ mensaje: 'Inicia sesión nuevamente para acceder a esta función.' });
  const clave = hashToken(coincidencia[1]);
  const sesion = sesiones.get(clave);
  if (!sesion || sesion.vence <= Date.now()) {
    sesiones.delete(clave);
    return res.status(401).json({ mensaje: 'Tu sesión expiró. Vuelve a iniciar sesión.' });
  }
  req.sesion = sesion;
  req.claveSesion = clave;
  next();
}

function requerirDoctor(req, res, next) {
  if (req.sesion?.rol !== 'doctor') {
    return res.status(403).json({ mensaje: 'Solo un doctor puede realizar esta operación.' });
  }
  next();
}

function cerrarSesion(req, res) {
  sesiones.delete(req.claveSesion);
  res.json({ mensaje: 'Sesión cerrada.' });
}

module.exports = { crearSesion, requerirSesion, requerirDoctor, cerrarSesion };
