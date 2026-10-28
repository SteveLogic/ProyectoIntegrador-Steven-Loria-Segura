# Sistema de Citas Médicas — Proyecto Integrador 1

Aplicación web académica para la gestión de usuarios, perfiles médicos, especialidades y citas. Incluye interfaces en HTML, Bootstrap y JavaScript y una API REST desarrollada con Node.js, Express, Mongoose y MongoDB.

**Estado del proyecto (28 de octubre de 2026):** prototipo académico en desarrollo. La API REST dispone de endpoints para Usuarios, Autenticación, Especialidades, Citas y Doctores, incluida la reasignación de la especialidad profesional de un doctor. Se realizaron pruebas manuales con Thunder Client de las operaciones principales y sus respuestas de error. La colección de pruebas se volvió a exportar localmente con las solicitudes nuevas; **esta versión y los cambios del backend están pendientes de publicar en GitHub**. Siguen pendientes las interfaces completas de gestión y reserva y los controles necesarios para un despliegue seguro.

## 1. Tecnologías utilizadas

- **Frontend:** HTML5, Bootstrap 5, JavaScript y `sessionStorage`.
- **Backend:** Node.js, Express, Mongoose, dotenv, cors y bcryptjs.
- **Base de datos:** MongoDB (configurada localmente en el entorno de desarrollo).
- **Pruebas de API:** Thunder Client (extensión para VS Code).
- **Control de versiones y planificación:** Git, GitHub y Jira.

## 2. Organización del repositorio

```text
Proyecto Integrador/
├── API/
│   ├── config/
│   │   └── database.js
│   ├── controllers/
│   │   ├── usuarioController.js
│   │   ├── especialidadController.js
│   │   ├── citaController.js
│   │   └── doctorController.js
│   ├── models/
│   │   ├── Usuario.js
│   │   ├── Especialidad.js
│   │   ├── Cita.js
│   │   └── Doctor.js
│   ├── routes/
│   │   ├── usuarioRoutes.js
│   │   ├── especialidadRoutes.js
│   │   ├── citaRoutes.js
│   │   ├── doctorRoutes.js
│   │   └── authRoutes.js
│   ├── .env.example
│   ├── package.json
│   ├── package-lock.json
│   └── server.js
├── login.html
├── olvidecontrasena.html
├── restablecercontrasena.html
├── paciente.html
├── doctor.html
├── administrador.html
├── .gitignore
├── ThunderClientSistemaCitasMedicas.json
└── README.md
```

- **`routes/`:** define los endpoints HTTP y dirige las peticiones a las funciones correspondientes.
- **`controllers/`:** procesa las solicitudes, aplica reglas y validaciones y devuelve respuestas JSON.
- **`models/`:** define los esquemas de Mongoose y permite consultar o modificar MongoDB.
- **`config/database.js`:** establece la conexión a MongoDB antes de que el servidor comience a escuchar solicitudes.

`node_modules/` y `.env` se crean o mantienen **localmente** y no deben subirse al repositorio. El archivo `ThunderClientSistemaCitasMedicas.json` se volvió a exportar en el entorno local para incorporar las pruebas de asignación de especialidades; falta incorporar esa nueva versión mediante un commit y publicarla en GitHub.

## 3. Instalación y ejecución local

### Requisitos previos

1. Tener instalado **Node.js y npm**.
2. Tener **MongoDB Server** instalado y en ejecución, o disponer de otra instancia MongoDB a la que conectarse.
3. Tener acceso al repositorio GitHub y, opcionalmente, VS Code con Thunder Client.

### Paso 1. Descargar el código

Clonar el repositorio:

```powershell
git clone https://github.com/SteveLogic/ProyectoIntegrador-Steven-Loria-Segura.git
cd ProyectoIntegrador-Steven-Loria-Segura
```

Si el proyecto ya está descargado y abierto en VS Code, basta con abrir una terminal en la carpeta raíz del repositorio.

### Paso 2. Instalar las dependencias

Desde la raíz del proyecto:

```powershell
cd API
npm install
```

Las dependencias se instalan utilizando el `package.json` de la carpeta `API`.

### Paso 3. Configurar las variables de entorno

