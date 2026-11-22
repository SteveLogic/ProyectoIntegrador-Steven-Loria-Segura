# Sistema de Citas Médicas — Proyecto Integrador 1

Aplicación académica full-stack para administración de usuarios, perfiles médicos, especialidades, disponibilidad, reservas, seguimiento de citas, atención clínica, notificaciones y reportes. **Auditoría técnica del 21 de noviembre de 2026.**

- **Repositorio:** https://github.com/SteveLogic/ProyectoIntegrador-Steven-Loria-Segura
- **Backend:** Node.js 22, Express 5, Mongoose 9, MongoDB, bcryptjs.
- **Frontend:** HTML5, CSS3, Bootstrap 5.3, JavaScript con `fetch` (AJAX) y jQuery en los filtros administrativos; páginas adaptables a escritorio y dispositivos móviles.
- **Pruebas:** `node --test tests/*.test.js` (118 pruebas en la copia auditada; comprobar de nuevo después de fusionar en GitHub).
- **Planificación:** Jira, proyecto KAN.

> **Estado de entrega:** el código se prepara para despliegue, pero **NO** existe aún una URL pública validada en esta auditoría. La recuperación de contraseña por correo permanece deshabilitada porque no hay verificación de identidad; el nuevo estado «no presentada» se incorporó y requiere prueba manual con la BD real. No confundir la auditoría con certificación del 100 % de la consigna.

## 1. Instalación local (PowerShell)

Desde la raíz del repositorio:

```powershell
cd API
npm ci
Copy-Item .env.example .env
```

Editar `API/.env` para apuntar a tu MongoDB local o Atlas, sin publicar contraseñas. Iniciar la API y las páginas web desde **un único servidor**:

```powershell
npm start
```

Abrir:

- Interfaz: http://localhost:3000/login.html
- Salud API: http://localhost:3000/api/prueba
- `Ctrl + C` detiene el servidor.

También se puede utilizar Live Server en `127.0.0.1:5500`; `js/api-config.js` apuntará automáticamente a `http://localhost:3000` al trabajar localmente. Para ello, mantén `npm start` ejecutándose en otra terminal.

**Pruebas automáticas:**

```powershell
cd API
npm test
```

**Nota sobre MongoDB:** las pruebas automatizadas simulan algunas operaciones de BD, por lo que pasar `npm test` no garantiza por sí solo el flujo completo con MongoDB real. Para la demostración hay que usar cuentas y datos de prueba reales. Los scripts de `API/scripts/` permiten comprobar índices e integridad de citas; consulta sus fuentes antes de ejecutarlos sobre una BD compartida.

## 2. Configuración del entorno

Archivo de ejemplo: `API/.env.example`.

| Variable | Uso |
|---|---|
| `PORT` | Puerto del servidor, por defecto 3000. Render puede proporcionarlo automáticamente. |
| `MONGO_URI` | Cadena privada de conexión a MongoDB. Obligatoria para iniciar. |
| `FRONTEND_ORIGINS` | Opcional: dominios permitidos por CORS si el frontend se publica **separado** del backend. |

- **Nunca** incluir `.env` en GitHub ni en el ZIP de entrega.
- La configuración JavaScript pública `js/api-config.js` **no** debe incluir secretos.
- En el **despliegue conjunto**, frontend y API utilizan automáticamente el mismo origen HTTPS.
- Si se alojan por separado, editar `CITAS_API_PUBLICA` en `js/api-config.js` con la URL HTTPS real del backend; añadir el origen HTTPS exacto del frontend a `FRONTEND_ORIGINS`.

## 3. Despliegue recomendado en un solo servicio

La API publica las páginas `login.html`, `registro-paciente.html`, `olvidecontrasena.html`, `restablecercontrasena.html`, `cambio-contrasena.html`, `paciente.html`, `doctor.html` y `administrador.html`, además de sus carpetas `css/`, `img/` y `js/`. No sirve archivos fuente ni plantillas privadas de `API/`.

**Ejemplo con Render y MongoDB Atlas** (comprobar precios, límites y disponibilidad del plan antes de contratar):

1. Crear una instancia MongoDB Atlas de prueba, usuario de BD y reglas de red compatibles con el proveedor de despliegue. No utilizar datos médicos reales.
2. En Render crear un **Web Service** desde la rama `main` del repositorio. **Dejar Root Directory vacío** porque el frontend está fuera de `API/`.
3. Configurar **Build Command:** `cd API && npm ci`.
4. Configurar **Start Command:** `cd API && npm start`.
5. Agregar variable **MONGO_URI** mediante el panel de secretos de Render. `PORT` es administrado por Render.
6. Publicar y revisar la salida del servidor; confirmar conexión MongoDB.
7. Verificar públicamente `https://TU-SERVICIO.onrender.com/api/prueba` y `https://TU-SERVICIO.onrender.com/login.html`.
8. Crear/cargar datos de demostración y realizar login, reserva, reprogramación, consultas y logout **en el entorno publicado**.
9. Anotar las URLs reales, fecha, capturas y credenciales de prueba **por canal privado** para el informe del profesor.

El mismo host puede ofrecer dos URLs públicas distintas (una del frontend y otra del backend). Si el docente exige dominios separados, usar hosting estático aparte y configurar `CITAS_API_PUBLICA` y `FRONTEND_ORIGINS`.

