##ProyectoIntegrador-Steven-Loria-Segura
## Módulo de Autenticación - Inicio de sesión

El sistema permite iniciar sesión mediante correo electrónico, contraseña y tipo de usuario.

### Roles disponibles

- Paciente
- Doctor
- Administrador

### Validaciones

El formulario valida:

- Campos obligatorios.
- Formato válido del correo electrónico.
- Selección obligatoria del tipo de usuario.
- Coincidencia de correo, contraseña y rol.
- Credenciales incorrectas mediante un mensaje genérico de error.

### Control de acceso

Cuando las credenciales son correctas, el usuario es dirigido al panel correspondiente:

- Paciente → paciente.html
- Doctor → doctor.html
- Administrador → administrador.html

El sistema utiliza sessionStorage para mantener temporalmente la información de autenticación y el rol del usuario.

Las páginas protegidas verifican que exista una sesión válida y que el rol corresponda con la página solicitada. Si la validación falla, el usuario es redirigido a login.html.

### Usuarios de prueba

Paciente:
- Correo: paciente@citas.com
- Contraseña: Paciente123

Doctor:
- Correo: doctor@citas.com
- Contraseña: Doctor123

Administrador:
- Correo: admin@citas.com
- Contraseña: Admin123

### Tecnologías utilizadas

- HTML5
- Bootstrap 5
- JavaScript
- sessionStorage

### Estado actual

La autenticación implementada corresponde a una versión inicial del proyecto y utiliza usuarios de prueba almacenados en JavaScript. En etapas posteriores, la autenticación deberá integrarse con la persistencia de datos del sistema.