Dentro de `API`, copiar la plantilla:

```powershell
Copy-Item .env.example .env
```

La configuración de ejemplo es:

```dotenv
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/Proyecto_Integrador
```

Cambiar `MONGO_URI` si se utiliza una instancia distinta. El archivo `.env` no debe incluirse en commits ni compartirse con credenciales reales.

### Paso 4. Iniciar MongoDB y el servidor

Con MongoDB disponible, ejecutar desde `API`:

```powershell
npm start
```

Salida esperada:

```text
Conectado correctamente a MongoDB
Servidor ejecutándose en el puerto 3000
```

Para detener el servidor, presionar `Ctrl + C`. Si se realizan cambios en el backend, reiniciar `npm start` para aplicarlos.

### Paso 5. Comprobar que la API responde

Abrir la siguiente URL o realizar una petición GET desde Thunder Client:

```text
http://localhost:3000/api/prueba
```

Respuesta esperada:

```json
{
  "mensaje": "API del Sistema de Citas Médicas funcionando"
}
```

**Nota:** MongoDB mantiene los datos localmente; clonar el repositorio no copia los usuarios, citas y especialidades existentes en otra computadora. Para probar Citas, primero se deben crear los registros relacionados.

## 4. Endpoints disponibles

**URL base:** `http://localhost:3000`.

`/:id` representa un identificador MongoDB ObjectId válido, por ejemplo el valor `_id` devuelto al crear un registro.

### 4.1. Usuarios — `/api/usuarios`

| Método | URL | Parámetros / cuerpo JSON | Función |
|---|---|---|---|
| GET | `/api/usuarios` | Ninguno | Listar usuarios sin mostrar contraseñas. |
| GET | `/api/usuarios/:id` | `id` en la URL | Consultar un usuario por ID. |
| POST | `/api/usuarios` | `nombre`, `email`, `password`, `rol` | Crear un usuario; la contraseña se guarda mediante hash bcrypt. |
| PUT | `/api/usuarios/:id` | `id` y al menos uno de `nombre`, `email` | Actualizar nombre o correo electrónico. |
| DELETE | `/api/usuarios/:id` | `id` en la URL | Eliminar físicamente un usuario. |

Roles admitidos: `paciente`, `doctor` y `administrador`.

**Ejemplo POST `/api/usuarios`:**

```json
{
  "nombre": "Paciente de Prueba",
  "email": "paciente.demo@example.com",
  "password": "ClaveDemo123!",
  "rol": "paciente"
}
```

**Ejemplo PUT `/api/usuarios/:id`:**

```json
{
  "nombre": "Paciente Actualizado",
  "email": "paciente.actualizado@example.com"
}
```

### 4.2. Autenticación — `/api/auth`

| Método | URL | Cuerpo JSON | Función |
|---|---|---|---|
| POST | `/api/auth/login` | `email`, `password`, `rol` | Verificar las credenciales y el rol. |
| POST | `/api/auth/verificar-correo` | `email` | Consultar si existe una cuenta con ese correo. |
| PUT | `/api/auth/restablecer-password` | `email`, `nuevaPassword` | Sustituir la contraseña del usuario indicado. **Flujo académico inseguro; pendiente de protección.** |

**Ejemplo POST `/api/auth/login`:**

```json
{
  "email": "paciente.demo@example.com",
  "password": "ClaveDemo123!",
  "rol": "paciente"
}
```

**Ejemplo POST `/api/auth/verificar-correo`:**

```json
{
  "email": "paciente.demo@example.com"
}
```

**Ejemplo PUT `/api/auth/restablecer-password`:**

```json
{
  "email": "paciente.demo@example.com",
  "nuevaPassword": "OtraClaveDemo123!"
}
```

**Advertencia de seguridad:** en la implementación actual, `restablecer-password` no exige prueba de posesión del correo ni token temporal; conocer un correo es suficiente para solicitar un cambio de contraseña. No debe desplegarse en Internet ni utilizarse con cuentas reales hasta corregir ese flujo. El login devuelve información básica del usuario, pero no entrega JWT ni establece una sesión segura del servidor.

### 4.3. Especialidades médicas — `/api/especialidades`