**Limitación de sesiones:** el proyecto utiliza un `Map` en memoria en `API/middleware/sesiones.js`. Al reiniciar la instancia o escalar a múltiples réplicas se pierden las sesiones; esto debe documentarse y es una mejora pendiente para una producción real. No publicar datos médicos personales reales en este prototipo académico.

## 4. Estructura

```text
Proyecto Integrador/
├── API/
│   ├── config/database.js
│   ├── controllers/
│   ├── middleware/sesiones.js
│   ├── models/
│   ├── routes/
│   ├── scripts/
│   ├── tests/
│   ├── utils/
│   ├── .env.example
│   ├── package.json
│   ├── package-lock.json
│   └── server.js
├── css/styles.css
├── img/evidencias/
├── js/api-config.js
├── administrador.html
├── doctor.html
├── paciente.html
├── login.html
├── registro-paciente.html
├── olvidecontrasena.html
├── restablecercontrasena.html
├── cambio-contrasena.html
├── Postman_SistemaCitasMedicas_Auditoria2026.json
├── ThunderClientSistemaCitasMedicas.json  # Colección antigua (Avance 1)
├── AUDITORIA_CONSIGNAS.md
├── PLAN_ENTREGA_30_NOVIEMBRE.md
└── README.md
```

## 5. API REST

| Módulo | Rutas principales | Requisito de acceso |
|---|---|---|
| Salud | `GET /api/prueba` | Público |
| Autenticación | `POST /api/auth/login`, `POST /api/auth/registro-paciente`, `GET/PUT /api/auth/perfil`, `PUT /api/auth/cambiar-password`, `POST /api/auth/logout` | Según operación |
| Recuperación | `POST /api/auth/verificar-correo`, `PUT /api/auth/restablecer-password` | **Deshabilitadas** (503/403) por seguridad |
| Usuarios | `GET/POST /api/usuarios`, `GET/PUT/DELETE /api/usuarios/:id`, `PATCH /api/usuarios/:id/estado`, `PATCH /api/usuarios/:id/rol` | Administrador |
| Doctores | `GET /api/doctores`, `GET /api/doctores/:id`, `POST/PUT/DELETE /api/doctores`, `PUT /api/doctores/:id/especialidad` | Lecturas públicas; cambios administrador |
| Especialidades | `GET/POST /api/especialidades`, `GET/PUT/DELETE /api/especialidades/:id` | Lecturas públicas; cambios administrador |
| Disponibilidad | `GET /api/disponibilidad`, `GET /api/disponibilidad/slots`, `POST/PUT/DELETE /api/disponibilidad` | Consultas públicas; cambios con permisos |
| Citas | `GET/POST /api/citas`, `GET/PUT/DELETE /api/citas/:id`, `PATCH /api/citas/:id/completar`, `PATCH /api/citas/:id/estado` | Sesión, rol y propiedad según operación |
| Atención médica | `POST /api/atenciones`, `GET /api/atenciones/cita/:citaId`, `GET /api/atenciones/paciente/:pacienteId` | Sesión y permisos sobre la información |
| Notificaciones | `GET /api/notificaciones`, `PATCH /api/notificaciones/:id/leida` | Paciente autenticado |

Consulta `Postman_SistemaCitasMedicas_Auditoria2026.json` para **46 solicitudes con cuerpos de ejemplo**. Cambia variables `baseUrl`, emails, contraseñas y ObjectIds a valores reales de demostración. Los ejemplos de DELETE y cambios de rol son destructivos: usar cuentas de prueba. La colección Thunder Client que ya existía corresponde al Avance 1 y **no debe presentarse como final actualizada**.

## 6. Seguridad y limitaciones

- Las contraseñas se almacenan mediante hash bcrypt; **no** deben copiarse a los reportes.
- La API exige Bearer tokens y protege endpoints administrativos; no confiar únicamente en las validaciones de navegador.
- Las cuentas desactivadas no pueden iniciar sesión; el cambio de rol y de estado invalida sus sesiones.
- La recuperación sin verificación de identidad se ha bloqueado. **No volver a habilitar el restablecimiento basado solo en email.** Se requiere correo real con token de un solo uso y expiración para implementar recuperación segura.
- Las sesiones están en memoria y caducan; tienen limitaciones para un despliegue que reinicie o escale.
- Antes de entregar, se deben verificar estados de citas frente a KAN-37 (la consigna Jira menciona **no presentada**, que se incorporó al esquema; falta validar en producción) y funciones marcadas como vista previa.
- No publicar credenciales reales, MONGO_URI, fotografías de pacientes reales ni datos clínicos personales.

## 7. Entregables y estado de la auditoría

La consigna **Versión Final Aplicación Web** requiere: repositorio principal, URL pública del frontend, URL pública del backend, informe técnico final PDF y colección API JSON. La consigna **Tercer Avance de la Bitácora** solicita tareas y épicas en Jira para 12 módulos, estimaciones, responsables, criterios, fechas, reuniones, cambios, incidencias y evidencias de seguimiento.

Ver `AUDITORIA_CONSIGNAS.md` para clasificación requisito por requisito y `PLAN_ENTREGA_30_NOVIEMBRE.md` para prioridades hasta la fecha límite. **No cerrar tareas en Jira solo por la existencia de código**: falta demostrar aceptación y cumplimiento verificable.
