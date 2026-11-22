const { test } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../server');

async function conServidor(callback) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    return await callback(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

test('La API responde en su ruta pública de salud', async () => {
  await conServidor(async base => {
    const r = await fetch(base + '/api/prueba');
    assert.equal(r.status, 200);
    assert.match((await r.json()).mensaje, /funcionando/i);
  });
});

test('La raíz abre el login y publica el archivo de configuración', async () => {
  await conServidor(async base => {
    const r = await fetch(base + '/', { redirect: 'manual' });
    assert.equal(r.status, 302);
    assert.equal(r.headers.get('location'), '/login.html');
    const page = await fetch(base + '/login.html');
    assert.equal(page.status, 200);
    assert.match(await page.text(), /js\/api-config\.js/);
    const config = await fetch(base + '/js/api-config.js');
    assert.equal(config.status, 200);
  });
});

test('El servidor web no expone API, plantillas privadas ni archivos fuente', async () => {
  await conServidor(async base => {
    for (const ruta of ['/API/.env.example', '/API/server.js', '/README.md', '/node_modules/.env']) {
      assert.equal((await fetch(base + ruta)).status, 404, ruta);
    }
  });
});

test('CORS permite frontend local pero no orígenes externos arbitrarios', async () => {
  await conServidor(async base => {
    const local = await fetch(base + '/api/prueba', {headers: {origin: 'http://127.0.0.1:5500'}});
    assert.equal(local.headers.get('access-control-allow-origin'), 'http://127.0.0.1:5500');
    const externo = await fetch(base + '/api/prueba', {headers: {origin: 'https://sitio-ajeno.example'}});
    assert.equal(externo.headers.get('access-control-allow-origin'), null);
  });
});

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const configCliente = fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'api-config.js'), 'utf8');

test('Frontend local sigue usando el backend del puerto 3000', () => {
  const window = { location: { hostname: '127.0.0.1', protocol: 'http:', origin: 'http://127.0.0.1:5500' } };
  vm.runInNewContext(configCliente, { window });
  assert.equal(window.CITAS_API_ORIGIN, 'http://localhost:3000');
});

test('Frontend publicado usa HTTPS de su mismo origen por defecto', () => {
  const window = { location: { hostname: 'citas.onrender.com', protocol: 'https:', origin: 'https://citas.onrender.com' } };
  vm.runInNewContext(configCliente, { window });
  assert.equal(window.CITAS_API_ORIGIN, 'https://citas.onrender.com');
});