| Método | URL | Parámetros / cuerpo JSON | Función |
|---|---|---|---|
| GET | `/api/especialidades` | Ninguno | Listar especialidades, incluidas las inactivas. |
| GET | `/api/especialidades/:id` | `id` en la URL | Consultar una especialidad. |
| POST | `/api/especialidades` | `nombre` obligatorio; `descripcion` opcional | Crear una especialidad. |
| PUT | `/api/especialidades/:id` | `id`, `nombre` y/o `descripcion` | Actualizar una especialidad. |
| DELETE | `/api/especialidades/:id` | `id` en la URL | Desactivar (`activo: false`), sin borrar el registro. |

**Ejemplo POST `/api/especialidades`:**

```json
{
  "nombre": "Medicina General",
  "descripcion": "Atención médica general"
}
```

**Ejemplo PUT `/api/especialidades/:id`:**

```json
{
  "nombre": "Medicina Familiar",
  "descripcion": "Atención integral de pacientes y familias"
}
```

### 4.4. Citas médicas — `/api/citas`

| Método | URL | Parámetros / cuerpo JSON | Función |
|---|---|---|---|
| GET | `/api/citas` | Ninguno | Listar citas con datos relacionados del paciente, doctor y especialidad (`populate`). |
| GET | `/api/citas/:id` | `id` en la URL | Consultar una cita específica. |
| POST | `/api/citas` | `paciente`, `doctor`, `especialidad`, `fecha`, `hora`; `motivo` opcional | Registrar cita con validación de roles, especialidad activa y conflicto de horario. |
| PUT | `/api/citas/:id` | `id`, `fecha`, `hora` | Reprogramar una cita pendiente o confirmada, verificando conflictos. |
| DELETE | `/api/citas/:id` | `id` en la URL | Cancelación lógica (`estado: "cancelada"`). |

En POST, `paciente` y `doctor` son IDs de usuarios con el rol correspondiente; `especialidad` es el ID de una especialidad activa.

**Ejemplo POST `/api/citas`:**

```json
{
  "paciente": "ID_REAL_DEL_PACIENTE",
  "doctor": "ID_REAL_DEL_DOCTOR",
  "especialidad": "ID_REAL_DE_LA_ESPECIALIDAD",
  "fecha": "2026-11-10",
  "hora": "10:00",
  "motivo": "Consulta médica de prueba"
}
```

Sustituir los tres marcadores por los `_id` reales de la base de datos antes de enviar el POST. La fecha debe usar el formato `AAAA-MM-DD` y la hora `HH:mm` (24 horas).

**Ejemplo PUT `/api/citas/:id`:**

```json
{
  "fecha": "2026-11-11",
  "hora": "11:00"
}
```

**Reglas implementadas:** no permite asignar un paciente/doctor con rol incorrecto, utilizar especialidades inactivas, duplicar en condiciones normales una reserva no cancelada del mismo doctor/fecha/hora, reprogramar citas completadas o canceladas, ni cancelar una cita ya cancelada o completada.

**Límites actuales:** la fecha se valida por patrón, no por existencia real del día o por ser futura; todavía no se compara la reserva con una agenda/disponibilidad registrada. La comprobación de conflictos no es una garantía transaccional frente a solicitudes simultáneas.

### 4.5. Doctores — `/api/doctores`

Este módulo administra los **perfiles profesionales de los doctores**. Cada perfil está asociado a un usuario existente con rol `doctor` y a **una especialidad médica**. El perfil conserva datos como el número de colegiado, teléfono y estado (`activo`). Al crear un perfil o asignarle una especialidad, la API comprueba que esta exista y esté activa.

El módulo está organizado en `API/models/Doctor.js`, `API/controllers/doctorController.js` y `API/routes/doctorRoutes.js`, y sus rutas se registran en `API/server.js`.

