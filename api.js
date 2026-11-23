// Allmende – Verbindung zum Worker (live) oder zur lokalen Demo
import { API_URL } from './config.js';
import { createCore } from './core.js';

const params = new URLSearchParams(location.search);
export const DEMO = !API_URL || params.has('demo');
const PFX = DEMO ? 'allmende-demo:' : 'allmende:';

export const session = {
  get token() { return localStorage.getItem(PFX + 'token') || ''; },
  set token(v) { v ? localStorage.setItem(PFX + 'token', v) : localStorage.removeItem(PFX + 'token'); },
  get slug() { return localStorage.getItem(PFX + 'slug') || ''; },
  set slug(v) { v ? localStorage.setItem(PFX + 'slug', v) : localStorage.removeItem(PFX + 'slug'); },
  get isSuper() { return localStorage.getItem(PFX + 'super') === '1'; },
  set isSuper(v) { v ? localStorage.setItem(PFX + 'super', '1') : localStorage.removeItem(PFX + 'super'); },
  pref(key, val) {
    if (val === undefined) return localStorage.getItem(PFX + 'pref:' + key);
    val === null ? localStorage.removeItem(PFX + 'pref:' + key) : localStorage.setItem(PFX + 'pref:' + key, val);
  },
  clear() { this.token = ''; this.isSuper = false; },
};

// ---------- Demo: alles im Browser ----------
let demoCore = null;
const DEMO_ADMIN = 'demo-admin-schluessel';
const demoStore = {
  async read(p) { const v = localStorage.getItem('allmende-demo-db:' + p); if (!v) return null; const o = JSON.parse(v); return { data: o.d, sha: o.s }; },
  async write(p, data, sha) {
    const cur = localStorage.getItem('allmende-demo-db:' + p);
    if (cur && JSON.parse(cur).s !== sha) { const e = new Error('Konflikt'); e.conflict = true; throw e; }
    try { localStorage.setItem('allmende-demo-db:' + p, JSON.stringify({ d: data, s: Math.random().toString(36).slice(2) })); }
    catch { throw new Error('Der Demo-Speicher auf diesem Gerät ist voll.'); }
  },
  async readBin(p) { return localStorage.getItem('allmende-demo-db:' + p); },
  async writeBin(p, b) {
    try { localStorage.setItem('allmende-demo-db:' + p, b); } catch { throw new Error('Der Demo-Speicher ist voll – bitte kleinere oder weniger Bilder.'); }
  },
  async remove(p) { localStorage.removeItem('allmende-demo-db:' + p); },
};

async function demoCall(method, path, body, query = {}) {
  if (!demoCore) {
    demoCore = createCore(demoStore, { adminKey: DEMO_ADMIN, sessionSecret: 'demo-session-secret-nur-lokal' });
    if (!localStorage.getItem('allmende-demo-db:houses.json')) await seedDemo();
  }
  const res = await demoCore.handle({ method, path, body, query, token: session.token, ip: 'demo' });
  if (res.status !== 200) { const e = new Error(res.body.error || 'Fehler'); e.status = res.status; throw e; }
  return res.body;
}

