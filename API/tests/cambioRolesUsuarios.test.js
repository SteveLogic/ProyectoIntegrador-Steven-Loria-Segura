
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const Usuario = require('../models/Usuario');
const Doctor = require('../models/Doctor');
const usuarioRoutes = require('../routes/usuarioRoutes');

const {
  crearSesion,
  requerirSesion,
  cerrarSesionesDeUsuario
} = require('../middleware/sesiones');

const ADMIN_ID = '222222222222222222222222';
const USUARIO_ID = '111111111111111111111111';

async function solicitarCambioRol(cuerpo, opciones = {}) {
  const {
    rolSolicitante,
    id = USUARIO_ID,
    tokenAComprobar
  } = opciones;

  const app = express();

  app.use(express.json());
  app.use('/api/usuarios', usuarioRoutes);

  app.get('/api/prueba-sesion', requerirSesion, (_req, res) => {
    res.json({ ok: true });
  });

  const servidor = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  const tokenAdmin = rolSolicitante
    ? crearSesion({ _id: ADMIN_ID, rol: rolSolicitante })
    : null;

  const base = `http://127.0.0.1:${servidor.address().port}`;

  try {
    const respuesta = await fetch(
      `${base}/api/usuarios/${id}/rol`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(tokenAdmin
            ? { Authorization: `Bearer ${tokenAdmin}` }
            : {})
        },
        body: JSON.stringify(cuerpo)
      }
    );

    const datos = await respuesta.json().catch(() => null);

    let estadoSesion = null;

    if (tokenAComprobar) {
      const comprobacion = await fetch(
        `${base}/api/prueba-sesion`,
        {
          headers: {
            Authorization: `Bearer ${tokenAComprobar}`
          }
        }
      );

      estadoSesion = comprobacion.status;
    }

    return {
      codigo: respuesta.status,
      datos,
      estadoSesion
    };

  } finally {
    cerrarSesionesDeUsuario(ADMIN_ID);
    cerrarSesionesDeUsuario(USUARIO_ID);

    await new Promise(resolve => servidor.close(resolve));
  }
}

function simularUsuario(t, rol = 'paciente') {
  t.mock.method(Usuario, 'findById', async () => ({
    _id: USUARIO_ID,
    nombre: 'Usuario Prueba',
    email: 'prueba@example.com',
    rol
  }));
}

test('Cambiar rol sin sesión devuelve 401', async () => {
  const resultado = await solicitarCambioRol({
    rol: 'administrador'
  });

  assert.equal(resultado.codigo, 401);
});

test('Un paciente no puede asignar roles', async () => {
  const resultado = await solicitarCambioRol(
    { rol: 'administrador' },
    { rolSolicitante: 'paciente' }
  );

  assert.equal(resultado.codigo, 403);
});

test('El administrador debe proporcionar un ID válido', async () => {
  const resultado = await solicitarCambioRol(
    { rol: 'administrador' },
    {
      rolSolicitante: 'administrador',
      id: 'id-invalido'
    }
  );

  assert.equal(resultado.codigo, 400);
});

test('No se aceptan roles desconocidos', async () => {
  const resultado = await solicitarCambioRol(
    { rol: 'superusuario' },
    { rolSolicitante: 'administrador' }
  );

  assert.equal(resultado.codigo, 400);
});

test('No se pueden modificar otros campos al cambiar un rol', async () => {
  const resultado = await solicitarCambioRol(
    {
      rol: 'administrador',
      activo: false
    },
    { rolSolicitante: 'administrador' }
  );

  assert.equal(resultado.codigo, 400);
});

test('El administrador no puede cambiar su propio rol', async () => {
  const resultado = await solicitarCambioRol(
    { rol: 'paciente' },
    {
      rolSolicitante: 'administrador',
      id: ADMIN_ID
    }
  );

  assert.equal(resultado.codigo, 403);
});

test('Un usuario inexistente devuelve 404 tras consultar MongoDB', async t => {
  const consulta = t.mock.method(
    Usuario,
    'findById',
    async () => null
  );

  const resultado = await solicitarCambioRol(
    { rol: 'administrador' },
    { rolSolicitante: 'administrador' }
  );

  assert.equal(resultado.codigo, 404);
  assert.equal(consulta.mock.callCount(), 1);
});

test('Cambiar paciente a administrador invalida su sesión anterior', async t => {
  simularUsuario(t, 'paciente');

  let actualizacion = null;

  t.mock.method(
    Usuario,
    'findByIdAndUpdate',
    (id, cambio, opciones) => {
      actualizacion = { id, cambio, opciones };

      return {
        select: async () => ({
          _id: USUARIO_ID,
          nombre: 'Usuario Prueba',
          rol: 'administrador'
        })
      };
    }
  );

  const tokenPaciente = crearSesion({
    _id: USUARIO_ID,
    rol: 'paciente'
  });

  const resultado = await solicitarCambioRol(
    { rol: 'administrador' },
    {
      rolSolicitante: 'administrador',
      tokenAComprobar: tokenPaciente
    }
  );

  assert.equal(resultado.codigo, 200);
  assert.equal(resultado.estadoSesion, 401);

  assert.equal(
    String(actualizacion.id),
    USUARIO_ID
  );

  assert.deepEqual(actualizacion.cambio, {
    $set: { rol: 'administrador' }
  });

  assert.equal(actualizacion.opciones.runValidators, true);
  assert.equal(resultado.datos.usuario.rol, 'administrador');
});

test('No se cambia el rol de un doctor con perfil médico asociado', async t => {
  simularUsuario(t, 'doctor');

  t.mock.method(
    Doctor,
    'exists',
    async () => ({ _id: USUARIO_ID })
  );

  const actualizar = t.mock.method(
    Usuario,
    'findByIdAndUpdate',
    () => {
      throw new Error('No se debe modificar el usuario');
    }
  );

  const resultado = await solicitarCambioRol(
    { rol: 'paciente' },
    { rolSolicitante: 'administrador' }
  );

  assert.equal(resultado.codigo, 409);
  assert.equal(actualizar.mock.callCount(), 0);
});

test('Se puede asignar rol doctor, con el perfil profesional aún pendiente', async t => {
  simularUsuario(t, 'paciente');

  t.mock.method(
    Usuario,
    'findByIdAndUpdate',
    (_id, cambio) => ({
      select: async () => ({
        _id: USUARIO_ID,
        rol: cambio.$set.rol
      })
    })
  );

  const resultado = await solicitarCambioRol(
    { rol: 'doctor' },
    { rolSolicitante: 'administrador' }
  );

  assert.equal(resultado.codigo, 200);
  assert.equal(resultado.datos.usuario.rol, 'doctor');
});