| Método | URL | Parámetros / cuerpo JSON | Función |
|---|---|---|---|
| POST | `/api/doctores` | `usuario`, `especialidad`, `numeroColegiado` obligatorios; `telefono` opcional | Crear un perfil médico asociado a un usuario con rol doctor y a una especialidad activa. |
| GET | `/api/doctores` | Ninguno | Listar todos los perfiles, incluidos los inactivos, con datos relacionados mediante `populate`. |
| GET | `/api/doctores/:id` | `id` en la URL | Consultar un perfil por su identificador. |
| PUT | `/api/doctores/:id` | Al menos un campo profesional admitido, por ejemplo `telefono` | Actualizar información profesional del doctor. |
| PUT | `/api/doctores/:id/especialidad` | `id` del perfil de doctor en la URL; `especialidad` en JSON | Asignar o reemplazar su especialidad, siempre que exista y esté activa. |
| DELETE | `/api/doctores/:id` | `id` en la URL | Desactivación lógica: establecer `activo: false`, sin borrar el registro. |

**Ejemplo POST `/api/doctores`:**

```json
{
  "usuario": "ID_REAL_DE_UN_USUARIO_CON_ROL_DOCTOR",
  "especialidad": "ID_REAL_DE_UNA_ESPECIALIDAD_ACTIVA",
  "numeroColegiado": "COL-DEMO-2026-001",
  "telefono": "8888-0000"
}
```

Reemplazar los identificadores de ejemplo por los `_id` que existan en MongoDB. El ID del **perfil Doctor** devuelto por el POST es distinto del ID del **usuario doctor** al que se vincula.

**Ejemplo PUT `/api/doctores/:id`:**

```json
{
  "telefono": "8888-3333"
}
```

**Ejemplo PUT `/api/doctores/:id/especialidad`:**

```json
{
  "especialidad": "ID_REAL_DE_UNA_ESPECIALIDAD_ACTIVA"
}
```

En la URL se utiliza el `_id` del **perfil médico**, no el `_id` del usuario con rol `doctor`. Este endpoint reemplaza la especialidad actualmente asignada; por ahora, un perfil solo admite una especialidad a la vez. Una asignación válida devuelve `200 OK` y el perfil con sus referencias pobladas mediante `populate`.

**Validaciones y reglas comprobadas:**

- Se exige usuario, especialidad y número de colegiado para crear el perfil.
- Se validan los identificadores MongoDB y la existencia del usuario con rol `doctor` y de una especialidad activa.
- No se permite duplicar un perfil para el mismo usuario ni reutilizar un número de colegiado registrado.
- La desactivación lógica mantiene el documento con `activo: false`; desactivarlo de nuevo devuelve `409 Conflict`.
- Las consultas realizadas con `GET` muestran los datos relacionados del usuario y la especialidad sin incluir la contraseña.
- La asignación de especialidad exige un ID válido, una especialidad existente y activa, y un perfil médico existente. La solicitud sin especialidad o con identificadores inválidos devuelve `400`; los registros inexistentes devuelven `404`.
- Se comprobó la reasignación desde «Especialidad Demo Octubre 2026» hacia «Pediatría Demo 2026» y su persistencia posterior mediante `GET /api/doctores/:id`.

**Pruebas manuales con Thunder Client (28 de octubre de 2026):** la carpeta `07 - Doctores` contiene **17 solicitudes**: las diez originales para el CRUD y sus errores más otras siete para la asignación de especialidad (un `PUT` exitoso y seis escenarios de validación). Se observó `200 OK` al cambiar la especialidad, y un `GET` posterior devolvió «Pediatría Demo 2026». Las seis pruebas negativas cubrieron especialidad con ID inválido (`400`), inexistente (`404`), inactiva (`400`), omitida (`400`), doctor con ID inválido (`400`) y doctor inexistente (`404`). La especialidad alternativa se creó con `POST /api/especialidades` (`201`) y quedó guardada como solicitud de prueba en `04 - Especialidades`. Son ensayos manuales, no pruebas automatizadas.

**Nota de alcance:** por ahora, las actualizaciones de perfil y de especialidad también pueden ejecutarse sobre un doctor con `activo: false`; la reasignación no reactiva su perfil. La restricción de modificaciones a doctores inactivos, las múltiples especialidades por doctor y la comprobación de que la especialidad elegida en una cita pertenezca al médico son reglas adicionales aún no implementadas o verificadas. Los endpoints todavía requieren autenticación y autorización de servidor antes de un uso real.

