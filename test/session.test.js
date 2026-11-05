const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.LOGIN_USERNAME = 'watchfan';
process.env.LOGIN_PASSWORD = 'customize-time';
const app = require('../server');
let server;
let base;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise((resolve) => server.close(resolve)));

function request(route, options = {}) {
  return fetch(`${base}${route}`, { redirect: 'manual', ...options });
}

function login(cookie) {
  return request('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...(cookie && { Cookie: cookie }) },
    body: new URLSearchParams({ username: 'watchfan', password: 'customize-time' }),
  });
}

test('anonymous users cannot access the portal or profile', async () => {
  for (const route of ['/portal', '/profile']) {
    const response = await request(route);
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), '/login');
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
});

test('incorrect credentials do not create a session', async () => {
  const response = await request('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'username=watchfan&password=wrong',
  });
  assert.equal(response.status, 401);
  assert.equal(response.headers.get('set-cookie'), null);
  assert.match(await response.text(), /username or password is incorrect/);
});

test('login stores the username, rotates sessions, and logout revokes access', async () => {
  const response = await login();
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), '/portal');
  const setCookie = response.headers.get('set-cookie');
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /SameSite=Lax/);
  assert.doesNotMatch(setCookie, /watchfan|customize-time/);
  const oldCookie = setCookie.split(';')[0];

  const nextLogin = await login(oldCookie);
  const cookie = nextLogin.headers.get('set-cookie').split(';')[0];
  assert.notEqual(cookie, oldCookie);
  assert.equal((await request('/portal', { headers: { Cookie: oldCookie } })).status, 302);

  for (const route of ['/portal', '/profile']) {
    const portal = await request(route, { headers: { Cookie: cookie } });
    assert.equal(portal.status, 200);
    const html = await portal.text();
    assert.match(html, /Welcome, watchfan\./);
    assert.match(html, /watch customization app will live here/);
    assert.match(html, /href="\/logout"/);
  }
  const logout = await request('/logout', { headers: { Cookie: cookie } });
  assert.equal(logout.status, 303);
  assert.equal(logout.headers.get('location'), '/login');
  assert.match(logout.headers.get('set-cookie'), /watch\.sid=;/);
  for (const route of ['/portal', '/profile']) {
    assert.equal((await request(route, { headers: { Cookie: cookie } })).status, 302);
  }
});

test('public pages are served, while server and database files stay private', async () => {
  for (const route of ['/everyday-watches.html', '/watch-design.html', '/watch-collection.html', '/about.html']) {
    const response = await request(route);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /href="\/portal"/);
  }
  for (const route of ['/server.js', '/database-demo.js', '/package.json', '/.git/config']) {
    assert.equal((await request(route)).status, 404);
  }
});
