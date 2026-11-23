const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuario');
const { crearSesion, cerrarSesionesDeUsuario, requerirSesion } = require('../middleware/sesiones');
const auth = require('../routes/authRoutes');

const ID = '123456789012345678901234';
const email = 'prueba.recuperacion@example.com';
const claveAntigua = 'ClaveAntigua123';
const claveNueva = 'ClaveNueva123';
const { findOne, updateOne, findOneAndUpdate } = Usuario;
const fetchOriginal = global.fetch;
const envAnterior = Object.fromEntries(['RESEND_API_KEY', 'RESET_EMAIL_FROM', 'APP_PUBLIC_URL'].map(k => [k, process.env[k]]));
let usuario;
let servidor;
let base;
let enlaces = [];
let mockErrorEnvio = false;

before(async () => {
    process.env.RESEND_API_KEY = 're_clave_demo';
    process.env.RESET_EMAIL_FROM = 'pruebas@example.com';
    process.env.APP_PUBLIC_URL = 'https://citas.ejemplo.com';
    usuario = { _id: ID, email, rol: 'paciente', nombre: 'Prueba', activo: true,
        password: await bcrypt.hash(claveAntigua, 4) };
    Usuario.findOne = async condicion => {
        if (condicion.email) return condicion.email === usuario.email ? usuario : null;
        if (condicion.resetTokenHash) {
            return usuario.resetTokenHash === condicion.resetTokenHash &&
                usuario.resetTokenExpira > condicion.resetTokenExpira.$gt && usuario.activo !== false ? usuario : null;
        }
        return null;
    };
    Usuario.updateOne = async (condicion, cambios) => {
        if (condicion._id !== ID || (condicion.resetTokenHash && usuario.resetTokenHash !== condicion.resetTokenHash)) return {modifiedCount: 0};
        Object.assign(usuario, cambios.$set || {});
        for (const key of Object.keys(cambios.$unset || {})) delete usuario[key];
        return {modifiedCount: 1};
    };
    Usuario.findOneAndUpdate = async (condicion, cambios) => {
        if (condicion._id !== ID || usuario.resetTokenHash !== condicion.resetTokenHash ||
            usuario.resetTokenExpira <= condicion.resetTokenExpira.$gt) return null;
        Object.assign(usuario, cambios.$set || {});
        for (const key of Object.keys(cambios.$unset || {})) delete usuario[key];
        return usuario;
    };
    global.fetch = async (url, opts) => {
        if (String(url).startsWith('https://api.resend.com/')) {
            if (mockErrorEnvio) return { ok: false, status: 401 };
            let data = JSON.parse(opts.body);
            assert.equal(data.to[0], email);
            assert.equal(opts.headers.Authorization, 'Bearer re_clave_demo');
            let enlace = data.text.match(/https:\/\/[^\s]+/)[0];
            enlaces.push(enlace);
            return {ok: true, status: 200};
        }
        return fetchOriginal(url, opts);
    };
    const app = express();
    app.use(express.json());
    app.use('/api/auth', auth);
    app.get('/segura', requerirSesion, (_req, res) => res.json({ ok: true }));
    servidor = app.listen(0, '127.0.0.1');
    await new Promise(resolve => servidor.once('listening', resolve));
    base = `http://127.0.0.1:${servidor.address().port}`;
});

after(async () => {
    Usuario.findOne = findOne;
    Usuario.updateOne = updateOne;
    Usuario.findOneAndUpdate = findOneAndUpdate;
    global.fetch = fetchOriginal;
    for(const [k,v] of Object.entries(envAnterior)) {if(v === undefined) delete process.env[k]; else process.env[k]=v;}
    cerrarSesionesDeUsuario(ID);
    await new Promise(resolve => servidor.close(resolve));
});

async function pedir(ruta, body, method = 'POST') {
    const r = await fetchOriginal(base + '/api/auth/' + ruta, {
        method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)
    });
    return {status:r.status, data:await r.json()};
}
function tokenUltimo(){return new URL(enlaces.at(-1)).hash.split('token=')[1];}

test('no permite el reset sin servicio de correo configurado', async () => {
    const key=process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    assert.equal((await pedir('verificar-correo',{email})).status,503);
    process.env.RESEND_API_KEY=key;
});
test('rechaza correos inválidos', async () => {
    for(const invalido of [null, 42, 'nada', 'a'.repeat(170) + '@x.com']) {
        assert.equal((await pedir('verificar-correo',{email:invalido})).status,400);
    }
});
test('correo no registrado responde genérico y no se envía', async()=>{
    const n=enlaces.length;
    const r=await pedir('verificar-correo',{email:'noexiste@example.com'});
    assert.equal(r.status,200);
    assert.match(r.data.mensaje,/si el correo/i);
    assert.equal(enlaces.length,n);
});
test('solicitud válida envía enlace con token, pero guarda solamente hash en MongoDB',async()=>{
    let r=await pedir('verificar-correo',{email});
    assert.equal(r.status,200);
    assert.match(enlaces.at(-1),/#token=[a-f0-9]{64}$/);
    assert.equal(usuario.resetTokenHash.length,64);
    assert.notEqual(usuario.resetTokenHash,tokenUltimo());
    assert.ok(usuario.resetTokenExpira > new Date());
});
test('rechaza reset sin token y contraseña débil', async()=>{
    assert.equal((await pedir('restablecer-password',{email,nuevaPassword:claveNueva},'PUT')).status,400);
    assert.equal((await pedir('restablecer-password',{token:tokenUltimo(), nuevaPassword:'abc'},'PUT')).status,400);
    assert.equal((await pedir('restablecer-password',{token:tokenUltimo(),nuevaPassword:claveAntigua},'PUT')).status,400);
});
test('rechaza un token falso o expirado',async()=>{
    assert.equal((await pedir('restablecer-password',{token:'f'.repeat(64),nuevaPassword:claveNueva},'PUT')).status,400);
    const expira=usuario.resetTokenExpira;
    usuario.resetTokenExpira=new Date(Date.now()-1000);
    assert.equal((await pedir('restablecer-password',{token:tokenUltimo(),nuevaPassword:claveNueva},'PUT')).status,400);
    usuario.resetTokenExpira=expira;
});
test('una cuenta desactivada no puede solicitar recuperación',async()=>{
    usuario.activo=false;
    const n=enlaces.length;
    assert.equal((await pedir('verificar-correo',{email})).status,200);
    assert.equal(enlaces.length,n);
    usuario.activo=true;
});
test('un token válido cambia la contraseña, se consume y cierra las sesiones',async()=>{
    const tokenSesion=crearSesion(usuario);
    const r=await pedir('restablecer-password',{token:tokenUltimo(),nuevaPassword:claveNueva},'PUT');
    assert.equal(r.status,200);
    assert.equal(await bcrypt.compare(claveNueva,usuario.password),true);
    assert.equal(await bcrypt.compare(claveAntigua,usuario.password),false);
    assert.equal(usuario.resetTokenHash,undefined);
    const protegido=await fetchOriginal(base+'/segura',{headers:{Authorization:'Bearer '+tokenSesion}});
    assert.equal(protegido.status,401);
    assert.equal((await pedir('restablecer-password',{token:tokenUltimo(),nuevaPassword:'OtraClave2026'},'PUT')).status,400);
});
test('si el proveedor rechaza el envío, elimina el token y no revela la cuenta',async()=>{
    mockErrorEnvio=true;
    const r=await pedir('verificar-correo',{email});
    mockErrorEnvio=false;
    assert.equal(r.status,200);
    assert.equal(usuario.resetTokenHash,undefined);
});
