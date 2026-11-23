// Test der Kernlogik mit Speicher im Arbeitsspeicher
import { createCore } from '../core.js';
import assert from 'node:assert/strict';

const files = new Map();
let shaN = 0;
const store = {
  async read(p) { const f = files.get(p); return f ? { data: structuredClone(f.data), sha: f.sha } : null; },
  async write(p, data, sha) {
    const f = files.get(p);
    if (f && f.sha !== sha) { const e = new Error('c'); e.conflict = true; throw e; }
    files.set(p, { data: structuredClone(data), sha: 's' + ++shaN });
  },
  async readBin(p) { return files.get(p)?.bin || null; },
  async writeBin(p, b) { files.set(p, { bin: b }); },
  async remove(p) { files.delete(p); },
};
const core = createCore(store, { adminKey: 'super-geheimer-admin', sessionSecret: 'x'.repeat(40) });
const call = async (method, path, { body, token, query } = {}) => core.handle({ method, path, body, token, query, ip: '1' });

let r = await call('POST', '/admin/login', { body: { key: 'falsch' } });
assert.equal(r.status, 403);
r = await call('POST', '/admin/login', { body: { key: 'super-geheimer-admin' } });
assert.equal(r.status, 200); const sup = r.body.token;

r = await call('POST', '/admin/houses', { token: sup, body: { name: 'Brandvorwerkstraße 59', housePassword: 'haus123' } });
assert.equal(r.status, 200); assert.equal(r.body.slug, 'brandvorwerkstrasse-59');
const slug = r.body.slug;

r = await call('GET', '/house', { query: { slug } }); assert.equal(r.body.name, 'Brandvorwerkstraße 59');
r = await call('POST', '/join', { body: { slug, housePassword: 'nein', name: 'Eric', password: 'geheim1' } }); assert.equal(r.status, 403);
r = await call('POST', '/join', { body: { slug, housePassword: 'haus123', name: 'Eric', password: 'geheim1', contact: '3. OG' } }); assert.equal(r.status, 200);
const eric = r.body.token;
r = await call('POST', '/join', { body: { slug, housePassword: 'haus123', name: 'eric', password: 'geheim1' } }); assert.equal(r.status, 409);
r = await call('POST', '/join', { body: { slug, housePassword: 'haus123', name: 'Frau Schulz', password: 'blumen1' } });
const schulz = r.body.token;

r = await call('POST', '/items/things', { token: eric, body: { title: 'Bohrmaschine', text: 'mit Steinbohrern', status: 'frei', evil: 'x' } });
assert.equal(r.status, 200); assert.equal(r.body.evil, undefined); const drill = r.body.id;
r = await call('PUT', `/items/things/${drill}`, { token: schulz, body: { title: 'meins' } }); assert.equal(r.status, 403);
r = await call('DELETE', `/items/things/${drill}`, { token: schulz }); assert.equal(r.status, 403);
r = await call('PUT', `/items/things/${drill}`, { token: eric, body: { status: 'verliehen', lentTo: 'Frau Schulz', returnDate: '2026-12-01' } }); assert.equal(r.body.status, 'verliehen');

r = await call('POST', '/items/defects', { token: schulz, body: { title: 'Haustür schließt nicht' } });
const def = r.body.id;
r = await call('POST', `/items/defects/${def}/affect`, { token: eric }); assert.equal(r.body.affected.length, 2);
r = await call('POST', '/items/polls', { token: eric, body: { title: 'Hoffest?', options: ['Sa', 'So'] } }); assert.equal(r.status, 403); // Modul aus

r = await call('PUT', '/admin/house', { token: sup, query: { slug }, body: { modules: ['things', 'polls', 'defects'] } }); assert.equal(r.status, 200);
r = await call('POST', '/items/polls', { token: eric, body: { title: 'Hoffest?', options: ['Sa', 'So'] } }); assert.equal(r.status, 200);
r = await call('POST', `/items/polls/${r.body.id}/vote`, { token: schulz, body: { option: 1 } }); assert.equal(Object.values(r.body.votes)[0], 1);