### 4.6. Comprobación del servidor

| Método | URL | Cuerpo | Función |
|---|---|---|---|
| GET | `/api/prueba` | Ninguno | Verificar que la API esté disponible. |

## 5. Códigos de respuesta utilizados

| Código HTTP | Significado | Ejemplo |
|---|---|---|
| `200 OK` | Operación correcta | Consulta, actualización o cancelación. |
| `201 Created` | Registro creado | Crear un usuario, especialidad, cita o perfil de doctor. |
| `400 Bad Request` | Datos incorrectos | Campo faltante, ID inválido o error de validación. |
| `401 Unauthorized` | Credenciales incorrectas | Inicio de sesión rechazado. |
| `404 Not Found` | Registro inexistente | Consultar un ID válido que no está en MongoDB. |
| `409 Conflict` | Conflicto con el estado actual | Horario ocupado, perfil de doctor duplicado o desactivación repetida. |
| `500 Internal Server Error` | Error no controlado en el servidor | Excepción durante una operación. |

Las respuestas se devuelven en JSON y los controladores utilizan bloques `try/catch`.

## 6. Cómo probar la API con Thunder Client

1. Iniciar MongoDB y ejecutar `npm start` dentro de `API`.
2. Abrir Thunder Client en VS Code.
3. Crear una solicitud, seleccionar el método HTTP y escribir la URL del endpoint.
4. Para POST o PUT con datos, seleccionar **Body → JSON** y enviar un objeto válido.
5. Para GET y DELETE, no enviar un cuerpo de solicitud.
6. Verificar el código HTTP y el mensaje o documento devuelto.

**Orden sugerido para la reasignación de especialidad:** crear una especialidad activa distinta, guardar su `_id` como `especialidadAlternativaId` en el entorno de Thunder Client, enviar `PUT /api/doctores/:id/especialidad` y confirmar el cambio con `GET /api/doctores/:id`. Usar datos ficticios y evitar ejecutar todas las peticiones de prueba en bloque, porque algunas modifican registros.

**Orden sugerido para pruebas de Citas:** crear primero un usuario paciente, un usuario doctor y una especialidad activa; copiar sus IDs; registrar la cita; consultar y reprogramarla; cancelarla; comprobar que sigue almacenada con estado `cancelada`; intentar cancelarla nuevamente y esperar `409`.

### 6.1. Resultados de las pruebas manuales (26–28 de octubre de 2026)

Las siguientes operaciones se comprobaron en **Thunder Client** contra la API local y una base de datos con registros de demostración:

| Sección | Pruebas realizadas | Resultados observados |
|---|---|---|
| 01 — Verificación y datos de prueba | Estado del servidor; creación de paciente, doctor y especialidad de prueba. | `GET /api/prueba`: `200`; creación de registros: `201`. |
| 02 — Usuarios | Listado, consulta por ID, creación, actualización y eliminación; correo duplicado e ID inválido. | Respuestas `200`, `201`, `400` y `404` según el caso. Las consultas no mostraron contraseñas. |
| 03 — Autenticación | Inicio de sesión válido, contraseña incorrecta, campos faltantes y verificación de correo. | `200` para casos válidos; `401` por contraseña incorrecta; `400` por datos obligatorios faltantes. |
| 04 — Especialidades | Listado, consulta por ID, actualización, duplicados, ID inválido, desactivación lógica y creación de «Pediatría Demo 2026» para probar reasignación. | `201` al crear la especialidad alternativa; `200` en consultas y actualización; `400` en casos inválidos; al desactivar, `activo` cambió a `false`. |
| 05 — Citas médicas | Registro, listado, consulta por ID, reprogramación, conflicto de horario, cancelación lógica e IDs inválidos o inexistentes. | `201` al crear; `200` al consultar/reprogramar/cancelar; `409` para horario ocupado o cancelación repetida; `400` y `404` para IDs problemáticos. |
| 06 — Operaciones que modifican o cierran registros | Cambio de contraseña de un usuario temporal, autenticación con contraseña antigua y nueva, eliminación del usuario; cancelación de cita y desactivación de especialidad. | Contraseña actualizada: `200`; contraseña antigua: `401`; nueva: `200`; eliminación de usuario: `200`; consulta posterior de especialidad desactivada: `200` con `activo: false`. |
| 07 — Doctores | Diez solicitudes de CRUD y errores, más siete para `PUT /api/doctores/:id/especialidad`: asignación, ID de especialidad inválido o inexistente, especialidad inactiva u omitida, e ID de doctor inválido o inexistente. | Asignación y consulta posterior: `200`, con especialidad «Pediatría Demo 2026» persistida; errores de entrada: `400`; registros inexistentes: `404`; conflictos de operaciones anteriores: `409`. El perfil continuó inactivo. |

