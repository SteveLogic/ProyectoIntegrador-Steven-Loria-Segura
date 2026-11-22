/* Configuración del frontend: no colocar contraseñas ni claves aquí.
   En el despliegue conjunto, frontend y API comparten el mismo dominio.
   Si el frontend vive en otro hosting, definir CITAS_API_PUBLICA con la URL de la API. */
(function () {
  'use strict';
  const local = ['localhost', '127.0.0.1'].includes(window.location.hostname) ||
    window.location.protocol === 'file:';
  // Ejemplo para hosting separado: 'https://mi-api.onrender.com'
  const CITAS_API_PUBLICA = '';
  const predeterminada = local ? 'http://localhost:3000' : window.location.origin;
  window.CITAS_API_ORIGIN = (CITAS_API_PUBLICA || predeterminada).replace(/\/+$/, '');
})();
