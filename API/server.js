require('dotenv').config();
const path = require('node:path');
const express = require('express');
const cors = require('cors');
const conectarDB = require('./config/database');

const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('X-Frame-Options', 'DENY');
  next();
});

// El despliegue conjunto usa el mismo origen; para hosting separado configurar
// FRONTEND_ORIGINS con la(s) URL(s) del sitio, separadas por coma.
const permitidos = (process.env.FRONTEND_ORIGINS || '')
  .split(',').map(s => s.trim()).filter(Boolean);
function origenPermitido(origen) {
  if (!origen) return true; // Thunder Client / Postman / curl
  if (permitidos.includes(origen)) return true;
  try {
    const url = new URL(origen);
    return ['localhost', '127.0.0.1'].includes(url.hostname) &&
      ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}
app.use(cors({ origin(origen, callback) { callback(null, origenPermitido(origen)); } }));
app.use(express.json({ limit: '64kb' }));

app.use('/api/usuarios', require('./routes/usuarioRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/especialidades', require('./routes/especialidadRoutes'));
app.use('/api/citas', require('./routes/citaRoutes'));
app.use('/api/doctores', require('./routes/doctorRoutes'));
app.use('/api/disponibilidad', require('./routes/disponibilidadRoutes'));
app.use('/api/atenciones', require('./routes/atencionRoutes'));
app.use('/api/notificaciones', require('./routes/notificacionRoutes'));
app.get('/api/prueba', (req, res) => res.json({
  mensaje: 'API del Sistema de Citas Médicas funcionando'
}));

// Publicar SOLO vistas y recursos permitidos: nunca exponer API/.env ni el código fuente.
const raizWeb = path.resolve(__dirname, '..');
const paginas = new Set([
  'login.html', 'registro-paciente.html', 'olvidecontrasena.html',
  'restablecercontrasena.html', 'cambio-contrasena.html',
  'paciente.html', 'doctor.html', 'administrador.html'
]);
app.use('/css', express.static(path.join(raizWeb, 'css'), { dotfiles: 'deny' }));
app.use('/img', express.static(path.join(raizWeb, 'img'), { dotfiles: 'deny' }));
app.use('/js', express.static(path.join(raizWeb, 'js'), { dotfiles: 'deny' }));
app.get('/', (req, res) => res.redirect('/login.html'));
app.get('/:pagina.html', (req, res) => {
  const nombre = `${req.params.pagina}.html`;
  if (!paginas.has(nombre)) return res.sendStatus(404);
  return res.sendFile(path.join(raizWeb, nombre));
});

async function iniciarServidor() {
  const puerto = process.env.PORT || 3000;
  try {
    if (!process.env.MONGO_URI) throw new Error('Falta configurar MONGO_URI.');
    await conectarDB();
    app.listen(puerto, '0.0.0.0', () => {
      console.log(`Servidor ejecutándose en el puerto ${puerto}`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exitCode = 1;
  }
}
if (require.main === module) iniciarServidor();
module.exports = app;
