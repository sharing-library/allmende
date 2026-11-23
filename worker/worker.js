// Allmende – teilgut · Cloudflare Worker
// Diese Datei komplett bei Cloudflare unter „Edit code“ einfügen.
// Automatisch erzeugt aus core.js und worker/worker-main.js – bitte dort ändern.

// Allmende – teilgut · Kernlogik
// Diese Datei wird zweimal verwendet:
//  1. im Browser für den Demo-Modus (Daten nur auf dem Gerät)
//  2. im Cloudflare Worker (Daten im privaten GitHub-Repo)
// Sie enthält alle Regeln: wer darf was sehen, anlegen, ändern, löschen.

const ALL_MODULES = ['things', 'skills', 'requests', 'gifts', 'events', 'away', 'defects', 'info', 'rides', 'polls', 'thanks'];
const DEFAULT_MODULES = ['things', 'skills', 'requests', 'gifts', 'events', 'away', 'defects', 'info'];

// Erlaubte Felder je Bereich und ihre Maximallänge
const SCHEMA = {
  things:   { title: 80, text: 600, category: 40, photo: 60, status: 20, lentTo: 80, returnDate: 10, contact: 200 },
  skills:   { title: 80, text: 600, contact: 200 },
  requests: { title: 80, text: 600, contact: 200 },
  gifts:    { title: 80, text: 600, photo: 60, kind: 20, status: 20, contact: 200 },
  events:   { title: 80, text: 600, date: 10, time: 5, endDate: 10, kind: 20 },
  away:     { kind: 10, from: 10, to: 10, text: 400 },
  defects:  { title: 80, text: 600, place: 80, photo: 60, since: 10, status: 20 },
  info:     { title: 80, text: 3000 },
  rides:    { title: 80, text: 400, date: 10, time: 5 },
  polls:    { title: 120, text: 600, options: 'options', closed: 'bool' },
  thanks:   { to: 80, text: 400 },
};
const REQUIRED = {
  things: ['title'], skills: ['title'], requests: ['title'], gifts: ['title'], events: ['title', 'date'],
  away: ['kind', 'from'], defects: ['title'], info: ['title'], rides: ['title', 'date'], polls: ['title', 'options'], thanks: ['text'],
};

const PBKDF2_ITER = 20000;
const SESSION_DAYS = 180;
const MAX_IMG_B64 = 900_000; // ca. 650 KB Bild

// ---------- kleine Helfer ----------
const enc = new TextEncoder();
const dec = new TextDecoder();

function b64encode(bytes) {
  let s = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) s += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  return btoa(s);
}
function b64decode(str) {
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const b64url = (bytes) => b64encode(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64urlDecode = (s) => b64decode(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));

function newId() {
  const r = crypto.getRandomValues(new Uint8Array(8));
  return Date.now().toString(36) + Array.from(r, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 8);
}

function slugify(name) {
  return String(name).toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, msg) => { throw new ApiError(status, msg); };

function str(v, max) {
  if (v === undefined || v === null) return '';
  return String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
}

async function hashPassword(password, saltB64) {
  const salt = saltB64 ? b64decode(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITER }, key, 256);
  return { hash: b64encode(new Uint8Array(bits)), salt: b64encode(salt) };
}
function safeEqual(a, b) {
  a = String(a); b = String(b);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
async function verifyPassword(password, rec) {
  if (!rec || !rec.hash) return false;
  const { hash } = await hashPassword(password, rec.salt);
  return safeEqual(hash, rec.hash);
}

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data))));
}

