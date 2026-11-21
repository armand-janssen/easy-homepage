const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Isolate from the developer's .env (dotenv never overrides already-set vars): no network, no real cache
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'easy-homepage-test-'));
Object.assign(process.env, {
  NODE_ENV: 'test',
  GITHUB_URL: '',
  GITHUB_TOKEN: '',
  LOGO_DEV_TOKEN: '',
  LOCAL_JSON_PATH: path.join(__dirname, '../data/private.json'),
  CACHE_FILE: path.join(tmp, 'cache.json'),
  LOGOS_DIR: path.join(tmp, 'logos')
});

const { buildApp } = require('../src/app');
const { validateData } = require('../src/services/dataService');
const { isAllowedLogoUrl } = require('../src/services/logoService');

let app;
test.before(async () => {
  fs.mkdirSync(process.env.LOGOS_DIR);
  fs.writeFileSync(path.join(process.env.LOGOS_DIR, 'ok.png'), 'png');
  app = await buildApp();
  await app.ready();
});
test.after(() => app.close());

test('no CORS headers for foreign origins', async () => {
  const res = await app.inject({ url: '/api/links', headers: { origin: 'https://evil.example' } });
  assert.strictEqual(res.headers['access-control-allow-origin'], undefined);
});

test('security headers are set', async () => {
  const res = await app.inject({ url: '/api/health' });
  assert.strictEqual(res.headers['x-content-type-options'], 'nosniff');
  assert.strictEqual(res.headers['referrer-policy'], 'no-referrer');
});

test('/api/stats does not leak paths, URLs or file names', async () => {
  const res = await app.inject({ url: '/api/stats' });
  assert.strictEqual(res.statusCode, 200);
  assert.deepStrictEqual(Object.keys(res.json().logos), ['total']);
  assert.doesNotMatch(res.body, /tmp|\.json|\.png|github|localPath|directory/i);
});

test('/logos serves logos but not files outside the logos dir', async () => {
  assert.strictEqual((await app.inject({ url: '/logos/ok.png' })).statusCode, 200);
  for (const url of ['/logos/../package.json', '/logos/..%2f..%2fpackage.json', '/logos/%2e%2e/%2e%2e/package.json', '/logos/..%5c..%5cpackage.json']) {
    const res = await app.inject({ url });
    assert.doesNotMatch(res.body, /"dependencies"/, url);
  }
});

test('refresh inside the cooldown is skipped', async () => {
  const first = await app.inject({ method: 'POST', url: '/api/refresh' });
  assert.strictEqual(first.json().message, 'Data refreshed successfully');
  const second = await app.inject({ method: 'POST', url: '/api/refresh' });
  assert.match(second.json().message, /skipped/);
});

test('/api/links returns validated data with icon hints', async () => {
  const body = (await app.inject({ url: '/api/links' })).json();
  assert.strictEqual(body.tabs[0].categories[0].links[0]['icon-hint'], 'github');
});

test('validateData rejects malformed upstream data', () => {
  assert.throws(() => validateData({}));
  assert.throws(() => validateData({ tabs: [{ tab: 'x', categories: [{ category: 'c', links: [{ name: 'n', url: 'u', 'logo-hint': 5 }] }] }] }));
  assert.throws(() => validateData({ tabs: [{ tab: 'x', categories: [{ category: 'c', links: [{ name: 1, url: 'u' }] }] }] }));
  assert.ok(validateData({ tabs: [] }));
});

test('logo image URLs are restricted to https logo.dev hosts', () => {
  assert.ok(isAllowedLogoUrl('https://img.logo.dev/github.com'));
  for (const url of ['http://img.logo.dev/x', 'https://169.254.169.254/latest', 'https://evil-logo.dev/x', 'https://logo.dev.evil.com/x', 'file:///etc/passwd', undefined]) {
    assert.ok(!isAllowedLogoUrl(url), String(url));
  }
});

test('cross-site refresh is refused', async () => {
  for (const headers of [{ 'sec-fetch-site': 'cross-site' }, { origin: 'http://evil.example', host: '192.168.1.5:9999' }]) {
    const res = await app.inject({ method: 'POST', url: '/api/refresh', headers });
    assert.strictEqual(res.statusCode, 403);
  }
  const proxied = await app.inject({ method: 'POST', url: '/api/refresh', headers: { origin: 'https://home.example', host: '127.0.0.1:9999', 'sec-fetch-site': 'same-origin' } });
  assert.strictEqual(proxied.statusCode, 200);
  const same = await app.inject({ method: 'POST', url: '/api/refresh', headers: { origin: 'http://192.168.1.5:9999', host: '192.168.1.5:9999' } });
  assert.strictEqual(same.statusCode, 200);
});
