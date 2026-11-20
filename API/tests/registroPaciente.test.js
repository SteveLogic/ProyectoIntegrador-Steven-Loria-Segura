
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const bcrypt = require('bcryptjs');

const Usuario = require('../models/Usuario');
const authRoutes = require('../routes/authRoutes');

const originalFindOne = Usuario.findOne;
const originalSave = Usuario.prototype.save;

const guardados = [];
let servidor;
let urlBase;

before(async () => {
    // Simulamos las consultas y escrituras.
    // Estas pruebas no se conectan a MongoDB.
    Usuario.findOne = async ({ email }) =>
        guardados.find(usuario => usuario.email === email) || null;

    Usuario.prototype.save = async function () {
        guardados.push({
            _id: String(this._id),
            nombre: this.nombre,
            email: this.email,
            password: this.password,
            rol: this.rol
        });

        return this;
    };

    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);

    await new Promise(resolve => {
        servidor = app.listen(0, '127.0.0.1', resolve);
    });

    urlBase = `http://127.0.0.1:${servidor.address().port}`;
});

after(async () => {
    Usuario.findOne = originalFindOne;
    Usuario.prototype.save = originalSave;

    if (servidor) {
        await new Promise(resolve => servidor.close(resolve));
    }
});

async function registrar(cuerpo) {
    const respuesta = await fetch(
        `${urlBase}/api/auth/registro-paciente`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(cuerpo)
        }
    );

    return {
        codigo: respuesta.status,
        datos: await respuesta.json()
    };
}

const valido = {
    nombre: 'Paciente Ficticio',
    email: 'paciente.prueba@example.com',
    password: 'ClaveSegura123'
};

test('Registro rechaza datos obligatorios ausentes o de tipo incorrecto', async () => {
    const casos = [
        {},
        { ...valido, nombre: 4 },
        { ...valido, email: [] },
        { ...valido, password: null }
    ];

    for (const datos of casos) {
        const respuesta = await registrar(datos);
        assert.equal(respuesta.codigo, 400);
    }

    assert.equal(guardados.length, 0);
});

test('Registro rechaza nombres vacíos o excesivamente largos', async () => {
    for (const nombre of ['   ', 'x'.repeat(101)]) {
        const respuesta = await registrar({ ...valido, nombre });
        assert.equal(respuesta.codigo, 400);
    }
});

test('Registro rechaza correos con formato inválido', async () => {
    const correos = [
        'correo-invalido',
        'x'.repeat(145) + '@x.com'
    ];

    for (const email of correos) {
        const respuesta = await registrar({ ...valido, email });
        assert.equal(respuesta.codigo, 400);
    }
});

test('Registro rechaza contraseñas débiles', async () => {
    const contrasenas = [
        'Ab123',
        'minuscula123',
        'MAYUSCULA123',
        'SinNumeros'
    ];

    for (const password of contrasenas) {
        const respuesta = await registrar({ ...valido, password });
        assert.equal(respuesta.codigo, 400);
    }
});

test('Registro rechaza contraseñas superiores a 72 bytes', async () => {
    const password = 'Aa1' + 'ñ'.repeat(36);

    assert.ok(
        Buffer.byteLength(password, 'utf8') > 72
    );

    const respuesta = await registrar({
        ...valido,
        password
    });

    assert.equal(respuesta.codigo, 400);
});

test('Registro asigna rol paciente y protege la contraseña', async () => {
    const respuesta = await registrar({
        ...valido,
        nombre: '  Paciente Ficticio  ',
        email: ' PACIENTE.PRUEBA@EXAMPLE.COM ',
        rol: 'administrador'
    });

    assert.equal(respuesta.codigo, 201);
    assert.equal(
        respuesta.datos.usuario.nombre,
        'Paciente Ficticio'
    );
    assert.equal(
        respuesta.datos.usuario.email,
        'paciente.prueba@example.com'
    );
    assert.equal(respuesta.datos.usuario.rol, 'paciente');

    assert.equal(
        Object.hasOwn(respuesta.datos.usuario, 'password'),
        false
    );

    assert.equal(guardados.length, 1);
    assert.equal(guardados[0].rol, 'paciente');

    assert.notEqual(
        guardados[0].password,
        valido.password
    );

    assert.equal(
        await bcrypt.compare(
            valido.password,
            guardados[0].password
        ),
        true
    );
});

test('Registro rechaza correo duplicado', async () => {
    const respuesta = await registrar({
        ...valido,
        email: 'PACIENTE.PRUEBA@example.com'
    });

    assert.equal(respuesta.codigo, 409);
    assert.equal(guardados.length, 1);
});