**Alcance de la evidencia:** estas fueron pruebas **manuales**, verificadas mediante los códigos HTTP y los cuerpos JSON de las respuestas. No equivalen a una suite automatizada ni acreditan seguridad de producción. Los datos de MongoDB son locales y los registros usados en pruebas pueden cambiarse o eliminarse.

**Colección exportable:** se volvió a exportar localmente `ThunderClientSistemaCitasMedicas.json`, que incluye las nuevas solicitudes de `07 - Doctores` y la creación de la especialidad alternativa. **Esta actualización todavía está pendiente de commit/push.** La colección utiliza variables como `{{baseUrl}}`, `{{perfilDoctorId}}` y `{{especialidadAlternativaId}}`; deben configurarse en el entorno de Thunder Client para que las solicitudes se puedan ejecutar en otra instalación. Los IDs son específicos de la base local. Antes de publicar, comprobar que el JSON y cualquier entorno exportado no contengan contraseñas reales, tokens ni información sensible. Las pruebas manuales no sustituyen una suite automatizada.


## 7. Frontend actual

El repositorio contiene estas páginas:

| Archivo | Funcionalidad actual |
|---|---|
| `login.html` | Formulario de inicio de sesión con validaciones; envía POST a `/api/auth/login` y redirige según el rol. |
| `olvidecontrasena.html` | Comprueba el correo mediante `/api/auth/verificar-correo`. |
| `restablecercontrasena.html` | Envía una nueva contraseña a `/api/auth/restablecer-password`. |
| `paciente.html` | Página inicial para el rol paciente. |
| `doctor.html` | Página inicial para el rol doctor. |
| `administrador.html` | Página inicial para el rol administrador. |

El frontend utiliza `sessionStorage` para conservar datos básicos durante la navegación y comprobar el rol en las páginas. Este control del lado del navegador **no sustituye autorización en el servidor**. Los formularios completos de administración de usuarios, especialidades y citas todavía no están integrados con sus respectivas APIs.

Para probar las páginas, se puede utilizar un servidor local de archivos (por ejemplo Live Server en VS Code), manteniendo la API ejecutándose en `http://localhost:3000`. Las URLs del API están escritas directamente en los archivos HTML y deberán configurarse para otros entornos.

## 8. Limitaciones y próximos pasos

- Implementar autenticación/autorización real en la API y restringir acceso a datos y operaciones por rol.
- Sustituir la recuperación de contraseña actual por un proceso seguro con tokens temporales y verificación de identidad.
- Añadir validaciones completas de fechas, agenda, disponibilidad y concurrencia en las reservas.
- Construir e integrar las interfaces de administración de Usuarios, Especialidades y Citas.
- Integrar los perfiles de **Doctores** y su asignación de especialidad con las interfaces correspondientes y la gestión de citas; comprobar en el futuro que las citas utilicen una especialidad realmente asociada al doctor. Continuar los módulos de Pacientes, Agenda, Disponibilidad, Historial Médico, Notificaciones y Reportes.
- Definir si un doctor puede tener varias especialidades y si debe bloquearse la reasignación cuando el perfil está inactivo.
- Revisar la nueva exportación de Thunder Client para excluir credenciales sensibles y publicar el JSON, el README y el código actualizado en GitHub.
- Verificar desde el navegador los flujos completos del frontend contra la API; las pruebas de Thunder Client no comprueban por sí solas la integración visual.

**Este proyecto es académico y todavía no es apropiado para almacenar datos médicos reales ni para exponerse públicamente en producción.**