async function seedDemo() {
  const h = (m, p, b, t, q) => demoCore.handle({ method: m, path: p, body: b, token: t, query: q || {}, ip: 'seed' }).then((r) => r.body);
  const sup = (await h('POST', '/admin/login', { key: DEMO_ADMIN })).token;
  const slug = (await h('POST', '/admin/houses', { name: 'Demo-Haus · Lindenstraße 1', slug: 'demo', housePassword: 'demo123' }, sup)).slug;
  const join = async (name, contact) => (await h('POST', '/join', { slug, housePassword: 'demo123', name, password: 'demo123', contact })).token;
  const eric = await join('Eric', '3. OG links – einfach klingeln oder in der Hausgruppe schreiben');
  const schulz = await join('Frau Schulz', 'EG rechts, bin meist vormittags da');
  const mo = await join('Mo', 'Dachgeschoss, am besten per Hausgruppe');
  const lina = await join('Lina', '2. OG Mitte');
  const st = await h('GET', '/state', null, eric);
  await h('POST', `/admin/users/${st.me.id}/admin`, { admin: true }, sup, { slug });
  const d = (days) => { const x = new Date(); x.setDate(x.getDate() + days); return x.toISOString().slice(0, 10); };
  const add = (t, col, b) => h('POST', '/items/' + col, b, t);
  await add(eric, 'things', { title: 'Bohrmaschine mit Schlagfunktion', text: 'Inkl. Holz- und Steinbohrern (4–10 mm).', category: 'Werkzeug', status: 'frei' });
  await add(eric, 'things', { title: 'Leiter (3 m)', text: 'Stehleiter, steht im Keller.', category: 'Werkzeug', status: 'frei', contact: 'Steht im Keller, Abteil 7 – Schlüssel bei mir.' });
  await add(eric, 'things', { title: 'Dörrgerät', text: 'Für Apfelchips, Tomaten, Kräuter.', category: 'Küche', status: 'verliehen', lentTo: 'Lina', returnDate: d(-1) });
  await add(schulz, 'things', { title: 'Schlittschuhe Gr. 39', category: 'Freizeit & Sport', status: 'frei' });
  await add(schulz, 'things', { title: 'Pömpel & Rohrreinigerbürste', text: 'Wenn der Abfluss streikt.', category: 'Haushalt', status: 'frei' });
  await add(mo, 'things', { title: 'Stichsäge', category: 'Werkzeug', status: 'frei' });
  await add(eric, 'skills', { title: 'Lampen anbringen', text: 'Deckenlampen, Wandleuchten – bring ich gern mit dran.' });
  await add(eric, 'skills', { title: 'Kleine Klempner-Sachen', text: 'Siphon, tropfender Hahn, Duschkopf.' });
  await add(eric, 'skills', { title: 'Handpoke-Tattoos', text: 'Kostenlos, nach Absprache.' });
  await add(lina, 'skills', { title: 'Nachhilfe Mathe & Englisch', text: 'Bis 10. Klasse.' });
  await add(schulz, 'skills', { title: 'Hosen kürzen, Knöpfe annähen', text: 'Habe eine Nähmaschine.' });
  await add(mo, 'requests', { title: 'Wer hilft am Samstag beim Schrank tragen?', text: 'Dauert ca. 20 Minuten, Kaffee gibt’s danach.' });
  await add(eric, 'events', { title: 'Ista liest Heizungszähler ab', text: 'Zwischen 8 und 12 Uhr, bitte Zugang ermöglichen.', date: d(5), time: '08:00', kind: 'info' });
  await add(lina, 'events', { title: 'Geburtstag – es wird etwas lauter', text: 'Ab 20 Uhr, Nachbar*innen sind herzlich eingeladen!', date: d(9), time: '20:00', kind: 'laut' });
  await add(mo, 'events', { title: 'Skat-Abend im Hof', text: 'Karten sind da, bringt Getränke mit.', date: d(12), time: '19:00', kind: 'einladung' });
  await add(schulz, 'gifts', { title: 'Puzzle 1000 Teile (Leipzig bei Nacht)', text: 'Vollständig, einmal gepuzzelt.', kind: 'ding' });
  await add(lina, 'gifts', { title: 'Linsensuppe, ca. 3 Portionen', text: 'Heute gekocht, vegan.', kind: 'essen' });
  await add(mo, 'away', { kind: 'weg', from: d(3), to: d(10), text: 'Wer kann zweimal Blumen gießen? Schlüssel bekommst du vorher.' });
  await add(schulz, 'away', { kind: 'da', from: d(0), text: 'Bin den ganzen Tag da und nehme Pakete an.' });
  await add(schulz, 'defects', { title: 'Haustür fällt nicht ins Schloss', place: 'Haustür', since: d(-21), status: 'gemeldet', text: 'Seit drei Wochen, Hausverwaltung ist informiert.' });
  await add(eric, 'info', { title: 'Müllabfuhr', text: 'Restmüll: dienstags\nGelbe Tonne: jeden 2. Freitag\nPapier: alle 4 Wochen montags' });
  await add(schulz, 'info', { title: 'Hausverwaltung & Notfall', text: 'Hausverwaltung: Muster GmbH, Tel. 0341 000000\nHeizung/Wasser-Notdienst: 0341 111111\nWasserhaupthahn: Keller, links neben der Tür' });
}

// ---------- gemeinsame Aufruf-Funktion ----------
export async function call(method, path, body, query = {}) {
  if (session.isSuper && session.slug && !query.slug) query = { ...query, slug: session.slug };
  if (DEMO) return demoCall(method, path, body, query);
  const qs = new URLSearchParams(query).toString();
  let r;
  try {
    r = await fetch(API_URL.replace(/\/$/, '') + path + (qs ? '?' + qs : ''), {
      method,
      headers: { ...(session.token ? { Authorization: 'Bearer ' + session.token } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    const e = new Error('Keine Verbindung. Bist du online?'); e.status = 0; throw e;
  }
  let data = {};
  try { data = await r.json(); } catch {}
  if (!r.ok) { const e = new Error(data.error || 'Fehler ' + r.status); e.status = r.status; throw e; }
  return data;
}

export function imgSrc(file) {
  if (!file) return '';
  if (DEMO) {
    const b = localStorage.getItem(`allmende-demo-db:houses/${session.slug}/img/${file}`);
    return b ? 'data:image/jpeg;base64,' + b : '';
  }
  const q = new URLSearchParams({ f: file, t: session.token });
  if (session.isSuper) q.set('slug', session.slug);
  return API_URL.replace(/\/$/, '') + '/img?' + q;
}

export function resetDemo() {
  Object.keys(localStorage).filter((k) => k.startsWith('allmende-demo')).forEach((k) => localStorage.removeItem(k));
}
