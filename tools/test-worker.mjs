// Test des fertigen worker.js gegen ein nachgebautes GitHub
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
writeFileSync('/tmp/allmende-worker.mjs', readFileSync(new URL('../worker/worker.js', import.meta.url)));
const worker = (await import('/tmp/allmende-worker.mjs')).default;

const repos = { 'allmende-data': new Map(), 'allmende-backup': new Map() };
let n = 0;
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } });
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(url);
  const m = u.pathname.match(/^\/repos\/sharing-library\/([^/]+)\/(contents|git\/trees|git\/blobs)\/?(.*)$/);
  if (!m) return json({ message: 'nope' }, 404);
  const repo = repos[m[1]]; const kind = m[2]; const path = decodeURIComponent(m[3]);
  assert.ok(init.headers.Authorization.startsWith('Bearer '));
  if (kind === 'git/trees') return json({ tree: [...repo].map(([p, f]) => ({ path: p, type: 'blob', sha: f.sha })) });
  if (kind === 'git/blobs') { const f = [...repo.values()].find((x) => x.sha === path); return json({ content: f.content }); }
  const method = init.method || 'GET';
  const f = repo.get(path);
  if (method === 'GET') {
    if (!f) return json({ message: 'Not Found' }, 404);
    if ((init.headers.Accept || '').includes('raw')) return new Response(Buffer.from(f.content, 'base64'));
    return json({ content: f.content.replace(/(.{60})/g, '$1\n'), encoding: 'base64', sha: f.sha });
  }
  const body = JSON.parse(init.body);
  if (method === 'PUT') {
    if (f && f.sha !== body.sha) return json({ message: 'sha mismatch' }, 409);
    if (!f && body.sha) return json({ message: 'x' }, 422);
    const sha = 'sha' + ++n; repo.set(path, { content: body.content, sha }); return json({ content: { sha } });
  }
  if (method === 'DELETE') { repo.delete(path); return json({}); }
};

const env = { GITHUB_TOKEN: 'github_pat_test', ADMIN_KEY: 'mein-langer-admin-satz', SESSION_SECRET: 'y'.repeat(48) };
const req = async (method, path, body, token) => {
  const r = await worker.fetch(new Request('https://allmende-api.test' + path, {
    method, headers: { Origin: 'https://sharing-library.github.io', ...(token ? { Authorization: 'Bearer ' + token } : {}), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  }), env);
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), 'https://sharing-library.github.io');
  const ct = r.headers.get('Content-Type') || '';
  return { status: r.status, body: ct.includes('json') ? await r.json() : Buffer.from(await r.arrayBuffer()) };
};

let r = await req('OPTIONS', '/state'); assert.equal(r.status, 204);
r = await req('POST', '/admin/login', { key: 'mein-langer-admin-satz' }); const sup = r.body.token;
r = await req('POST', '/admin/houses', { name: 'Brandvorwerkstraße 59', housePassword: 'haus123' }, sup); assert.equal(r.status, 200, JSON.stringify(r.body));
r = await req('POST', '/join', { slug: 'brandvorwerkstrasse-59', housePassword: 'haus123', name: 'Eric', password: 'geheim1' }); const eric = r.body.token;
r = await req('POST', '/items/things', { title: 'Leiter', text: 'Ü-ber 3 m – mit Umlauten äöü 🪜' }, eric); assert.equal(r.status, 200);
// paralleles Schreiben → Konflikte müssen aufgelöst werden
await Promise.all(['Stichsäge', 'Dörrgerät', 'Pömpel'].map((t) => req('POST', '/items/things', { title: t }, eric)));
r = await req('GET', '/state', null, eric);
assert.equal(r.body.data.things.length, 4, 'parallel geschriebene Einträge fehlen');
assert.ok(r.body.data.things.some((t) => t.text.includes('🪜')));
const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 9, 9, 9, 9]).toString('base64');
r = await req('POST', '/upload', { data: 'data:image/jpeg;base64,' + jpg }, eric);
const img = await req('GET', `/img?f=${r.body.photo}&t=${eric}`);
assert.equal(img.body.toString('base64'), jpg);
assert.ok(repos['allmende-data'].get('houses/brandvorwerkstrasse-59/users.json'));
assert.ok(!Buffer.from(repos['allmende-data'].get('houses/brandvorwerkstrasse-59/users.json').content, 'base64').toString().includes('geheim1'), 'Passwort im Klartext!');

// Backup
let done;
await worker.scheduled({}, env, { waitUntil: (p) => { done = p; } });
await done;
const mirror = [...repos['allmende-backup'].keys()];
assert.ok(mirror.includes('mirror/houses/brandvorwerkstrasse-59/things.json'));
assert.ok(mirror.includes('manifest.json'));
console.log('Worker-Tests bestanden ✓  Backup-Dateien:', mirror.length);