// ---------- Kern ----------
// store: { read(path) -> {data, sha}|null, write(path, data, sha), readBin(path) -> base64|null, writeBin(path, base64), remove(path) }
// config: { adminKey, sessionSecret }
function createCore(store, config) {
  if (!config.sessionSecret || config.sessionSecret.length < 16) throw new Error('SESSION_SECRET fehlt oder ist zu kurz');
  const failedLogins = new Map(); // einfacher Schutz gegen Passwort-Raten

  function checkRate(key) {
    const now = Date.now();
    const e = failedLogins.get(key);
    if (e && e.until > now && e.count >= 8) fail(429, 'Zu viele Fehlversuche. Bitte in 10 Minuten noch einmal probieren.');
  }
  function noteFail(key) {
    const now = Date.now();
    const e = failedLogins.get(key);
    if (!e || e.until < now) failedLogins.set(key, { count: 1, until: now + 10 * 60 * 1000 });
    else e.count++;
    if (failedLogins.size > 5000) failedLogins.clear();
  }

  async function update(path, init, fn) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const r = await store.read(path);
      const data = r ? r.data : init();
      const result = await fn(data);
      try {
        await store.write(path, data, r ? r.sha : undefined);
        return result;
      } catch (e) {
        if (e && e.conflict && attempt < 4) { await new Promise((res) => setTimeout(res, 150 * (attempt + 1))); continue; }
        throw e;
      }
    }
  }
  const readData = async (path, init) => { const r = await store.read(path); return r ? r.data : init(); };

  const P = {
    index: 'houses.json',
    house: (s) => `houses/${s}/house.json`,
    users: (s) => `houses/${s}/users.json`,
    col: (s, c) => `houses/${s}/${c}.json`,
    feedback: (s) => `houses/${s}/feedback.json`,
    img: (s, f) => `houses/${s}/img/${f}`,
  };

  async function makeToken(payload) {
    const body = b64url(enc.encode(JSON.stringify({ ...payload, e: Date.now() + SESSION_DAYS * 86400000 })));
    return body + '.' + (await hmac(config.sessionSecret, body));
  }
  async function readToken(token) {
    if (!token || typeof token !== 'string' || !token.includes('.')) return null;
    const [body, sig] = token.split('.');
    if (!safeEqual(sig, await hmac(config.sessionSecret, body))) return null;
    try {
      const p = JSON.parse(dec.decode(b64urlDecode(body)));
      if (!p.e || p.e < Date.now()) return null;
      return p;
    } catch { return null; }
  }

  async function getHouse(slug) {
    if (!/^[a-z0-9-]{1,60}$/.test(slug || '')) fail(404, 'Dieses Haus gibt es nicht.');
    const h = await readData(P.house(slug), () => null);
    if (!h) fail(404, 'Dieses Haus gibt es nicht.');
    return h;
  }

  // Wer fragt an? Liefert {slug, user, isAdmin, isSuper}
  async function auth(token, query, { needAdmin = false, needSuper = false } = {}) {
    const t = await readToken(token);
    if (!t) fail(401, 'Bitte neu anmelden.');
    if (t.r === 'super') {
      const slug = query.slug || null;
      return { slug, user: null, isAdmin: true, isSuper: true };
    }
    if (needSuper) fail(403, 'Nur für die Gesamtverwaltung.');
    const users = await readData(P.users(t.h), () => ({ users: [] }));
    const user = users.users.find((u) => u.id === t.u);
    if (!user) fail(401, 'Dein Zugang existiert nicht mehr. Bitte neu registrieren.');
    if ((user.tv || 0) !== (t.v || 0)) fail(401, 'Dein Passwort wurde geändert. Bitte neu anmelden.');
    if (needAdmin && !user.admin) fail(403, 'Nur für Hausverwaltung.');
    return { slug: t.h, user, isAdmin: !!user.admin, isSuper: false };
  }
  const needSlug = (a) => { if (!a.slug) fail(400, 'Kein Haus gewählt.'); return a.slug; };

  const publicUser = (u) => ({ id: u.id, name: u.name, contact: u.contact || '', admin: !!u.admin, at: u.at });

  function cleanFields(col, body, existing) {
    const schema = SCHEMA[col];
    const out = {};
    for (const [k, spec] of Object.entries(schema)) {
      if (!(k in body)) continue;
      const v = body[k];
      if (spec === 'bool') out[k] = !!v;
      else if (spec === 'options') {
        if (existing && existing.votes && Object.keys(existing.votes).length) continue; // nach Abstimmungsbeginn fix
        const arr = Array.isArray(v) ? v.map((o) => str(o, 80)).filter(Boolean).slice(0, 8) : [];
        if (arr.length < 2) fail(400, 'Eine Umfrage braucht mindestens zwei Antwortmöglichkeiten.');
        out[k] = arr;
      } else out[k] = str(v, spec);
    }
    if (out.photo && !/^[a-z0-9]{6,30}\.jpg$/.test(out.photo)) out.photo = '';
    for (const k of ['date', 'endDate', 'from', 'to', 'returnDate', 'since']) {
      if (out[k] && !/^\d{4}-\d{2}-\d{2}$/.test(out[k])) out[k] = '';
    }
    if (out.time && !/^\d{2}:\d{2}$/.test(out.time)) out.time = '';
    return out;
  }

  function checkModule(house, col) {
    if (!SCHEMA[col]) fail(404, 'Unbekannter Bereich.');
    const mods = house.modules || DEFAULT_MODULES;
    if (!mods.includes(col)) fail(403, 'Dieser Bereich ist in diesem Haus ausgeschaltet.');
  }

  // ---------- Routen ----------
  const routes = {
    // öffentlich: Hausname zum Anzeigen auf der Anmeldeseite
    'GET /house': async ({ query }) => {
      const h = await getHouse(query.slug);
      return { slug: h.slug, name: h.name };
    },

    'POST /join': async ({ body, ip }) => {
      const slug = str(body.slug, 60);
      const rk = 'join:' + ip + ':' + slug;
      checkRate(rk);
      const house = await getHouse(slug);
      if (!(await verifyPassword(String(body.housePassword || ''), house.pass))) { noteFail(rk); fail(403, 'Das Hauspasswort stimmt nicht.'); }
      const name = str(body.name, 40);
      const password = String(body.password || '');
      if (name.length < 2) fail(400, 'Der Name braucht mindestens 2 Zeichen.');
      if (password.length < 6) fail(400, 'Das Passwort braucht mindestens 6 Zeichen.');
      const pass = await hashPassword(password);
      const user = await update(P.users(slug), () => ({ users: [] }), (d) => {
        if (d.users.some((u) => u.name.toLowerCase() === name.toLowerCase())) fail(409, 'Diesen Namen gibt es in diesem Haus schon. Bitte einen anderen wählen.');
        const u = { id: newId(), name, contact: str(body.contact, 200), pass, admin: false, tv: 0, at: new Date().toISOString() };
        d.users.push(u);
        return u;
      });
      return { token: await makeToken({ h: slug, u: user.id, r: 'user', v: 0 }) };
    },

    'POST /login': async ({ body, ip }) => {
      const slug = str(body.slug, 60);
      const rk = 'login:' + ip + ':' + slug;
      checkRate(rk);
      await getHouse(slug);
      const name = str(body.name, 40).toLowerCase();
      const users = await readData(P.users(slug), () => ({ users: [] }));
      const user = users.users.find((u) => u.name.toLowerCase() === name);
      if (!user || !(await verifyPassword(String(body.password || ''), user.pass))) { noteFail(rk); fail(403, 'Name oder Passwort stimmen nicht.'); }
      return { token: await makeToken({ h: slug, u: user.id, r: 'user', v: user.tv || 0 }) };
    },

    'POST /admin/login': async ({ body, ip }) => {
      const rk = 'admin:' + ip;
      checkRate(rk);
      if (!config.adminKey || config.adminKey.length < 12 || !safeEqual(String(body.key || ''), config.adminKey)) { noteFail(rk); fail(403, 'Admin-Schlüssel stimmt nicht.'); }
      return { token: await makeToken({ r: 'super' }) };
    },

    'GET /state': async ({ token, query }) => {
      const a = await auth(token, query);
      const slug = needSlug(a);
      const house = await getHouse(slug);
      const mods = house.modules || DEFAULT_MODULES;
      const [users, ...cols] = await Promise.all([
        readData(P.users(slug), () => ({ users: [] })),
        ...mods.map((c) => readData(P.col(slug, c), () => ({ items: [] }))),
      ]);
      const data = {};
      mods.forEach((c, i) => { data[c] = cols[i].items; });
      // „verliehen an“ sehen nur Besitzer*in und Verwaltung
      if (data.things && !a.isAdmin) data.things = data.things.map((t) => (t.by === a.user.id || !t.lentTo ? t : { ...t, lentTo: '' }));
      return {
        house: { slug, name: house.name, modules: mods },
        me: a.user ? publicUser(a.user) : { id: '__super', name: 'Gesamtverwaltung', contact: '', admin: true, super: true },
        users: users.users.map(publicUser),
        data,
      };
    },

    'POST /items/:col': async ({ token, query, body, params }) => {
      const a = await auth(token, query);
      const slug = needSlug(a);
      const house = await getHouse(slug);
      checkModule(house, params.col);
      if (a.isSuper) fail(403, 'Die Gesamtverwaltung kann keine eigenen Einträge anlegen. Bitte mit deinem Haus-Zugang anmelden.');
      const fields = cleanFields(params.col, body || {});
      for (const r of REQUIRED[params.col]) if (!fields[r] || (Array.isArray(fields[r]) && !fields[r].length)) fail(400, 'Bitte alle Pflichtfelder ausfüllen.');
      const now = new Date().toISOString();
      const item = { id: newId(), by: a.user.id, at: now, up: now, ...fields };
      if (params.col === 'defects') item.affected = [a.user.id];
      if (params.col === 'polls') item.votes = {};
      await update(P.col(slug, params.col), () => ({ items: [] }), (d) => {
        if (d.items.length >= 2000) fail(400, 'Dieser Bereich ist voll. Bitte alte Einträge löschen.');
        d.items.push(item);
      });
      return item;
    },

    'PUT /items/:col/:id': async ({ token, query, body, params }) => {
      const a = await auth(token, query);
      const slug = needSlug(a);
      const house = await getHouse(slug);
      checkModule(house, params.col);
      let oldPhoto = null;
      const item = await update(P.col(slug, params.col), () => ({ items: [] }), (d) => {
        const it = d.items.find((x) => x.id === params.id);
        if (!it) fail(404, 'Eintrag nicht gefunden.');
        if (it.by !== a.user?.id && !a.isAdmin) fail(403, 'Du kannst nur deine eigenen Einträge ändern.');
        const fields = cleanFields(params.col, body || {}, it);
        if ('photo' in fields && it.photo && fields.photo !== it.photo) oldPhoto = it.photo;
        Object.assign(it, fields, { up: new Date().toISOString() });
        for (const r of REQUIRED[params.col]) if (!it[r]) fail(400, 'Bitte alle Pflichtfelder ausfüllen.');
        return it;
      });
      if (oldPhoto && store.remove) await store.remove(P.img(slug, oldPhoto)).catch(() => {});
      return item;
    },

    'DELETE /items/:col/:id': async ({ token, query, params }) => {
      const a = await auth(token, query);
      const slug = needSlug(a);
      if (!SCHEMA[params.col]) fail(404, 'Unbekannter Bereich.');
      let photo = null;
      await update(P.col(slug, params.col), () => ({ items: [] }), (d) => {
        const i = d.items.findIndex((x) => x.id === params.id);
        if (i < 0) fail(404, 'Eintrag nicht gefunden.');
        if (d.items[i].by !== a.user?.id && !a.isAdmin) fail(403, 'Du kannst nur deine eigenen Einträge löschen.');
        photo = d.items[i].photo;
        d.items.splice(i, 1);
      });
      if (photo && store.remove) await store.remove(P.img(slug, photo)).catch(() => {});
      return { ok: true };
    },

    // „Betrifft mich auch“ bei Mängeln
    'POST /items/defects/:id/affect': async ({ token, query, params }) => {
      const a = await auth(token, query);
      if (a.isSuper) fail(403, 'Nur mit Haus-Zugang möglich.');
      const slug = needSlug(a);
      checkModule(await getHouse(slug), 'defects');
      return update(P.col(slug, 'defects'), () => ({ items: [] }), (d) => {
        const it = d.items.find((x) => x.id === params.id);
        if (!it) fail(404, 'Eintrag nicht gefunden.');
        it.affected = it.affected || [];
        const i = it.affected.indexOf(a.user.id);
        if (i >= 0) it.affected.splice(i, 1); else it.affected.push(a.user.id);
        return it;
      });
    },

    // Abstimmen bei Umfragen
    'POST /items/polls/:id/vote': async ({ token, query, params, body }) => {
      const a = await auth(token, query);
      if (a.isSuper) fail(403, 'Nur mit Haus-Zugang möglich.');
      const slug = needSlug(a);
      checkModule(await getHouse(slug), 'polls');
      return update(P.col(slug, 'polls'), () => ({ items: [] }), (d) => {
        const it = d.items.find((x) => x.id === params.id);
        if (!it) fail(404, 'Umfrage nicht gefunden.');
        if (it.closed) fail(400, 'Diese Umfrage ist beendet.');
        it.votes = it.votes || {};
        const opt = Number(body?.option);
        if (body?.option === null || body?.option === undefined) delete it.votes[a.user.id];
        else if (Number.isInteger(opt) && opt >= 0 && opt < it.options.length) it.votes[a.user.id] = opt;
        else fail(400, 'Ungültige Auswahl.');
        return it;
      });
    },

    'PUT /me': async ({ token, query, body }) => {
      const a = await auth(token, query);
      if (a.isSuper) fail(400, 'Die Gesamtverwaltung hat kein Profil.');
      let newPass = null;
      if (body.password !== undefined) {
        if (!(await verifyPassword(String(body.oldPassword || ''), a.user.pass))) fail(403, 'Das bisherige Passwort stimmt nicht.');
        if (String(body.password).length < 6) fail(400, 'Das neue Passwort braucht mindestens 6 Zeichen.');
        newPass = await hashPassword(String(body.password));
      }
      const u = await update(P.users(a.slug), () => ({ users: [] }), (d) => {
        const u = d.users.find((x) => x.id === a.user.id);
        if (!u) fail(404, 'Zugang nicht gefunden.');
        if (body.contact !== undefined) u.contact = str(body.contact, 200);
        if (body.name !== undefined) {
          const name = str(body.name, 40);
          if (name.length < 2) fail(400, 'Der Name braucht mindestens 2 Zeichen.');
          if (d.users.some((x) => x.id !== u.id && x.name.toLowerCase() === name.toLowerCase())) fail(409, 'Diesen Namen gibt es in diesem Haus schon.');
          u.name = name;
        }
        if (newPass) { u.pass = newPass; u.tv = (u.tv || 0) + 1; }
        return u;
      });
      const out = { me: publicUser(u) };
      if (newPass) out.token = await makeToken({ h: a.slug, u: u.id, r: 'user', v: u.tv });
      return out;
    },

    'DELETE /me': async ({ token, query }) => {
      const a = await auth(token, query);
      if (a.isSuper) fail(400, 'Die Gesamtverwaltung hat kein Profil.');
      await removeUser(a.slug, a.user.id);
      return { ok: true };
    },

    'POST /upload': async ({ token, query, body }) => {
      const a = await auth(token, query);
      const slug = needSlug(a);
      const data = String(body.data || '').replace(/^data:image\/jpeg;base64,/, '');
      if (!data || data.length > MAX_IMG_B64 || !/^[A-Za-z0-9+/=]+$/.test(data)) fail(400, 'Das Bild ist zu groß oder ungültig.');
      const head = b64decode(data.slice(0, 8));
      if (head[0] !== 0xff || head[1] !== 0xd8) fail(400, 'Nur JPEG-Bilder erlaubt.');
      const file = newId() + '.jpg';
      await store.writeBin(P.img(slug, file), data);
      return { photo: file };
    },

    'GET /img': async ({ query }) => {
      // Token kommt als Parameter, weil <img> keine Header schicken kann
      const a = await auth(query.t, query);
      const slug = needSlug(a);
      const f = String(query.f || '');
      if (!/^[a-z0-9]{6,30}\.jpg$/.test(f)) fail(404, 'Bild nicht gefunden.');
      const data = await store.readBin(P.img(slug, f));
      if (!data) fail(404, 'Bild nicht gefunden.');
      return { __binary: data, __mime: 'image/jpeg' };
    },

    'POST /feedback': async ({ token, query, body }) => {
      const a = await auth(token, query);
      const slug = needSlug(a);
      const text = str(body.text, 2000);
      if (text.length < 3) fail(400, 'Bitte kurz beschreiben, worum es geht.');
      let shot = '';
      if (body.screenshot) {
        const data = String(body.screenshot).replace(/^data:image\/jpeg;base64,/, '');
        if (data.length <= MAX_IMG_B64 && /^[A-Za-z0-9+/=]+$/.test(data)) {
          shot = newId() + '.jpg';
          await store.writeBin(P.img(slug, shot), data);
        }
      }
      await update(P.feedback(slug), () => ({ items: [] }), (d) => {
        d.items.push({ id: newId(), by: a.user?.name || 'Gesamtverwaltung', text, screenshot: shot, page: str(body.page, 60), ua: str(body.ua, 200), at: new Date().toISOString() });
        if (d.items.length > 500) d.items.splice(0, d.items.length - 500);
      });
      return { ok: true };
    },

    // ---------- Texte (Was ist das hier? usw.) ----------
    // Öffentlich lesbar, damit sie schon vor der Anmeldung angezeigt werden.
    'GET /texts': async ({ query }) => {
      const global = (await readData('texts.json', () => ({ texts: {} }))).texts;
      let house = {};
      if (/^[a-z0-9-]{1,60}$/.test(query.slug || '') && (await store.read(P.house(query.slug)))) {
        house = (await readData(`houses/${query.slug}/texts.json`, () => ({ texts: {} }))).texts;
      }
      return { global, house };
    },
    // Gesamtverwaltung ändert Texte für alle Häuser, Haus-Verwaltung nur für ihr Haus
    'PUT /admin/texts': async ({ token, query, body }) => {
      const a = await auth(token, query, { needAdmin: true });
      const key = String(body.key || '');
      if (!/^[a-z0-9_]{1,40}$/.test(key)) fail(400, 'Ungültiger Text-Schlüssel.');
      const value = body.value === null || body.value === undefined ? null : String(body.value).replace(/\r/g, '').slice(0, 5000);
      const path = a.isSuper ? 'texts.json' : `houses/${needSlug(a)}/texts.json`;
      await update(path, () => ({ texts: {} }), (d) => {
        if (value === null) delete d.texts[key];
        else { if (Object.keys(d.texts).length >= 400 && !(key in d.texts)) fail(400, 'Zu viele Texte.'); d.texts[key] = value; }
      });
      return { ok: true, scope: a.isSuper ? 'global' : 'house' };
    },

    // ---------- Verwaltung ----------
    'GET /admin/feedback': async ({ token, query }) => {
      const a = await auth(token, query, { needAdmin: true });
      const slug = needSlug(a);
      return (await readData(P.feedback(slug), () => ({ items: [] }))).items;
    },
    'DELETE /admin/feedback/:id': async ({ token, query, params }) => {
      const a = await auth(token, query, { needAdmin: true });
      const slug = needSlug(a);
      let shot = null;
      await update(P.feedback(slug), () => ({ items: [] }), (d) => {
        const i = d.items.findIndex((x) => x.id === params.id);
        if (i >= 0) { shot = d.items[i].screenshot; d.items.splice(i, 1); }
      });
      if (shot && store.remove) await store.remove(P.img(slug, shot)).catch(() => {});
      return { ok: true };
    },

    'POST /admin/users/:id/reset': async ({ token, query, params, body }) => {
      const a = await auth(token, query, { needAdmin: true });
      const slug = needSlug(a);
      const pw = String(body.password || '');
      if (pw.length < 6) fail(400, 'Das neue Passwort braucht mindestens 6 Zeichen.');
      const pass = await hashPassword(pw);
      await update(P.users(slug), () => ({ users: [] }), (d) => {
        const u = d.users.find((x) => x.id === params.id);
        if (!u) fail(404, 'Person nicht gefunden.');
        u.pass = pass; u.tv = (u.tv || 0) + 1;
      });
      return { ok: true };
    },
    'POST /admin/users/:id/admin': async ({ token, query, params, body }) => {
      const a = await auth(token, query, { needSuper: true });
      const slug = needSlug(a);
      await update(P.users(slug), () => ({ users: [] }), (d) => {
        const u = d.users.find((x) => x.id === params.id);
        if (!u) fail(404, 'Person nicht gefunden.');
        u.admin = !!body.admin;
      });
      return { ok: true };
    },
    'DELETE /admin/users/:id': async ({ token, query, params }) => {
      const a = await auth(token, query, { needAdmin: true });
      const slug = needSlug(a);
      if (a.user && a.user.id === params.id) fail(400, 'Den eigenen Zugang bitte im Profil löschen.');
      await removeUser(slug, params.id);
      return { ok: true };
    },
    'PUT /admin/house': async ({ token, query, body }) => {
      const a = await auth(token, query, { needAdmin: true });
      const slug = needSlug(a);
      let pass = null;
      if (body.housePassword) {
        if (String(body.housePassword).length < 6) fail(400, 'Das Hauspasswort braucht mindestens 6 Zeichen.');
        pass = await hashPassword(String(body.housePassword));
      }
      return update(P.house(slug), () => null, (h) => {
        if (!h) fail(404, 'Dieses Haus gibt es nicht.');
        if (body.name) h.name = str(body.name, 80);
        if (pass) h.pass = pass;
        if (Array.isArray(body.modules)) h.modules = ALL_MODULES.filter((m) => body.modules.includes(m));
        return { slug: h.slug, name: h.name, modules: h.modules };
      });
    },
    'GET /admin/houses': async ({ token, query }) => {
      await auth(token, query, { needSuper: true });
      return (await readData(P.index, () => ({ houses: [] }))).houses;
    },
    'POST /admin/houses': async ({ token, query, body }) => {
      await auth(token, query, { needSuper: true });
      const name = str(body.name, 80);
      const slug = slugify(body.slug || name);
      if (!slug) fail(400, 'Bitte einen Namen angeben.');
      if (String(body.housePassword || '').length < 6) fail(400, 'Das Hauspasswort braucht mindestens 6 Zeichen.');
      if (await store.read(P.house(slug))) fail(409, 'Ein Haus mit dieser Kennung gibt es schon.');
      const pass = await hashPassword(String(body.housePassword));
      const house = { slug, name, pass, modules: DEFAULT_MODULES.slice(), at: new Date().toISOString() };
      await store.write(P.house(slug), house);
      await update(P.index, () => ({ houses: [] }), (d) => { d.houses.push({ slug, name, at: house.at }); });
      return { slug, name };
    },
  };

  async function removeUser(slug, userId) {
    await update(P.users(slug), () => ({ users: [] }), (d) => {
      const i = d.users.findIndex((u) => u.id === userId);
      if (i < 0) fail(404, 'Person nicht gefunden.');
      d.users.splice(i, 1);
    });
    const house = await getHouse(slug);
    for (const c of ALL_MODULES) {
      const r = await store.read(P.col(slug, c));
      if (!r) continue;
      const photos = [];
      const has = r.data.items.some((it) => it.by === userId || (it.affected || []).includes(userId) || (it.votes && userId in it.votes));
      if (!has) continue;
      await update(P.col(slug, c), () => ({ items: [] }), (d) => {
        d.items = d.items.filter((it) => { if (it.by === userId) { if (it.photo) photos.push(it.photo); return false; } return true; });
        for (const it of d.items) {
          if (it.affected) it.affected = it.affected.filter((x) => x !== userId);
          if (it.votes) delete it.votes[userId];
        }
      });
      if (store.remove) for (const p of photos) await store.remove(P.img(slug, p)).catch(() => {});
    }
    return house;
  }

  // Anfrage verarbeiten: {method, path, query, body, token, ip} -> {status, body}
  async function handle(req) {
    const method = req.method.toUpperCase();
    const parts = req.path.replace(/\/+$/, '').split('/').filter(Boolean);
    let match = null;
    for (const key of Object.keys(routes)) {
      const [m, pattern] = key.split(' ');
      if (m !== method) continue;
      const pp = pattern.split('/').filter(Boolean);
      if (pp.length !== parts.length) continue;
      const params = {};
      let ok = true;
      for (let i = 0; i < pp.length; i++) {
        if (pp[i].startsWith(':')) params[pp[i].slice(1)] = decodeURIComponent(parts[i]);
        else if (pp[i] !== parts[i]) { ok = false; break; }
      }
      // feste Pfade haben Vorrang vor Platzhaltern
      if (ok && (!match || pp.filter((x) => !x.startsWith(':')).length > match.fixed)) match = { fn: routes[key], params, fixed: pp.filter((x) => !x.startsWith(':')).length };
    }
    if (!match) return { status: 404, body: { error: 'Nicht gefunden.' } };
    try {
      const out = await match.fn({ ...req, query: req.query || {}, body: req.body || {}, params: match.params });
      return { status: 200, body: out };
    } catch (e) {
      if (e instanceof ApiError) return { status: e.status, body: { error: e.message } };
      console.error(e);
      return { status: 500, body: { error: 'Da ist etwas schiefgelaufen. Bitte später noch einmal versuchen.' } };
    }
  }

  return { handle };
}

