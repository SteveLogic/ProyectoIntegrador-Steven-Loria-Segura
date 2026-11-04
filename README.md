# Sistema de Citas Médicas — Proyecto Integrador 1

Aplicación web académica para la gestión de usuarios, doctores, especialidades y citas médicas. Frontend con HTML5, Bootstrap 5, CSS3 y JavaScript; backend con Node.js, Express, Mongoose y MongoDB.

**Actualizado para el Segundo Avance — 3 de noviembre de 2026.** El alcance de esta entrega es **maquetación y diseño responsive de frontend**. Las 19 subtareas de diseño de interfaz del tablero Jira (KAN) están finalizadas. Varias pantallas usan **datos ficticios y validaciones de vista previa**: no crean, cambian ni eliminan registros reales. La autenticación y algunos formularios de recuperación sí realizan llamadas a la API académica; el resto no debe presentarse como integración completa con MongoDB.

**Repositorio:** https://github.com/SteveLogic/ProyectoIntegrador-Steven-Loria-Segura

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
│   ├── config/database.js
│   ├── controllers/              # Usuarios, doctores, citas y especialidades
│   ├── models/                   # Usuario, Doctor, Cita, Especialidad
│   ├── routes/                   # Endpoints REST y autenticación
│   ├── .env.example
│   ├── package.json
│   ├── package-lock.json
│   └── server.js
├── css/
│   └── styles.css                # Estilos personalizados para Bootstrap
├── img/
│   └── evidencias/               # Capturas de escritorio y móvil
├── login.html
├── registro-paciente.html
├── olvidecontrasena.html
├── restablecercontrasena.html
├── cambio-contrasena.html
├── paciente.html
├── doctor.html
├── administrador.html
├── .gitignore
├── ThunderClientSistemaCitasMedicas.json
└── README.md
```

- `API/routes/` registra los endpoints; `API/controllers/` contiene la lógica; `API/models/` define esquemas de Mongoose.
- `css/styles.css` complementa y personaliza Bootstrap.
- `img/evidencias/` conserva capturas originales de pruebas manuales del frontend; los archivos son **evidencias visuales**, no imágenes usadas por la aplicación.
- **No incluir** `node_modules/`, `API/.env` ni el directorio `.git/` en un ZIP de entrega. El archivo `API/.env.example` sí se incluye.

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

### Paso 6. Cuentas de demostración (entorno académico local)

Para presentar las vistas correspondientes a cada rol se han definido las siguientes **cuentas ficticias de prueba**. Estas credenciales fueron proporcionadas para la demostración; su funcionamiento debe verificarse en la base de datos local antes de exponer el proyecto.

| Rol | Correo electrónico | Contraseña de demostración |
|---|---|---|
| Doctor | `doctor.demo20261023@citas.com` | Entregar al evaluador por canal privado |
| Paciente | `paciente.demo20261023@citas.com` | Entregar al evaluador por canal privado |
| Administrador | `admin.demo2026@citas.com` | Entregar al evaluador por canal privado |

**Procedimiento:** iniciar MongoDB y el servidor de la API (`npm start` dentro de `API/`), abrir `login.html` con Live Server e iniciar sesión indicando correo, contraseña y rol.

**Alcance y seguridad:** las cuentas pertenecen a una base de datos de demostración y **no se crean automáticamente** al clonar el repositorio. Las contraseñas de inicio de sesión se entregarán al profesor por un canal privado y no se publican en GitHub. No utilizar estas cuentas en producción. El flujo actual de recuperación de contraseña es exclusivamente académico y requiere medidas de seguridad adicionales antes de un despliegue público.

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


## 7. Vistas principales y alcance funcional del frontend

| Archivo | Vistas / componentes representativos | Conexión actual |
|---|---|---|
| `login.html` | Inicio de sesión y selección de rol | Solicita `POST /api/auth/login` (API académica) |
| `registro-paciente.html` | Formulario de registro y validación de contraseña | Validación visual, sin POST real |
| `olvidecontrasena.html` | Buscar correo registrado | Solicita `POST /api/auth/verificar-correo` |
| `restablecercontrasena.html` | Formulario de nueva contraseña | Solicita `PUT /api/auth/restablecer-password` (flujo académico no seguro para producción) |
| `cambio-contrasena.html` | Cambio de contraseña para sesión iniciada | Vista previa, no cambia datos de API |
| `paciente.html` | Resumen, directorio por especialidad, reserva, Mis citas, notificaciones y perfil | Datos ficticios y validaciones de maqueta |
| `doctor.html` | Resumen, agenda, disponibilidad, pacientes, consultas, atención y perfil | Datos ficticios y validaciones de maqueta |
| `administrador.html` | Panel, usuarios, doctores, especialidades, citas y reportes | Datos ficticios, filtros, modales y validaciones de maqueta |

**Cómo abrir las interfaces:** abrir el proyecto con VS Code y Live Server (ej. `http://127.0.0.1:5500/login.html`). Para funciones que consultan la API, iniciar MongoDB y `npm start` en `API/` (servidor local `http://localhost:3000`). Bootstrap se carga desde CDN, por lo que conviene disponer de conexión a Internet durante la demostración.

