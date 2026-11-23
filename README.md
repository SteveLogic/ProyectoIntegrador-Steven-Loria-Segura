# Sistema de Citas Médicas — Proyecto Integrador 1

Aplicación académica **full-stack** para usuarios, perfiles médicos, especialidades, disponibilidad semanal, reserva y seguimiento de citas, atención de demostración, notificaciones y reportes. Usa únicamente **identidades y datos clínicos ficticios**; no está destinada al uso médico real.

- **Repositorio GitHub:** https://github.com/SteveLogic/ProyectoIntegrador-Steven-Loria-Segura
- **Sitio publicado (frontend):** https://sistema-citas-medicas-88xk.onrender.com/login.html
- **API REST publicada (salud):** https://sistema-citas-medicas-88xk.onrender.com/api/prueba
- **Plataforma:** Render (un servicio para frontend y backend) + MongoDB Atlas.
- **Gestión de proyecto:** Jira, proyecto `KAN` (12 módulos/épicas).
- **Tecnologías:** Node.js 22+, Express 5, Mongoose 9, MongoDB, bcryptjs; HTML5, CSS3, Bootstrap 5.3, JavaScript `fetch`/AJAX y jQuery.

**Estado documentado (23/11/2026):** el usuario verificó el despliegue de la rama `main` en Render (commit `45da2ac`, estado *Live*) y reportó **182/182 pruebas automatizadas aprobadas** en su computadora. Son resultados históricos de esa verificación, **no una garantía de disponibilidad permanente** ni una certificación clínica. La recuperación segura mediante enlace enviado por correo requiere configurar Resend (sección 6); sin credenciales de correo permanecerá deshabilitada.

## 1. Acceso y ejecución local

Desde PowerShell, en la raíz del proyecto:

```powershell
cd API
npm ci
Copy-Item .env.example .env
```

Configurar `API/.env` con la conexión a una base MongoDB de prueba, **sin subirla a GitHub**. Después:

```powershell
npm start
```

- Interfaz local: http://localhost:3000/login.html
- Comprobación local de API: http://localhost:3000/api/prueba
- Detener el servidor: `Ctrl + C`.

El mismo proceso Express ofrece páginas HTML, archivos estáticos y API. Si se usa Live Server para el frontend local, `js/api-config.js` apunta a `http://localhost:3000` y la API debe continuar ejecutándose en otra terminal.

### Pruebas automatizadas

```powershell
cd API
npm test
```

Se registraron **182 pruebas aprobadas, 0 fallidas** en la verificación del 23/11/2026. La suite usa simulaciones/mocks para muchos escenarios; las pruebas automatizadas por sí solas no sustituyen la comprobación funcional de Render y MongoDB Atlas. Los scripts de `API/scripts/` verifican integridad e índices; revisar su contenido antes de ejecutarlos en una base compartida.

## 2. Variables de entorno y seguridad

Archivo guía: `API/.env.example`.

| Variable | Uso |
|---|---|
| `PORT` | Puerto HTTP de la API; 3000 en local; Render lo proporciona al ejecutar el servicio. |
| `MONGO_URI` | URI privada de la base de datos MongoDB; obligatoria. |
| `FRONTEND_ORIGINS` | Opcional: orígenes HTTPS autorizados por CORS si el frontend se aloja por separado. |
| `RESEND_API_KEY` | Clave privada del proveedor de correo Resend (obligatoria para recuperación). |
| `RESET_EMAIL_FROM` | Correo remitente verificado en Resend. |
| `APP_PUBLIC_URL` | URL pública HTTPS de la aplicación sin ruta ni parámetros. |

- No incluir `API/.env`, tokens, contraseñas ni URI de Atlas con credenciales en Git, capturas, Postman exportado o informe público.
- Si una contraseña o URI se expuso previamente, **rotar la credencial en MongoDB Atlas** y actualizar `MONGO_URI` tanto en Render como en la máquina local.
- `js/api-config.js` es configuración pública: nunca poner secretos en ese archivo.
- Los tokens Bearer identifican sesiones efímeras con caducidad. La autorización real depende de los controles de la API y del rol; `sessionStorage` no sustituye esa validación.
- En `API/middleware/sesiones.js` las sesiones se conservan en memoria del proceso: se pierden al reiniciar o reactivar la instancia. No se diseñó para múltiples réplicas ni para un servicio clínico real.

## 3. Despliegue utilizado: Render + MongoDB Atlas

Se utiliza **un mismo servicio Render** para servir frontend y API bajo `https://sistema-citas-medicas-88xk.onrender.com`:

