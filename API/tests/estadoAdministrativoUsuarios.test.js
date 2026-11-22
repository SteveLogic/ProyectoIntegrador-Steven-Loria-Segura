
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const Usuario = require('../models/Usuario');
const usuarioRoutes = require('../routes/usuarioRoutes');
const {
  crearSesion,
  requerirSesion,
  cerrarSesionesDeUsuario
} = require('../middleware/sesiones');

const ADMIN_ID = '222222222222222222222222';
const PACIENTE_ID = '111111111111111111111111';

async function cambiarEstado(
  cuerpo,
  { rol = null, id = PACIENTE_ID, tokenParaComprobar = null } = {}
) {
  const app = express();
  app.use(express.json());
  app.use('/api/usuarios', usuarioRoutes);

  app.get('/api/protegida', requerirSesion, (req, res) => {
    res.json({ ok: true });
  });

  const servidor = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  const token = rol
    ? crearSesion({ _id: ADMIN_ID, rol })
    : null;

  const url = `http://127.0.0.1:${servidor.address().port}`;

  try {
    const respuesta = await fetch(
      `${url}/api/usuarios/${id}/estado`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token
            ? { Authorization: `Bearer ${token}` }
            : {})
        },
        body: JSON.stringify(cuerpo)
      }
    );

    const datos = await respuesta.json().catch(() => null);

    let estadoSesion = null;

    if (tokenParaComprobar) {
      const protegida = await fetch(`${url}/api/protegida`, {
        headers: {
          Authorization: `Bearer ${tokenParaComprobar}`
        }
      });

      estadoSesion = protegida.status;
    }

    return {
      codigo: respuesta.status,
      datos,
      estadoSesion
    };

  } finally {
    cerrarSesionesDeUsuario(ADMIN_ID);
    cerrarSesionesDeUsuario(PACIENTE_ID);

    await new Promise(resolve => servidor.close(resolve));
  }
}

test('Sin sesión no se puede cambiar el estado de una cuenta', async () => {
  const resultado = await cambiarEstado({ activo: false });
  assert.equal(resultado.codigo, 401);
});

test('Un doctor no puede cambiar el estado de una cuenta', async () => {
  const resultado = await cambiarEstado(
    { activo: false },
    { rol: 'doctor' }
  );

  assert.equal(resultado.codigo, 403);
});

test('Se rechazan valores no booleanos y campos adicionales', async t => {
  const accesoBD = t.mock.method(
    Usuario,
    'findByIdAndUpdate',
    () => {
      throw new Error('No se debe actualizar con datos inválidos');
    }
  );

  assert.equal(
    (await cambiarEstado(
      { activo: 'false' },
      { rol: 'administrador' }
    )).codigo,
    400
  );

  assert.equal(
    (await cambiarEstado(
      { activo: false, rol: 'administrador' },
      { rol: 'administrador' }
    )).codigo,
    400
  );

  assert.equal(accesoBD.mock.callCount(), 0);
});

test('Rechaza identificadores de usuario inválidos', async () => {
  const resultado = await cambiarEstado(
    { activo: false },
    { rol: 'administrador', id: 'no-es-id' }
  );

  assert.equal(resultado.codigo, 400);
});

test('Un administrador no puede desactivar su propia cuenta', async () => {
  const resultado = await cambiarEstado(
    { activo: false },
    { rol: 'administrador', id: ADMIN_ID }
  );

  assert.equal(resultado.codigo, 403);
});

test('Desactivar una cuenta invalida sus sesiones abiertas', async t => {
  let actualizacion;

  t.mock.method(
    Usuario,
    'findByIdAndUpdate',
    (id, cambios, opciones) => {
      actualizacion = { id, cambios, opciones };

      return {
        select: async () => ({
          _id: PACIENTE_ID,
          nombre: 'Paciente Prueba',
          rol: 'paciente',
          activo: false
        })
      };
    }
  );

  const tokenPaciente = crearSesion({
    _id: PACIENTE_ID,
    rol: 'paciente'
  });

  const resultado = await cambiarEstado(
    { activo: false },
    {
      rol: 'administrador',
      tokenParaComprobar: tokenPaciente
    }
  );

  assert.equal(resultado.codigo, 200);
  assert.equal(resultado.estadoSesion, 401);
  assert.equal(String(actualizacion.id), PACIENTE_ID);

  assert.deepEqual(actualizacion.cambios, {
    $set: { activo: false }
  });

  assert.equal(actualizacion.opciones.runValidators, true);
  assert.equal(resultado.datos.usuario.activo, false);
});

test('Un administrador puede reactivar una cuenta', async t => {
  let cambiosGuardados;

  t.mock.method(
    Usuario,
    'findByIdAndUpdate',
    (id, cambios) => {
      cambiosGuardados = cambios;

      return {
        select: async () => ({
          _id: id,
          nombre: 'Paciente Prueba',
          rol: 'paciente',
          activo: true
        })
      };
    }
  );

  const resultado = await cambiarEstado(
    { activo: true },
    { rol: 'administrador' }
  );

  assert.equal(resultado.codigo, 200);

  assert.deepEqual(cambiosGuardados, {
    $set: { activo: true }
  });

  assert.equal(resultado.datos.usuario.activo, true);
});

test('Devuelve 404 si la cuenta no existe', async t => {
  const consulta = t.mock.method(
    Usuario,
    'findByIdAndUpdate',
    () => ({
      select: async () => null
    })
  );

  const resultado = await cambiarEstado(
    { activo: false },
    { rol: 'administrador' }
  );

  assert.equal(resultado.codigo, 404);
  assert.equal(consulta.mock.callCount(), 1);
});