## 8. Matriz de correspondencia: vista, Jira y API REST

Las tareas que se indican corresponden a **diseño de interfaz** y **no** significan que todas las funcionalidades tengan integración persistente. Los nombres usados en el atributo HTML `name` para los formularios principales coinciden con los campos del modelo; algunos IDs DOM incorporan prefijos para evitar colisiones entre formularios de la misma página.

| Tarea Jira | Vista o sección | Modelo / entidad de API | Endpoint o alcance previsto |
|---|---|---|---|
| [KAN-38](https://ucenfotec-team-zo0hagdo.atlassian.net/browse/KAN-38) | `login.html` | `Usuario` | `POST /api/auth/login` (integrado en entorno académico) |
| [KAN-45](https://ucenfotec-team-zo0hagdo.atlassian.net/browse/KAN-45) | `olvidecontrasena.html` | `Usuario` | `POST /api/auth/verificar-correo` (integrado) |
| [KAN-52](https://ucenfotec-team-zo0hagdo.atlassian.net/browse/KAN-52) | `cambio-contrasena.html` y `restablecercontrasena.html` | `Usuario.password` | Maqueta de cambio; recuperación académica `PUT /api/auth/restablecer-password` |
| [KAN-62](https://ucenfotec-team-zo0hagdo.atlassian.net/browse/KAN-62) | `administrador.html#usuarios` | `Usuario` (`nombre`, `email`, `password`, `rol`) | CRUD `GET/POST/PUT/DELETE /api/usuarios`; interfaz simulada |
| [KAN-69](https://ucenfotec-team-zo0hagdo.atlassian.net/browse/KAN-69) | `registro-paciente.html` | `Usuario` (`nombre`, `email`, `password`, `rol`) | Preparado para `POST /api/usuarios`; maqueta |
| [KAN-75](https://ucenfotec-team-zo0hagdo.atlassian.net/browse/KAN-75) | `paciente.html#miPerfil` | `Usuario` | `GET/PUT /api/usuarios/:id`; maqueta |
| [KAN-81](https://ucenfotec-team-zo0hagdo.atlassian.net/browse/KAN-81) | `administrador.html#doctores` | `Doctor` (`usuario`, `especialidad`, `numeroColegiado`, `telefono`, `activo`) | `GET/POST/PUT/DELETE /api/doctores`; maqueta; DELETE desactiva lógicamente |
| [KAN-88](https://ucenfotec-team-zo0hagdo.atlassian.net/browse/KAN-88) | `administrador.html#especialidades` | `Especialidad` (`nombre`, `descripcion`, `activo`) | `GET/POST/PUT/DELETE /api/especialidades`; maqueta |
| [KAN-94](https://ucenfotec-team-zo0hagdo.atlassian.net/browse/KAN-94) | `paciente.html#buscarDoctores` | `Doctor`, `Especialidad`, `Usuario` | Directorio y selección visual; futuro `GET /api/doctores` y `GET /api/especialidades` |
| [KAN-99](https://ucenfotec-team-zo0hagdo.atlassian.net/browse/KAN-99) | `doctor.html#disponibilidad` | Disponibilidad (modelo aún no definido) | Horarios ficticios; no existe endpoint de disponibilidad en la API actual |
| [KAN-106](https://ucenfotec-team-zo0hagdo.atlassian.net/browse/KAN-106) | `paciente.html#reservarCita` | `Cita` (`paciente`, `doctor`, `especialidad`, `fecha`, `hora`, `motivo`) | Preparado para `POST /api/citas`; validación de vista previa |
| [KAN-113](https://ucenfotec-team-zo0hagdo.atlassian.net/browse/KAN-113) | `administrador.html#citas` | `Cita` | `GET/POST/PUT/DELETE /api/citas`; maquetas de registro/reprogramación/cancelación |
| [KAN-119](https://ucenfotec-team-zo0hagdo.atlassian.net/browse/KAN-119) | `paciente.html#misCitas` | `Cita` | Futuro `GET /api/citas` filtrado en backend por usuario autenticado; datos ficticios |
| [KAN-124](https://ucenfotec-team-zo0hagdo.atlassian.net/browse/KAN-124) | `doctor.html#agenda` (modal de estado) | `Cita.estado` | Vista previa; el backend actual no expone un endpoint dedicado para actualizar `estado` |
| [KAN-130](https://ucenfotec-team-zo0hagdo.atlassian.net/browse/KAN-130) | `doctor.html#consultas` | `Cita`; futura `AtencionMedica` | Formulario ficticio de atención; diagnóstico/observaciones no existen aún en los modelos |
| [KAN-136](https://ucenfotec-team-zo0hagdo.atlassian.net/browse/KAN-136) | `doctor.html#agenda` | `Cita`, `Usuario` | Futuro listado de agenda filtrado por doctor; maqueta |
| [KAN-141](https://ucenfotec-team-zo0hagdo.atlassian.net/browse/KAN-141) | `paciente.html#notificaciones` | Notificación (modelo aún no definido); referencia a `Cita` | Avisos ficticios y estados de lectura en pantalla |
| [KAN-147](https://ucenfotec-team-zo0hagdo.atlassian.net/browse/KAN-147) | `administrador.html#reportes` | `Cita` | Reportes calculados sobre datos ficticios; sin endpoint específico |
| [KAN-153](https://ucenfotec-team-zo0hagdo.atlassian.net/browse/KAN-153) | `administrador.html#resumen` | `Usuario`, `Doctor`, `Especialidad`, `Cita` | Panel visual e indicadores de demostración |

## 9. Evidencias visuales de escritorio y móvil

Las siguientes capturas fueron aportadas durante las pruebas manuales del frontend en Chrome y Chrome DevTools. Los datos de pacientes, doctores y horarios visibles son de demostración. Los screenshots de móvil muestran un ancho de **375 px**.

| Funcionalidad | Escritorio | Móvil |
|---|---|---|
| Reportes administrativos | [Ver captura](img/evidencias/reportes-escritorio.png) | [Ver captura](img/evidencias/reportes-movil.png) |
| Gestión de doctores | [Ver captura](img/evidencias/doctores-escritorio.png) | [Ver captura](img/evidencias/doctores-movil.png) |
| Mis citas (paciente) | [Ver captura](img/evidencias/mis-citas-escritorio.png) | [Ver captura](img/evidencias/mis-citas-movil.png) |
| Directorio por especialidad | [Ver captura](img/evidencias/buscar-doctores-escritorio.png) | [Ver captura](img/evidencias/buscar-doctores-movil.png) |
| Reserva de citas | [Ver captura](img/evidencias/reserva-escritorio.png) | [Ver captura](img/evidencias/reserva-movil.png) |
| Gestión de citas (admin) | [Ver captura](img/evidencias/gestion-citas-escritorio.png) | [Ver captura](img/evidencias/reprogramacion-movil.png) |
| Cancelación de cita | [Ver captura](img/evidencias/cancelacion-escritorio.png) | [Ver captura](img/evidencias/cancelacion-movil.png) |

Las capturas representan los estados y pruebas visibles del sistema; no sustituyen pruebas de integración con MongoDB. En las capturas de móvil puede verse Chrome DevTools para evidenciar el tamaño del dispositivo. Algunas pantallas de autenticación y perfiles no cuentan con pareja de capturas en este paquete: si el docente espera evidencia **de cada pantalla**, añadirlas manualmente.

## 10. Limitaciones, seguridad y próximos pasos

- El segundo avance comprende maquetación de frontend: las vistas de reserva, reportes, doctores, notificaciones y acciones de citas incluyen **datos ficticios** y no ejecutan operaciones reales contra MongoDB.
- La API de usuarios sí implementa una eliminación física (`DELETE /api/usuarios/:id`); la API de doctores desactiva lógicamente un perfil y la de citas cancela lógicamente. No confundir comportamientos con las acciones demostrativas del frontend.
- `AtencionMedica`, Notificaciones y Disponibilidad aún no tienen modelos/endpoints específicos en la API actual; las pantallas correspondientes preparan la interfaz para un avance posterior.
- En la API actual falta seguridad de producción: autorización por roles y tokens/sesiones seguras, recuperación de contraseña con verificación real, validación integral de disponibilidad y reglas transaccionales.
- La aplicación no debe utilizarse con información médica real ni publicarse como servicio de producción. El acceso por `sessionStorage` sirve solo para la demostración.
- La hoja de estilos propia `css/styles.css` complementa el sistema responsive de Bootstrap 5 y usa una paleta neutra coherente.
- La revisión final antes de entregar debe comprobar enlaces, formularios, navegador móvil, limpieza de archivos, y `git status` sin cambios pendientes tras `git push`.
