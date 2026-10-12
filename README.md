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


## Recuperación de contraseña

El sistema permite a un usuario registrado iniciar un proceso de recuperación de contraseña mediante su correo electrónico.

### Flujo de recuperación

1. El usuario selecciona la opción "¿Olvidó su contraseña?" desde el inicio de sesión.
2. El sistema solicita el correo electrónico asociado a la cuenta.
3. Se valida el formato del correo.
4. Se comprueba si el correo pertenece a una cuenta registrada.
5. Si el correo es válido, el usuario puede definir una nueva contraseña.
6. La nueva contraseña debe cumplir las reglas de seguridad establecidas.
7. Se solicita confirmar la nueva contraseña.
8. Si ambas contraseñas coinciden, se actualiza la credencial.
9. El usuario es redirigido al inicio de sesión.

### Validaciones

El sistema verifica:

- Campo de correo obligatorio.
- Formato válido del correo electrónico.
- Existencia de la cuenta.
- Contraseña de al menos 8 caracteres.
- Al menos una letra mayúscula.
- Al menos una letra minúscula.
- Al menos un número.
- Coincidencia entre nueva contraseña y confirmación.

### Implementación actual

El proyecto utiliza `sessionStorage` para conservar temporalmente el correo durante el flujo de recuperación y `localStorage` para almacenar la contraseña restablecida.

Esta implementación corresponde a la etapa actual del prototipo. En una versión con backend, la recuperación deberá gestionarse mediante almacenamiento persistente y mecanismos seguros del servidor.