- `GET /login.html` presenta la interfaz de inicio de sesión.
- `GET /api/prueba` devuelve el mensaje JSON de comprobación de la API.
- Las rutas protegidas exigen sesión/token y comprueban roles y permisos.

Configuración reproducible (consulta también `render.yaml`):

1. Vincular el repositorio GitHub al Web Service de Render, rama `main`.
2. Dejar **Root Directory** sin especificar; los HTML están en la raíz del repositorio.
3. **Build Command:** `cd API && npm ci`.
4. **Start Command:** `cd API && npm start`.
5. Configurar `MONGO_URI` en **Environment** de Render (secreto, no incluir en repositorio).
6. Permitir acceso desde las IP de salida correspondientes en el panel de acceso de MongoDB Atlas; preferir permisos de red mínimos.
7. Validar el estado *Live*, `GET /api/prueba`, inicio de sesión, listado y flujos con datos ficticios.

**Nota:** en el plan gratuito, Render puede suspender el servicio por inactividad; la primera solicitud podría tardar más. Una reactivación también invalida las sesiones guardadas en memoria.

## 4. Organización del proyecto

```text
Proyecto Integrador/
├── API/
│   ├── config/            # Conexión MongoDB
│   ├── controllers/       # Lógica y validaciones
│   ├── middleware/        # Sesiones y roles
│   ├── models/            # Esquemas Mongoose
│   ├── routes/            # Endpoints Express
│   ├── scripts/           # Verificaciones auxiliares
│   ├── tests/             # Pruebas automatizadas
│   ├── utils/             # Reglas de horarios, notificaciones y validaciones
│   ├── .env.example       # Variables de ejemplo (sin secretos)
│   └── server.js
├── css/styles.css
├── img/evidencias/        # Capturas de pantallas para documentación
├── js/api-config.js
├── js/citas-paciente.js
├── login.html
├── registro-paciente.html
├── olvidecontrasena.html
├── restablecercontrasena.html
├── cambio-contrasena.html
├── paciente.html
├── doctor.html
├── administrador.html
├── Postman_SistemaCitasMedicas_Auditoria2026.json
├── ThunderClientSistemaCitasMedicas.json # Colección histórica, no la final
├── render.yaml
└── README.md
```

## 5. Mapa de módulos y API

| Módulo | Principales endpoints | Permisos |
|---|---|---|
| Salud | `GET /api/prueba` | Público |
| Autenticación | `POST /api/auth/login`, `POST /api/auth/registro-paciente`, `GET/PUT /api/auth/perfil`, `PUT /api/auth/cambiar-password`, `POST /api/auth/logout` | Según operación |
| Recuperación | `POST /api/auth/verificar-correo`, `PUT /api/auth/restablecer-password` | **Recuperación por enlace temporal**; requiere configurar envío de correo (Resend) |
| Usuarios | `GET/POST /api/usuarios`, `GET/PUT/DELETE /api/usuarios/:id`, `PATCH /api/usuarios/:id/estado`, `PATCH /api/usuarios/:id/rol` | Administrador |
| Doctores | `GET/POST /api/doctores`, `GET/PUT/DELETE /api/doctores/:id`, `PUT /api/doctores/:id/especialidad`, `PATCH /api/doctores/:id/estado` | Lecturas públicas; cambios administrador |
| Especialidades | `GET/POST /api/especialidades`, `GET/PUT/DELETE /api/especialidades/:id` | Lecturas públicas; cambios administrador |
| Disponibilidad | `GET /api/disponibilidad`, `GET /api/disponibilidad/slots`, `POST /api/disponibilidad`, `PUT/DELETE /api/disponibilidad/:id` | Consultas públicas; cambios con sesión y permisos |
| Citas | `GET/POST /api/citas`, `GET/PUT/DELETE /api/citas/:id`, `PATCH /api/citas/:id/completar`, `PATCH /api/citas/:id/estado` | Sesión, rol y pertenencia de la cita |
| Atenciones | `POST /api/atenciones`, `GET /api/atenciones/cita/:citaId`, `GET /api/atenciones/paciente/:pacienteId` | Sesión y permisos |
| Notificaciones | `GET /api/notificaciones`, `PATCH /api/notificaciones/:id/leida` | Paciente autenticado |
| Reportes | Indicadores y filtros generados en `administrador.html` a partir de `GET /api/citas` | Administrador; sin API de reportes independiente |

### Colección de pruebas Postman