r = await call('GET', '/state', { token: schulz }); assert.equal(r.status, 200);
assert.equal(r.body.users.length, 2); assert.equal(r.body.users[0].pass, undefined);
assert.ok(r.body.data.things.length === 1 && r.body.data.polls.length === 1);

// Admin-Rechte für Eric durch Gesamtverwaltung
const ericId = r.body.users.find((u) => u.name === 'Eric').id;
const schulzId = r.body.users.find((u) => u.name === 'Frau Schulz').id;
r = await call('POST', `/admin/users/${schulzId}/admin`, { token: eric, body: { admin: true } }); assert.equal(r.status, 403);
r = await call('POST', `/admin/users/${ericId}/admin`, { token: sup, query: { slug }, body: { admin: true } }); assert.equal(r.status, 200);
r = await call('POST', `/admin/users/${schulzId}/reset`, { token: eric, body: { password: 'neu1234' } }); assert.equal(r.status, 200);
r = await call('GET', '/state', { token: schulz }); assert.equal(r.status, 401); // altes Login ungültig
r = await call('POST', '/login', { body: { slug, name: 'frau schulz', password: 'neu1234' } }); assert.equal(r.status, 200);

// Bild
const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5]).toString('base64');
r = await call('POST', '/upload', { token: eric, body: { data: jpg } }); assert.equal(r.status, 200);
r = await call('GET', '/img', { query: { t: eric, f: r.body.photo } }); assert.equal(r.body.__binary, jpg);

// Feedback
r = await call('POST', '/feedback', { token: eric, body: { text: 'Knopf geht nicht', screenshot: jpg } }); assert.equal(r.status, 200);
r = await call('GET', '/admin/feedback', { token: eric }); assert.equal(r.body.length, 1);

// Löschen eines Zugangs entfernt Einträge
r = await call('DELETE', `/admin/users/${schulzId}`, { token: eric }); assert.equal(r.status, 200);
r = await call('GET', '/state', { token: eric });
assert.equal(r.body.data.defects.length, 0); assert.equal(Object.keys(r.body.data.polls[0].votes).length, 0);

// Passwort-Raten wird gebremst
for (let i = 0; i < 8; i++) await call('POST', '/login', { body: { slug, name: 'Eric', password: 'x' } });
r = await call('POST', '/login', { body: { slug, name: 'Eric', password: 'geheim1' } }); assert.equal(r.status, 429);

// Namen ändern
r = await call('PUT', '/me', { token: eric, body: { name: 'Eric E.' } }); assert.equal(r.body.me.name, 'Eric E.');
r = await call('POST', '/login', { body: { slug, name: 'eric e.', password: 'geheim1' } }); assert.equal(r.status, 429); // noch gesperrt vom Rate-Limit-Test
// Texte
r = await call('PUT', '/admin/texts', { token: sup, body: { key: 'was_intro', value: 'Global' } }); assert.equal(r.body.scope, 'global');
r = await call('PUT', '/admin/texts', { token: eric, body: { key: 'was_intro', value: 'Nur Haus' } }); assert.equal(r.body.scope, 'house');
r = await call('GET', '/texts', { query: { slug } }); assert.equal(r.body.global.was_intro, 'Global'); assert.equal(r.body.house.was_intro, 'Nur Haus');
r = await call('PUT', '/admin/texts', { token: eric, body: { key: 'was_intro', value: null } });
r = await call('GET', '/texts', { query: { slug } }); assert.equal(r.body.house.was_intro, undefined);
r = await call('PUT', '/admin/texts', { token: eric, body: { key: '../x', value: 'a' } }); assert.equal(r.status, 400);
console.log('Alle Kern-Tests bestanden ✓');