// ====================================================================
// Cloudflare-Worker-Teil: speichert alles im privaten GitHub-Repo
// ====================================================================

// ---- Einstellungen (nur ändern, wenn Account oder Repos anders heißen) ----
const GH_OWNER = 'sharing-library';
const DATA_REPO = 'allmende-data';
const BACKUP_REPO = 'allmende-backup';
const BRANCH = 'main';
const ALLOWED_ORIGINS = ['https://sharing-library.github.io', 'http://localhost:8080', 'http://127.0.0.1:8080'];
const CACHE_MS = 15000;      // so lange werden Lesezugriffe zwischengespeichert
const BACKUP_PER_RUN = 20;   // so viele geänderte Dateien sichert ein Backup-Lauf höchstens

// Geheimnisse kommen aus Cloudflare → Settings → Variables and Secrets:
// GITHUB_TOKEN, ADMIN_KEY, SESSION_SECRET

function utf8ToB64(s) { return b64encode(new TextEncoder().encode(s)); }
function b64ToUtf8(s) { return new TextDecoder().decode(b64decode(s.replace(/\s/g, ''))); }

function gh(env) {
  const base = 'https://api.github.com';
  return (path, init = {}) => fetch(base + path, {
    ...init,
    headers: {
      Authorization: 'Bearer ' + env.GITHUB_TOKEN,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'allmende-worker',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
  });
}

const memCache = new Map();

function githubStore(env, repo = DATA_REPO) {
  const api = gh(env);
  const ck = (path) => repo + ':' + path;
  const url = (path) => `/repos/${GH_OWNER}/${repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;

  async function meta(path) {
    const r = await api(url(path) + '?ref=' + BRANCH);
    if (r.status === 404) return null;
    if (!r.ok) throw new Error('GitHub ' + r.status + ' beim Lesen von ' + path);
    return r.json();
  }

  return {
    async read(path) {
      const c = memCache.get(ck(path));
      if (c && Date.now() - c.t < CACHE_MS) return { data: structuredClone(c.data), sha: c.sha };
      const m = await meta(path);
      if (!m) { memCache.delete(ck(path)); return null; }
      let text;
      if (m.content && m.encoding === 'base64') text = b64ToUtf8(m.content);
      else {
        const raw = await api(url(path) + '?ref=' + BRANCH, { headers: { Accept: 'application/vnd.github.raw+json' } });
        text = await raw.text();
      }
      const data = JSON.parse(text);
      memCache.set(ck(path), { data: structuredClone(data), sha: m.sha, t: Date.now() });
      return { data, sha: m.sha };
    },
    async write(path, data, sha) {
      const body = { message: 'Allmende: ' + path, content: utf8ToB64(JSON.stringify(data, null, 1)), branch: BRANCH };
      if (sha) body.sha = sha;
      const r = await api(url(path), { method: 'PUT', body: JSON.stringify(body) });
      if (r.status === 409 || r.status === 422) {
        memCache.delete(ck(path));
        const e = new Error('Konflikt'); e.conflict = true; throw e;
      }
      if (!r.ok) throw new Error('GitHub ' + r.status + ' beim Schreiben von ' + path);
      const j = await r.json();
      memCache.set(ck(path), { data: structuredClone(data), sha: j.content.sha, t: Date.now() });
    },
    async readBin(path) {
      const r = await api(url(path) + '?ref=' + BRANCH, { headers: { Accept: 'application/vnd.github.raw+json' } });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error('GitHub ' + r.status);
      return b64encode(new Uint8Array(await r.arrayBuffer()));
    },
    async writeBin(path, base64) {
      const r = await api(url(path), { method: 'PUT', body: JSON.stringify({ message: 'Allmende: Bild', content: base64, branch: BRANCH }) });
      if (!r.ok) throw new Error('GitHub ' + r.status + ' beim Bild-Upload');
    },
    async remove(path) {
      const m = await meta(path);
      if (!m) return;
      await api(url(path), { method: 'DELETE', body: JSON.stringify({ message: 'Allmende: gelöscht ' + path, sha: m.sha, branch: BRANCH }) });
      memCache.delete(ck(path));
    },
  };
}

function cors(request) {
  const origin = request.headers.get('Origin') || '';
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

let core = null;

async function runBackup(env) {
  const api = gh(env);
  const tree = await api(`/repos/${GH_OWNER}/${DATA_REPO}/git/trees/${BRANCH}?recursive=1`);
  if (!tree.ok) throw new Error('Backup: Baum nicht lesbar (' + tree.status + ')');
  const files = (await tree.json()).tree.filter((t) => t.type === 'blob' && (t.path.startsWith('houses') || t.path.endsWith('.json')));
  const backup = githubStore(env, BACKUP_REPO);
  const manRec = await backup.read('manifest.json').catch(() => null);
  const manifest = manRec ? manRec.data : { files: {} };
  const changed = files.filter((f) => !manifest.files[f.path] || manifest.files[f.path].src !== f.sha).slice(0, BACKUP_PER_RUN);
  for (const f of changed) {
    const blob = await api(`/repos/${GH_OWNER}/${DATA_REPO}/git/blobs/${f.sha}`);
    if (!blob.ok) continue;
    const content = (await blob.json()).content.replace(/\s/g, '');
    const prev = manifest.files[f.path];
    const body = { message: 'Backup: ' + f.path, content, branch: BRANCH };
    if (prev && prev.dst) body.sha = prev.dst;
    const put = await api(`/repos/${GH_OWNER}/${BACKUP_REPO}/contents/mirror/${f.path.split('/').map(encodeURIComponent).join('/')}`, { method: 'PUT', body: JSON.stringify(body) });
    if (!put.ok) continue;
    manifest.files[f.path] = { src: f.sha, dst: (await put.json()).content.sha };
  }
  manifest.lastRun = new Date().toISOString();
  manifest.pending = files.filter((f) => !manifest.files[f.path] || manifest.files[f.path].src !== f.sha).length;
  await backup.write('manifest.json', manifest, manRec ? manRec.sha : undefined);
  return { saved: changed.length, pending: manifest.pending };
}

export default {
  async fetch(request, env) {
    const headers = cors(request);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    const missing = ['GITHUB_TOKEN', 'ADMIN_KEY', 'SESSION_SECRET'].filter((k) => !env[k]);
    if (env.SESSION_SECRET && env.SESSION_SECRET.length < 16) missing.push('SESSION_SECRET (zu kurz, mind. 16 Zeichen)');
    if (missing.length) {
      const found = Object.keys(env).filter((k) => !k.startsWith('__')).join(', ') || 'keine';
      return new Response(JSON.stringify({ error: 'Worker ist noch nicht eingerichtet. Es fehlt: ' + missing.join(', ') + '. Gefundene Namen: ' + found + '.' }), { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } });
    }
    if (!core) core = createCore(githubStore(env), { adminKey: env.ADMIN_KEY, sessionSecret: env.SESSION_SECRET });

    const url = new URL(request.url);
    if (url.pathname === '/' || url.pathname === '') {
      return new Response(JSON.stringify({ ok: true, app: 'Allmende – teilgut' }), { headers: { ...headers, 'Content-Type': 'application/json' } });
    }
    let body = {};
    if (request.method === 'POST' || request.method === 'PUT') {
      const text = await request.text();
      if (text.length > 1_500_000) return new Response(JSON.stringify({ error: 'Anfrage zu groß.' }), { status: 413, headers: { ...headers, 'Content-Type': 'application/json' } });
      try { body = text ? JSON.parse(text) : {}; } catch { body = {}; }
    }
    const auth = request.headers.get('Authorization') || '';
    const res = await core.handle({
      method: request.method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      body,
      token: auth.startsWith('Bearer ') ? auth.slice(7) : '',
      ip: request.headers.get('CF-Connecting-IP') || 'x',
    });
    if (res.body && res.body.__binary) {
      return new Response(b64decode(res.body.__binary), { headers: { ...headers, 'Content-Type': res.body.__mime, 'Cache-Control': 'private, max-age=604800, immutable' } });
    }
    return new Response(JSON.stringify(res.body), { status: res.status, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(runBackup(env).then((r) => console.log('Backup', r)));
  },
};