Archivo de entrega: **`Postman_SistemaCitasMedicas_Auditoria2026.json`**, actualizado a **48 solicitudes**, incluyendo activación y desactivación de perfiles médicos por `PATCH /api/doctores/:id/estado`.

1. Importar la colección en Postman.
2. Por seguridad, `baseUrl` vale `http://localhost:3000` por defecto. La variable `renderBaseUrl` contiene `https://sistema-citas-medicas-88xk.onrender.com`. Para probar el despliegue, copiar ese valor a `baseUrl`.
3. Definir `adminEmail`, `adminPassword`, `doctorEmail`, `doctorPassword`, `pacienteEmail` y `pacientePassword` con **cuentas ficticias**. Preferir un entorno privado de Postman para los secretos; no exportarlos.
4. Obtener los tokens al iniciar sesión y completar las variables `adminToken`, `doctorToken` y `pacienteToken` según corresponda. Usar ObjectIds de datos ficticios para cada solicitud.
5. **Advertencia:** `POST`, `PUT`, `PATCH` y `DELETE` pueden crear, alterar, cancelar o desactivar datos. Solo probarlos con registros creados para QA.

La colección Thunder Client incluida corresponde a una etapa anterior; se mantiene como antecedente, no como entrega principal.

## 6. Restricciones conocidas y alcance académico

- **Recuperación de contraseña:** `POST /api/auth/verificar-correo` envía un enlace de un solo uso que expira en 20 minutos, y `PUT /api/auth/restablecer-password` exige el token recibido por correo. El token solo se almacena como hash en MongoDB, caduca y se consume de forma atómica al cambiar la clave. El correo registrado no se revela en la respuesta. **En Render se debe configurar `RESEND_API_KEY`, `RESET_EMAIL_FROM` y `APP_PUBLIC_URL`; de lo contrario responde HTTP 503**. Este flujo solo debe probarse con cuentas ficticias y correos controlados.
- **Sesiones:** el almacenamiento temporal en memoria se pierde al reiniciar Render; esto obliga a iniciar sesión de nuevo. Para una solución real se necesita un almacén duradero y políticas adicionales.
- **Uso de datos:** solo información ficticia. Este proyecto **no** ofrece las protecciones ni certificaciones necesarias para tratar información médica real.
- **Reportes:** se calculan en frontend a partir de las citas disponibles para el administrador, sin exportación y sin endpoint de reportes independiente.
- **Pruebas:** muchos escenarios se simulan; validar manualmente en Render los flujos más relevantes con cuentas de prueba.

## 7. Requisitos de entrega y documentación pendiente

La **Versión Final e Informe Final de la Aplicación Web** pide: repositorio principal limpio, URL funcional de frontend y API, pruebas con evidencia, informe técnico final **PDF** y colección ejecutable Postman/Thunder Client. El PDF debe incluir portada e introducción; objetivos y alcance frente a Jira; diagramas de componentes y de MongoDB/Mongoose; matriz de requisitos, endpoints y vistas; reporte de pruebas y errores; manual de usuario y despliegue con capturas; conclusiones y lecciones aprendidas.

La consigna del **Tercer Avance de Bitácora** pide evidencias de Jira para 12 módulos/épicas, tareas y responsables, fechas, estimaciones, criterios de aceptación, historial, reuniones, cambios, inconvenientes y sus soluciones. **Conservar los comentarios históricos**, porque evidencian el trabajo progresivo.

Pendiente para la entrega final: preparar y revisar el informe técnico en PDF. La recuperación de contraseña se implementó y se probó con mocks, pero su funcionamiento real en Render exige configurar el proveedor de correo y completar una prueba de extremo a extremo con una cuenta de demostración.

### Configurar correo de recuperación (KAN-33)

1. Crear una cuenta en https://resend.com/ y verificar el dominio del remitente. En modo prueba, Resend puede restringir los destinatarios permitidos.
2. Crear una API key restringida al envío y configurar `RESEND_API_KEY` en las variables privadas de Render y en `API/.env` local (opcional).
3. Definir `RESET_EMAIL_FROM`, por ejemplo `Sistema de Citas <no-reply@dominio-verificado.com>`, y `APP_PUBLIC_URL=https://sistema-citas-medicas-88xk.onrender.com`.
4. Reiniciar/republicar Render, utilizar una cuenta académica con correo real controlado y verificar recepción, caducidad, uso único y acceso con la nueva contraseña.
5. La tasa de solicitudes se limita por IP/correo en memoria del proceso, suficiente para demostración de una instancia; en producción multirréplica sería necesario un limitador compartido. Nunca usar el correo por sí solo como prueba de identidad.
