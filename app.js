// Allmende – teilgut · Oberfläche
import { call, session, DEMO, imgSrc, resetDemo } from './api.js';
import { MAINTAINER } from './config.js';
import { ALL_MODULES } from './core.js';

// ---------- Helfer ----------
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const isoDay = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseDay = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const fmtDay = (s, opts = { weekday: 'short', day: 'numeric', month: 'short' }) => (s ? parseDay(s).toLocaleDateString('de-DE', opts) : '');
const daysBetween = (a, b) => Math.round((parseDay(b) - parseDay(a)) / 86400000);
const ago = (iso) => {
  const d = Math.floor((Date.now() - new Date(iso)) / 86400000);
  return d <= 0 ? 'heute' : d === 1 ? 'gestern' : d < 30 ? `vor ${d} Tagen` : new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' });
};

const MOD = {
  things:   { ic: '🔧', name: 'Dinge leihen', short: 'Dinge', desc: 'Werkzeug & Co., das Nachbar*innen verleihen', add: 'Ding eintragen' },
  skills:   { ic: '🤝', name: 'Fähigkeiten', short: 'Können', desc: 'Wobei Nachbar*innen helfen können', add: 'Fähigkeit eintragen' },
  requests: { ic: '🙋', name: 'Ich suche …', short: 'Ich suche', desc: 'Bitten um Hilfe oder Dinge', add: 'Etwas suchen' },
  gifts:    { ic: '🎁', name: 'Verschenkekiste', short: 'Verschenken', desc: 'Dinge & Essen, das weg darf', add: 'Etwas verschenken' },
  events:   { ic: '📅', name: 'Kalender', short: 'Kalender', desc: 'Was im und ums Haus passiert', add: 'Termin eintragen' },
  away:     { ic: '🧳', name: 'Bin weg / Bin da', short: 'Weg / Da', desc: 'Blumen gießen, Pakete annehmen', add: 'Eintragen' },
  defects:  { ic: '🛠️', name: 'Mängel im Haus', short: 'Mängel', desc: 'Was kaputt ist – gesammelt', add: 'Mangel melden' },
  info:     { ic: '📌', name: 'Hausinfo', short: 'Hausinfo', desc: 'Müll, Hausverwaltung, Notfall', add: 'Info eintragen' },
  rides:    { ic: '🚲', name: 'Ich fahre los', short: 'Fahre los', desc: 'Baumarkt, Wertstoffhof – was mitbringen?', add: 'Fahrt eintragen' },
  polls:    { ic: '🗳️', name: 'Umfragen', short: 'Umfragen', desc: 'Gemeinsam entscheiden', add: 'Umfrage starten' },
  thanks:   { ic: '💛', name: 'Danke-Wand', short: 'Danke', desc: 'Kleine Dankeschöns', add: 'Danke sagen' },
};
const SHARE_TABS = ['things', 'skills', 'requests'];
const MENU_MODS = ['away', 'defects', 'info', 'rides', 'polls', 'thanks'];

const CATEGORIES = ['Werkzeug', 'Haushalt', 'Küche', 'Garten & Balkon', 'Freizeit & Sport', 'Kinder', 'Sonstiges'];
const EVENT_KINDS = { info: 'ℹ️ Info fürs Haus', laut: '🎉 Feier – kann lauter werden', einladung: '☕ Einladung – kommt vorbei', sonst: '📌 Sonstiges' };
const DEFECT_STATUS = { offen: 'Offen', gemeldet: 'Bei Hausverwaltung gemeldet', behoben: 'Behoben' };
const DEFECT_SHORT = { offen: 'offen', gemeldet: 'gemeldet', behoben: 'behoben' };

const FORMS = {
  things: [
    { k: 'title', label: 'Was verleihst du?', req: 1, ph: 'z. B. Bohrmaschine' },
    { k: 'category', label: 'Kategorie', type: 'select', opts: CATEGORIES },
    { k: 'text', label: 'Beschreibung', type: 'textarea', ph: 'z. B. mit Holz- und Steinbohrern' },
    { k: 'photo', label: 'Foto', type: 'photo' },
    { k: 'contact', label: 'Wo/wie bekommt man es?', ph: 'leer = Kontakthinweis aus deinem Profil', hint: 'Nur ausfüllen, wenn es anders ist als in deinem Profil – z. B. „steht im Keller“.' },
  ],
  skills: [
    { k: 'title', label: 'Wobei kannst du helfen?', req: 1, ph: 'z. B. Lampen anbringen' },
    { k: 'text', label: 'Genauer', type: 'textarea' },
    { k: 'contact', label: 'Kontakt', ph: 'leer = Kontakthinweis aus deinem Profil' },
  ],
  requests: [
    { k: 'title', label: 'Was suchst du oder wobei brauchst du Hilfe?', req: 1, ph: 'z. B. Wer hilft beim Schrank tragen?' },
    { k: 'text', label: 'Genauer', type: 'textarea' },
    { k: 'contact', label: 'Kontakt', ph: 'leer = Kontakthinweis aus deinem Profil' },
  ],
  gifts: [
    { k: 'title', label: 'Was verschenkst du?', req: 1, ph: 'z. B. Puzzle, 1000 Teile' },
    { k: 'kind', label: 'Art', type: 'select', opts: { ding: '🎁 Ein Ding', essen: '🍲 Essen übrig' } },
    { k: 'text', label: 'Beschreibung', type: 'textarea' },
    { k: 'photo', label: 'Foto', type: 'photo' },
    { k: 'contact', label: 'Wo abholen?', ph: 'leer = Kontakthinweis aus deinem Profil' },
  ],
  events: [
    { k: 'title', label: 'Was ist los?', req: 1, ph: 'z. B. Skat-Abend im Hof' },
    { k: 'kind', label: 'Art', type: 'select', opts: EVENT_KINDS },
    { k: 'date', label: 'Datum', type: 'date', req: 1 },
    { k: 'time', label: 'Uhrzeit', type: 'time' },
    { k: 'endDate', label: 'Bis (bei mehreren Tagen)', type: 'date' },
    { k: 'text', label: 'Beschreibung', type: 'textarea' },
  ],
  away: [
    { k: 'kind', label: 'Was möchtest du sagen?', type: 'select', opts: { weg: '🧳 Ich bin weg', da: '📦 Ich bin da und nehme Pakete an' } },
    { k: 'from', label: 'Ab / Am', type: 'date', req: 1 },
    { k: 'to', label: 'Bis', type: 'date', hint: 'Nur bei „Ich bin weg“ nötig.' },
    { k: 'text', label: 'Nachricht', type: 'textarea', ph: 'z. B. Wer kann Blumen gießen? / Bin bis 18 Uhr zuhause.' },
  ],
  defects: [
    { k: 'title', label: 'Was ist kaputt?', req: 1, ph: 'z. B. Haustür schließt nicht' },
    { k: 'place', label: 'Wo?', ph: 'z. B. Treppenhaus 2. OG' },
    { k: 'since', label: 'Seit wann?', type: 'date' },
    { k: 'status', label: 'Stand', type: 'select', opts: DEFECT_STATUS },
    { k: 'text', label: 'Beschreibung', type: 'textarea' },
    { k: 'photo', label: 'Foto', type: 'photo' },
  ],
  info: [
    { k: 'title', label: 'Überschrift', req: 1, ph: 'z. B. Müllabfuhr' },
    { k: 'text', label: 'Inhalt', type: 'textarea', big: 1 },
  ],
  rides: [
    { k: 'title', label: 'Wohin fährst du?', req: 1, ph: 'z. B. Baumarkt / Wertstoffhof' },
    { k: 'date', label: 'Datum', type: 'date', req: 1 },
    { k: 'time', label: 'Uhrzeit', type: 'time' },
    { k: 'text', label: 'Nachricht', type: 'textarea', ph: 'z. B. Habe Platz im Auto für Sperrmüll.' },
  ],
  polls: [
    { k: 'title', label: 'Frage', req: 1, ph: 'z. B. Wann machen wir das Hoffest?' },
    { k: 'text', label: 'Erklärung', type: 'textarea' },
    { k: 'options', label: 'Antworten (eine pro Zeile)', type: 'options', req: 1, ph: 'Samstag, 14. Juni\nSonntag, 15. Juni' },
  ],
  thanks: [
    { k: 'to', label: 'An wen?', ph: 'z. B. Frau Schulz' },
    { k: 'text', label: 'Dein Dankeschön', type: 'textarea', req: 1 },
  ],
};

// ---------- Zustand ----------
const S = {
  st: null,          // Antwort von /state
  users: new Map(),
  loadedAt: 0,
  prevSeen: 0,
  loginMode: 'join',
  loginHouse: null,
  installEvt: null,
  sheetOpen: false,
};

const app = $('#app');
const nav = $('#nav');
const mods = () => S.st?.house.modules || [];
const has = (m) => mods().includes(m);
const me = () => S.st?.me;
const canEdit = (it) => me() && (it.by === me().id || me().admin);
const userName = (id) => S.users.get(id)?.name || 'Ehemalige*r Nachbar*in';

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 2800);
}

// ---------- Himmel & Stadtsilhouette ----------
function drawSky() {
  const sky = $('#sky');
  let rnd = 7;
  const r = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
  let html = '<div class="moon"></div>';
  for (let i = 0; i < 46; i++) html += `<i class="star" style="left:${(r() * 100).toFixed(1)}%;top:${(r() * 55).toFixed(1)}%;animation-delay:${(r() * 4).toFixed(1)}s;${r() > .8 ? 'width:3px;height:3px;' : ''}"></i>`;
  sky.innerHTML = html;

  // Silhouette: zufällig, aber immer gleich (fester Startwert)
  rnd = 42;
  const W = 1200, H = 120;
  let x = 0, shapes = '', wins = '';
  while (x < W) {
    const w = 34 + Math.floor(r() * 70);
    const h = 36 + Math.floor(r() * 70);
    const top = H - h;
    const type = r();
    if (type < .18) shapes += `<polygon points="${x},${top} ${x + w / 2},${top - 18} ${x + w},${top} ${x + w},${H} ${x},${H}"/>`; // Giebel
    else if (type < .26) shapes += `<rect x="${x}" y="${top}" width="${w}" height="${h}"/><rect x="${x + w / 2 - 2}" y="${top - 22}" width="4" height="22"/>`; // Antenne
    else if (type < .31 && h > 70) shapes += `<rect x="${x}" y="${top}" width="${w}" height="${h}"/><polygon points="${x + w / 2 - 9},${top} ${x + w / 2},${top - 42} ${x + w / 2 + 9},${top}"/>`; // Turmspitze
    else if (type < .40) shapes += `<rect x="${x}" y="${top}" width="${w}" height="${h}"/><rect x="${x + 6}" y="${top - 10}" width="10" height="10"/>`; // Schornstein
    else shapes += `<rect x="${x}" y="${top}" width="${w}" height="${h}"/>`;
    for (let wy = top + 10; wy < H - 12; wy += 16) {
      for (let wx = x + 7; wx < x + w - 10; wx += 14) {
        if (r() < .2) wins += `<rect class="win${r() < .12 ? ' f' : ''}" x="${wx}" y="${wy}" width="6" height="8" rx="1" style="animation-delay:${(r() * 9).toFixed(1)}s"/>`;
      }
    }
    x += w + (r() < .3 ? 4 : 0);
  }
  // Bäume dazwischen
  for (let i = 0; i < 7; i++) { const tx = 60 + r() * (W - 120); shapes += `<circle cx="${tx}" cy="${H - 14}" r="${12 + r() * 8}"/><rect x="${tx - 2}" y="${H - 14}" width="4" height="14"/>`; }
  $('#skyline').innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice"><g fill="#0b1022">${shapes}</g>${wins}</svg>`;
}

// ---------- Navigation ----------
function route() { return (location.hash.slice(1) || 'start').split('/'); }
function go(h) { if (location.hash.slice(1) === h) render(); else location.hash = h; }

const NAV_ICONS = {
  start: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  teilen: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
  kalender: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  verschenken: '<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8.5h14V12M12 8v12.5"/><path d="M12 8C10.5 4.5 7 4.5 7 6.5S10 8 12 8zm0 0c1.5-3.5 5-3.5 5-1.5S14 8 12 8z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
};
const navIcon = (k) => `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${NAV_ICONS[k]}</svg>`;

function renderNav() {
  if (!S.st) { nav.hidden = true; document.body.classList.add('no-nav'); return; }
  nav.hidden = false; document.body.classList.remove('no-nav');
  const [r] = route();
  const items = [['start', 'Start']];
  if (SHARE_TABS.some(has)) items.push(['teilen', 'Teilen']);
  if (has('events')) items.push(['kalender', 'Kalender']);
  if (has('gifts')) items.push(['verschenken', 'Verschenken']);
  items.push(['menu', 'Mehr']);
  const menuRoutes = ['menu', 'm', 'profil', 'was', 'wie', 'feedback', 'verwaltung'];
  nav.innerHTML = `<div class="inner">${items.map(([h, l]) => {
    const cur = r === h || (h === 'menu' && menuRoutes.includes(r));
    return `<a href="#${h}" ${cur ? 'aria-current="page"' : ''}><span class="ic">${navIcon(h)}</span>${l}</a>`;
  }).join('')}</div>`;
}

function header(title, lead) {
  return `
    <div class="top">
      <div class="brand"><b>Allmende</b><small>teilgut</small></div>
      <div class="house-name">${esc(S.st?.house.name || '')}</div>
    </div>
    ${DEMO ? `<div class="demo-banner"><b>Demo-Modus</b> – alles bleibt nur auf diesem Gerät. <button class="secondary" data-act="reset-demo">Demo zurücksetzen</button></div>` : ''}
    ${me()?.super ? `<div class="demo-banner">Du bist als <b>Gesamtverwaltung</b> angemeldet. <button class="secondary" data-act="goto" data-h="verwaltung">Zur Verwaltung</button></div>` : ''}
    ${title ? `<h1>${title}</h1>` : ''}${lead ? `<p class="lead">${lead}</p>` : ''}`;
}

// ---------- Laden ----------
async function loadState() {
  S.st = await call('GET', '/state');
  S.users = new Map(S.st.users.map((u) => [u.id, u]));
  S.loadedAt = Date.now();
}

async function reload() {
  try { await loadState(); } catch (e) { return handleErr(e); }
  render();
}

function handleErr(e) {
  if (e.status === 401) {
    session.clear(); S.st = null;
    toast(e.message);
    go('start');
    return;
  }
  toast(e.message || 'Fehler');
}

// ---------- Hauptdarstellung ----------
function render() {
  const [r, sub] = route();
  renderNav();
  window.scrollTo(0, 0);
  if (!session.token || !S.st) {
    if (r === 'was') return renderWhat();
    if (r === 'wie') return renderHow();
    if (r === 'verwaltung-login') return renderAdminLogin();
    if (session.token && session.isSuper) return renderAdmin();
    return renderLogin();
  }
  switch (r) {
    case 'teilen': return renderList(SHARE_TABS.includes(sub) && has(sub) ? sub : SHARE_TABS.find(has), true);
    case 'kalender': return renderList('events');
    case 'verschenken': return renderList('gifts');
    case 'm': return has(sub) ? renderList(sub) : renderMenu();
    case 'menu': return renderMenu();
    case 'profil': return renderProfile();
    case 'was': return renderWhat();
    case 'wie': return renderHow();
    case 'feedback': return renderFeedback();
    case 'verwaltung': return renderAdmin();
    case 'suche': return renderStart();
    default: return renderStart();
  }
}

// ---------- Anmeldung ----------
async function renderLogin() {
  const qs = new URLSearchParams(location.search);
  const slug = S.forceNoHouse ? '' : (qs.get('haus') || session.slug || (DEMO ? 'demo' : ''));
  if (slug && (!S.loginHouse || S.loginHouse.slug !== slug)) {
    try { S.loginHouse = await call('GET', '/house', null, { slug }); }
    catch { S.loginHouse = { slug, missing: true }; }
  }
  const house = S.loginHouse && !S.loginHouse.missing ? S.loginHouse : null;
  const join = S.loginMode === 'join';
  app.innerHTML = `
    ${header('', '')}
    <h1>Willkommen${house ? ` in der Allmende<br><span style="color:var(--light)">${esc(house.name)}</span>` : ' bei der Allmende'}</h1>
    <p class="lead">Hier teilen Nachbar*innen Werkzeug, Fähigkeiten und Zeit – kostenlos, ohne Werbung, ohne Datensammeln.</p>
    ${DEMO ? `<div class="card notice"><h3>Einfach ausprobieren</h3><p class="text">Im Demo-Modus kannst du dich als „Eric“ anmelden und alles anklicken.</p><div class="actions"><button data-act="demo-login">Demo starten</button></div><p class="hint">Oder neu registrieren mit dem Hauspasswort <b>demo123</b>.</p></div>` : ''}
    <div class="card">
      ${!house ? `
        <form data-form="house">
          <label for="f-slug">Haus-Kennung</label>
          <input id="f-slug" name="slug" type="text" autocomplete="off" required placeholder="z. B. brandvorwerkstrasse-59" value="${esc(S.loginHouse?.missing ? S.loginHouse.slug : '')}">
          <p class="hint">Steht am Ende des Links, den du bekommen hast (nach „?haus=“).</p>
          ${S.loginHouse?.missing ? '<div class="err">Dieses Haus wurde nicht gefunden. Bitte die Kennung prüfen.</div>' : ''}
          <div class="sheet-actions"><button>Weiter</button></div>
        </form>` : `
        <div class="seg login-tabs" style="background:var(--paper-2)">
          <a href="#" data-act="login-mode" data-mode="join" ${join ? 'aria-current="page"' : ''}>Ich bin neu hier</a>
          <a href="#" data-act="login-mode" data-mode="login" ${!join ? 'aria-current="page"' : ''}>Ich war schon mal hier</a>
        </div>
        <form data-form="${join ? 'join' : 'login'}">
          ${join ? `
            <label for="f-hp">Hauspasswort</label>
            <input id="f-hp" name="housePassword" type="password" required autocomplete="off">
            <p class="hint">Steht in der Nachricht, mit der du den Link bekommen hast.</p>` : ''}
          <label for="f-name">Dein Name im Haus</label>
          <input id="f-name" name="name" type="text" required minlength="2" maxlength="40" autocomplete="username" placeholder="z. B. Eric, Frau Schulz, Wohnung 4">
          ${join ? '<p class="hint">Muss nicht dein echter Name sein – Hauptsache, die anderen wissen, wer du bist.</p>' : ''}
          <label for="f-pw">${join ? 'Wähle ein Passwort' : 'Passwort'}</label>
          <input id="f-pw" name="password" type="password" required minlength="6" autocomplete="${join ? 'new-password' : 'current-password'}">
          ${join ? `
            <p class="hint">Mindestens 6 Zeichen. Am besten aufschreiben – es gibt keine E-Mail zum Zurücksetzen.</p>
            <label for="f-pw2">Passwort wiederholen</label>
            <input id="f-pw2" name="password2" type="password" required minlength="6" autocomplete="new-password">
            <label for="f-c">Wie erreicht man dich? <span class="opt">(freiwillig)</span></label>
            <input id="f-c" name="contact" type="text" maxlength="200" placeholder="z. B. 3. OG links – einfach klingeln">
            <p class="hint">Wird bei deinen Einträgen angezeigt. Keine Telefonnummer nötig.</p>` : ''}
          <div class="sheet-actions"><button>${join ? 'Zugang anlegen' : 'Anmelden'}</button></div>
          ${!join ? '<p class="hint">Passwort vergessen? Frag die Hausverwaltung der App – sie kann es zurücksetzen.</p>' : ''}
        </form>
        <p class="hint" style="margin-top:14px"><button class="link" data-act="other-house">Anderes Haus wählen</button></p>`}
    </div>
    <div class="small-links">
      <a class="link" href="#was">Was ist das hier?</a>
      <a class="link" href="#wie">Wie funktioniert das?</a>
      <a class="link" href="#verwaltung-login">Verwaltung</a>
    </div>`;
}

function renderAdminLogin() {
  app.innerHTML = `${header('Verwaltung', 'Nur für die Person, die die App betreibt.')}
    <div class="card"><form data-form="admin-login">
      <label for="f-key">Admin-Schlüssel</label>
      <input id="f-key" name="key" type="password" required autocomplete="current-password">
      ${DEMO ? '<p class="hint">Demo: <b>demo-admin-schluessel</b></p>' : ''}
      <div class="sheet-actions"><a class="btn secondary" href="#start">Zurück</a><button>Anmelden</button></div>
    </form></div>`;
}

// ---------- Startseite ----------
function allItems() {
  const out = [];
  for (const m of mods()) for (const it of S.st.data[m] || []) out.push({ m, it });
  return out;
}

function renderStart() {
  const today = isoDay();
  const d = S.st.data;
  const mine = me();
  const notices = [];
  if (!session.pref('welcomed')) {
    notices.push(`<div class="card notice"><h3>👋 Schön, dass du da bist!</h3><p class="text">Neu hier? In zwei Minuten erklärt: worum es geht und was mit deinen Daten passiert.</p>
      <div class="actions"><a class="btn" href="#was">Was ist das hier?</a><button class="secondary" data-act="dismiss-welcome">Schon klar</button></div></div>`);
  }
  for (const t of d.things || []) {
    if (t.by !== mine.id || t.status !== 'verliehen' || !t.returnDate) continue;
    const diff = daysBetween(today, t.returnDate);
    if (diff < 0) notices.push(`<div class="card notice red"><h3>⏰ ${esc(t.title)}</h3><p class="text">Sollte seit ${fmtDay(t.returnDate)} zurück sein${t.lentTo ? ` (verliehen an ${esc(t.lentTo)})` : ''}.</p><div class="actions"><button class="small" data-act="returned" data-id="${t.id}">Ist zurück</button></div></div>`);
    else if (diff <= 1) notices.push(`<div class="card notice"><h3>⏰ ${esc(t.title)}</h3><p class="text">Kommt ${diff === 0 ? 'heute' : 'morgen'} zurück${t.lentTo ? ` von ${esc(t.lentTo)}` : ''}.</p></div>`);
  }
  if (S.installEvt && !session.pref('install-dismissed')) {
    notices.push(`<div class="card notice"><h3>📱 Als App aufs Handy</h3><p class="text">Allmende lässt sich wie eine App auf dem Startbildschirm ablegen.</p><div class="actions"><button data-act="install">Installieren</button><button class="secondary" data-act="dismiss-install">Später</button></div></div>`);
  }

  // Heute im Haus
  const todayBits = [];
  for (const a of d.away || []) {
    if (a.kind === 'da' && a.from === today) todayBits.push(`📦 <b>${esc(userName(a.by))}</b> ist heute da${a.text ? ` – ${esc(a.text)}` : ' und nimmt Pakete an'}`);
    if (a.kind === 'weg' && a.from <= today && (a.to || a.from) >= today) todayBits.push(`🧳 <b>${esc(userName(a.by))}</b> ist weg bis ${fmtDay(a.to || a.from)}`);
  }
  for (const e of d.events || []) if (e.date === today || (e.endDate && e.date <= today && e.endDate >= today)) todayBits.push(`📅 Heute: <b>${esc(e.title)}</b>${e.time ? ` um ${e.time} Uhr` : ''}`);

  const upcoming = (d.events || []).filter((e) => e.date > today).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 3);

  // Neu seit letztem Besuch
  const fresh = S.prevSeen ? allItems().filter(({ it }) => it.by !== mine.id && new Date(it.at).getTime() > S.prevSeen).sort((a, b) => b.it.at.localeCompare(a.it.at)).slice(0, 6) : [];

  app.innerHTML = `
    ${header(`Hallo ${esc(mine.name)}!`, 'Schön, dass du da bist. Was brauchst du heute?')}
    <form class="search" data-form="search" role="search"><input type="search" name="q" placeholder="🔎 Suchen, z. B. „Bohrer“ oder „Leiter“" aria-label="Suchen" autocomplete="off"></form>
    <div id="search-results"></div>
    <div id="start-body">
      ${notices.join('')}
      ${todayBits.length ? `<h2 class="section-title">Heute im Haus</h2><div class="card">${todayBits.map((b) => `<p style="margin:6px 0">${b}</p>`).join('')}</div>` : ''}
      ${fresh.length ? `<h2 class="section-title">✨ Neu seit deinem letzten Besuch</h2>${fresh.map(({ m, it }) => miniCard(m, it)).join('')}` : ''}
      ${upcoming.length ? `<h2 class="section-title">📅 Demnächst</h2>${upcoming.map((e) => card('events', e)).join('')}` : ''}
      <h2 class="section-title">Alles im Überblick</h2>
      <div class="tiles">${mods().map((m) => `<a class="tile" href="#${hrefFor(m)}"><span class="ic">${MOD[m].ic}</span><b>${MOD[m].name}</b><span>${MOD[m].desc}</span></a>`).join('')}</div>
    </div>`;
}

function hrefFor(m) {
  if (SHARE_TABS.includes(m)) return 'teilen/' + m;
  if (m === 'events') return 'kalender';
  if (m === 'gifts') return 'verschenken';
  return 'm/' + m;
}

function miniCard(m, it) {
  const label = it.title || it.text || (m === 'away' ? (it.kind === 'weg' ? 'ist weg' : 'ist da') : '');
  return `<a class="card" href="#${hrefFor(m)}" style="display:block;text-decoration:none;color:inherit">
    <div class="title-row"><h3>${MOD[m].ic} ${esc(label).slice(0, 90)}</h3><span class="badge new">neu</span></div>
    <div class="meta">${MOD[m].name} · von ${esc(userName(it.by))} · ${ago(it.at)}</div></a>`;
}

function doSearch(q) {
  const box = $('#search-results'), body = $('#start-body');
  q = q.trim().toLowerCase();
  if (!q) { box.innerHTML = ''; body.hidden = false; return; }
  body.hidden = true;
  const words = q.split(/\s+/);
  const hits = allItems().filter(({ it }) => {
    const hay = [it.title, it.text, it.category, it.place, it.to, userName(it.by)].join(' ').toLowerCase();
    return words.every((w) => hay.includes(w));
  });
  box.innerHTML = hits.length
    ? `<p class="lead">${hits.length} Treffer</p>${hits.map(({ m, it }) => card(m, it, true)).join('')}`
    : `<div class="empty">Nichts gefunden für „${esc(q)}“.<br>${has('requests') ? `<br><button data-act="new" data-col="requests" data-title="${esc(q)}">🙋 Im Haus danach fragen</button>` : ''}</div>`;
}

// ---------- Listen ----------
function sortItems(col, items) {
  const today = isoDay();
  let list = items.slice();
  if (col === 'events' || col === 'rides') {
    list = list.filter((e) => (e.endDate || e.date) >= today).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
  } else if (col === 'away') {
    list = list.filter((a) => (a.to || a.from) >= today).sort((a, b) => a.from.localeCompare(b.from));
  } else if (col === 'info') {
    list.sort((a, b) => a.title.localeCompare(b.title, 'de'));
  } else if (col === 'defects') {
    list.sort((a, b) => (a.status === 'behoben') - (b.status === 'behoben') || b.at.localeCompare(a.at));
  } else list.sort((a, b) => b.at.localeCompare(a.at));
  return list;
}

function renderList(col, withTabs) {
  if (!col) return renderStart();
  const all = S.st.data[col] || [];
  const items = sortItems(col, all);
  const past = (col === 'events' || col === 'rides' || col === 'away') ? all.length - items.length : 0;
  const tabs = withTabs ? `<div class="seg">${SHARE_TABS.filter(has).map((m) => `<a href="#teilen/${m}" ${m === col ? 'aria-current="page"' : ''}>${MOD[m].ic} ${MOD[m].short}</a>`).join('')}</div>` : '';
  const intro = {
    things: 'Dinge, die Nachbar*innen verleihen. Tippe auf „Kontakt“, um zu fragen.',
    skills: 'Wobei Nachbar*innen gern helfen.',
    requests: 'Hier bitten Nachbar*innen um Hilfe oder suchen etwas. Kannst du helfen?',
    gifts: 'Alles hier ist geschenkt. Einfach melden und abholen.',
    events: 'Termine im und ums Haus: Infos, Feiern, Einladungen.',
    away: 'Wer ist verreist und braucht Hilfe? Wer ist da und nimmt Pakete an?',
    defects: 'Was im Haus kaputt ist. Wenn es dich auch betrifft, tippe „Betrifft mich auch“ – so sieht man, wie viele es stört.',
    info: 'Wichtiges zum Haus an einem Ort.',
    rides: 'Wer fährt wohin? Vielleicht kann jemand etwas mitbringen oder mitnehmen.',
    polls: 'Gemeinsam entscheiden. Tippe auf eine Antwort, um abzustimmen.',
    thanks: 'Kleine Dankeschöns an die Nachbarschaft.',
  }[col];
  app.innerHTML = `
    ${header(withTabs ? 'Teilen' : `${MOD[col].ic} ${MOD[col].name}`, withTabs ? '' : intro)}
    ${tabs}${withTabs ? `<p class="lead">${intro}</p>` : ''}
    ${items.length ? items.map((it) => card(col, it)).join('') : `<div class="empty">Hier ist noch nichts.<br>Mach den Anfang!</div>`}
    ${past ? `<p class="empty" style="padding:8px">${past} vergangene Einträge werden ausgeblendet.</p>` : ''}
    ${me().super ? '' : `<button class="fab" data-act="new" data-col="${col}">＋ ${MOD[col].add}</button>`}`;
}

function ownerActions(col, it) {
  if (!canEdit(it)) return '';
  let extra = '';
  const own = it.by === me().id;
  if (!own) { /* Verwaltung: nur Bearbeiten/Löschen */ }
  else if (col === 'things') extra = it.status === 'verliehen'
    ? `<button class="small secondary" data-act="returned" data-id="${it.id}">↩︎ Ist zurück</button>`
    : `<button class="small secondary" data-act="lend" data-id="${it.id}">📤 Verliehen</button>`;
  else if (col === 'gifts') extra = `<button class="small secondary" data-act="reserve" data-id="${it.id}">${it.status === 'reserviert' ? 'Wieder frei' : 'Reserviert'}</button>`;
  else if (col === 'polls' && !it.closed) extra = `<button class="small secondary" data-act="close-poll" data-id="${it.id}">Beenden</button>`;
  return `${extra}<button class="small ghost" data-act="edit" data-col="${col}" data-id="${it.id}">✏️ Bearbeiten</button>
    <button class="small ghost" data-act="del" data-col="${col}" data-id="${it.id}">🗑️ Löschen</button>`;
}

function contactBtn(col, it, label = '💬 Kontakt') {
  if (it.by === me().id) return '';
  return `<button class="small" data-act="contact" data-col="${col}" data-id="${it.id}">${label}</button>`;
}

function card(col, it, showModule) {
  const isNew = S.prevSeen && it.by !== me().id && new Date(it.at).getTime() > S.prevSeen;
  const by = `von ${esc(userName(it.by))}`;
  const photo = it.photo ? `<img class="photo" loading="lazy" alt="" src="${esc(imgSrc(it.photo))}">` : '';
  const modLabel = showModule ? `<span>${MOD[col].ic} ${MOD[col].short} · </span>` : '';
  const newB = isNew ? ' <span class="badge new">neu</span>' : '';
  const today = isoDay();
  switch (col) {
    case 'things': {
      const lent = it.status === 'verliehen';
      return `<article class="card"><div class="title-row"><h3>${esc(it.title)}${newB}</h3>
        <span class="badge ${lent ? 'lent' : ''}">${lent ? (it.returnDate ? 'verliehen bis ' + fmtDay(it.returnDate, { day: 'numeric', month: 'short' }) : 'verliehen') : 'verfügbar'}</span></div>
        ${photo}${it.text ? `<p class="text">${esc(it.text)}</p>` : ''}
        <div class="meta">${modLabel}${it.category ? esc(it.category) + ' · ' : ''}${by}${lent && it.lentTo && canEdit(it) ? ` · bei ${esc(it.lentTo)}` : ''}</div>
        <div class="actions">${contactBtn(col, it, '💬 Ausleihen fragen')}${ownerActions(col, it)}</div></article>`;
    }
    case 'skills': case 'requests':
      return `<article class="card"><h3>${esc(it.title)}${newB}</h3>${it.text ? `<p class="text">${esc(it.text)}</p>` : ''}
        <div class="meta">${modLabel}${by} · ${ago(it.at)}</div>
        <div class="actions">${contactBtn(col, it, col === 'requests' ? '🙌 Ich kann helfen' : '💬 Kontakt')}${ownerActions(col, it)}</div></article>`;
    case 'gifts':
      return `<article class="card"><div class="title-row"><h3>${it.kind === 'essen' ? '🍲 ' : ''}${esc(it.title)}${newB}</h3>
        ${it.status === 'reserviert' ? '<span class="badge lent">reserviert</span>' : '<span class="badge">zu verschenken</span>'}</div>
        ${photo}${it.text ? `<p class="text">${esc(it.text)}</p>` : ''}
        <div class="meta">${modLabel}${by} · ${ago(it.at)}</div>
        <div class="actions">${contactBtn(col, it, '🙋 Hätte ich gern')}${ownerActions(col, it)}</div></article>`;
    case 'events': {
      const dt = parseDay(it.date);
      return `<article class="card event"><div class="date-chip"><small>${dt.toLocaleDateString('de-DE', { weekday: 'short' })}</small><b>${dt.getDate()}</b><small>${dt.toLocaleDateString('de-DE', { month: 'short' })}</small></div>
        <div style="flex:1;min-width:0"><h3>${esc(it.title)}${newB}</h3>
        <div class="meta">${it.time ? it.time + ' Uhr · ' : ''}${it.endDate && it.endDate !== it.date ? 'bis ' + fmtDay(it.endDate) + ' · ' : ''}${esc(EVENT_KINDS[it.kind] || '')}</div>
        ${it.text ? `<p class="text">${esc(it.text)}</p>` : ''}
        <div class="meta">${modLabel}${by}</div>
        <div class="actions">${ownerActions(col, it)}</div></div></article>`;
    }
    case 'away': {
      const weg = it.kind === 'weg';
      const when = weg ? `${fmtDay(it.from)} – ${fmtDay(it.to || it.from)}` : (it.from === today ? 'heute' : fmtDay(it.from));
      return `<article class="card"><h3>${weg ? '🧳' : '📦'} ${esc(userName(it.by))} ist ${weg ? 'weg' : 'da'}${newB}</h3>
        <div class="meta">${when}</div>${it.text ? `<p class="text">${esc(it.text)}</p>` : ''}
        <div class="actions">${contactBtn(col, it, weg ? '🪴 Ich helfe' : '💬 Kontakt')}${ownerActions(col, it)}</div></article>`;
    }
    case 'defects': {
      const n = (it.affected || []).length;
      const mineAff = (it.affected || []).includes(me().id);
      const st = it.status || 'offen';
      const days = it.since ? daysBetween(it.since, today) : null;
      return `<article class="card"><div class="title-row"><h3>${esc(it.title)}${newB}</h3>
        <span class="badge ${st === 'behoben' ? '' : st === 'gemeldet' ? 'lent' : 'red'}">${DEFECT_SHORT[st]}</span></div>
        ${photo}<div class="meta">${it.place ? '📍 ' + esc(it.place) + ' · ' : ''}${days !== null && st !== 'behoben' ? `seit ${days} Tagen` : 'gemeldet ' + ago(it.at)}</div>
        ${it.text ? `<p class="text">${esc(it.text)}</p>` : ''}
        <div class="meta">${modLabel}${by} · betrifft ${n} ${n === 1 ? 'Haushalt' : 'Haushalte'}</div>
        <div class="actions">${st !== 'behoben' && !me().super ? `<button class="small ${mineAff ? 'secondary' : ''}" data-act="affect" data-id="${it.id}">${mineAff ? '✓ Betrifft mich' : '✋ Betrifft mich auch'}</button>` : ''}${ownerActions(col, it)}</div></article>`;
    }
    case 'info':
      return `<article class="card"><h3>📌 ${esc(it.title)}${newB}</h3>${it.text ? `<p class="text">${esc(it.text)}</p>` : ''}
        <div class="meta">${modLabel}eingetragen ${by} · zuletzt geändert ${ago(it.up || it.at)}</div><div class="actions">${ownerActions(col, it)}</div></article>`;
    case 'rides':
      return `<article class="card"><h3>🚲 ${esc(it.title)}${newB}</h3><div class="meta">${fmtDay(it.date)}${it.time ? ', ' + it.time + ' Uhr' : ''} · ${by}</div>
        ${it.text ? `<p class="text">${esc(it.text)}</p>` : ''}<div class="actions">${contactBtn(col, it, '🛍️ Bring mir was mit')}${ownerActions(col, it)}</div></article>`;
    case 'polls': {
      const votes = Object.values(it.votes || {});
      const myVote = (it.votes || {})[me().id];
      const total = votes.length;
      return `<article class="card"><div class="title-row"><h3>🗳️ ${esc(it.title)}${newB}</h3>${it.closed ? '<span class="badge grey">beendet</span>' : ''}</div>
        ${it.text ? `<p class="text">${esc(it.text)}</p>` : ''}
        ${it.options.map((o, i) => {
          const n = votes.filter((v) => v === i).length;
          const pct = total ? Math.round((n / total) * 100) : 0;
          return `<button class="poll-opt ${myVote === i ? 'mine' : ''}" data-act="vote" data-id="${it.id}" data-opt="${i}" ${it.closed || me().super ? 'disabled' : ''}>
            <i class="bar" style="width:${pct}%"></i><span>${myVote === i ? '✓ ' : ''}${esc(o)}</span><span class="n">${n}</span></button>`;
        }).join('')}
        <div class="meta">${total} ${total === 1 ? 'Stimme' : 'Stimmen'} · ${by}${myVote !== undefined && !it.closed ? ' · nochmal tippen zum Zurücknehmen' : ''}</div>
        <div class="actions">${ownerActions(col, it)}</div></article>`;
    }
    case 'thanks':
      return `<article class="card soft"><h3>💛 ${it.to ? 'Danke an ' + esc(it.to) : 'Danke!'}${newB}</h3><p class="text">${esc(it.text)}</p>
        <div class="meta">${by} · ${ago(it.at)}</div><div class="actions">${ownerActions(col, it)}</div></article>`;
  }
  return '';
}

// ---------- Menü & Seiten ----------
function renderMenu() {
  const extra = MENU_MODS.filter(has);
  app.innerHTML = `
    ${header('Mehr', '')}
    ${extra.length ? `<div class="card list-menu">${extra.map((m) => `<a href="#m/${m}"><span class="ic">${MOD[m].ic}</span><span>${MOD[m].name}<br><small style="font-weight:400;color:var(--ink-soft)">${MOD[m].desc}</small></span></a>`).join('')}</div>` : ''}
    <div class="card list-menu">
      ${me().super ? '' : '<a href="#profil"><span class="ic">👤</span>Mein Profil</a>'}
      <a href="#was"><span class="ic">🏡</span>Was ist das hier?</a>
      <a href="#wie"><span class="ic">❓</span>Wie funktioniert das?</a>
      <a href="#feedback"><span class="ic">✉️</span>Fehler melden & Feedback</a>
      ${me().admin ? '<a href="#verwaltung"><span class="ic">🔑</span>Verwaltung</a>' : ''}
      <button data-act="logout"><span class="ic">🚪</span>Abmelden</button>
    </div>`;
}

function installHelp() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (matchMedia('(display-mode: standalone)').matches) return '<p class="text">✓ Allmende ist bereits als App installiert.</p>';
  return `${S.installEvt ? '<div class="actions"><button data-act="install">📱 Jetzt installieren</button></div>' : ''}
    <p class="text">${ios ? 'iPhone/iPad: Unten auf das Teilen-Symbol (Quadrat mit Pfeil) tippen → „Zum Home-Bildschirm“.' : 'Android: Im Browser-Menü (⋮) auf „App installieren“ oder „Zum Startbildschirm hinzufügen“ tippen.'}</p>`;
}

function renderProfile() {
  const m = me();
  app.innerHTML = `
    ${header('Mein Profil', '')}
    <div class="card"><form data-form="profile">
      <label>Name</label><p class="text" style="margin:0"><b>${esc(m.name)}</b></p>
      <label for="p-c">Wie erreicht man dich?</label>
      <input id="p-c" name="contact" type="text" maxlength="200" value="${esc(m.contact)}" placeholder="z. B. 3. OG links – einfach klingeln">
      <p class="hint">Wird bei deinen Einträgen angezeigt, wenn jemand auf „Kontakt“ tippt.</p>
      <div class="sheet-actions"><button>Speichern</button></div>
    </form></div>
    <div class="card"><h2>Schriftgröße</h2>
      <div class="actions"><button class="${document.documentElement.classList.contains('big') ? 'secondary' : ''}" data-act="font" data-big="0">Normal</button>
      <button class="${document.documentElement.classList.contains('big') ? '' : 'secondary'}" data-act="font" data-big="1" style="font-size:1.15rem">Größer</button></div></div>
    <div class="card"><h2>Als App aufs Handy</h2>${installHelp()}</div>
    <div class="card"><form data-form="password"><h2>Passwort ändern</h2>
      <label for="p-o">Bisheriges Passwort</label><input id="p-o" name="oldPassword" type="password" required autocomplete="current-password">
      <label for="p-n">Neues Passwort</label><input id="p-n" name="password" type="password" required minlength="6" autocomplete="new-password">
      <div class="sheet-actions"><button class="secondary">Passwort ändern</button></div>
    </form></div>
    <div class="card"><h2>Zugang löschen</h2><p class="text">Löscht deinen Zugang und alle deine Einträge. Das lässt sich nicht rückgängig machen.</p>
      <div class="actions"><button class="danger" data-act="delete-me">Zugang löschen</button></div></div>`;
}

function renderWhat() {
  app.innerHTML = `
    ${header('Was ist das hier?', '')}
    <div class="card prose">
      <p><b>Allmende</b> nannte man früher das Land, das allen im Dorf gemeinsam gehörte: die Wiese, den Brunnen, den Wald. Niemand musste alles allein besitzen, weil man es teilte.</p>
      <p>Diese App ist eine kleine Allmende für unser Haus. Hier teilen wir Werkzeug, Fähigkeiten und Zeit, verschenken, was wir nicht mehr brauchen, und wissen, was im Haus los ist.</p>
      <p>Eine Bohrmaschine wird im Schnitt nur wenige Minuten im Jahr benutzt. Nicht jeder Haushalt braucht eine eigene Leiter, einen Pömpel oder ein Dörrgerät – <b>es reicht, wenn einer im Haus es hat und teilt.</b></p>
    </div>
    <h2 class="section-title">🔒 Sicherheit & Daten</h2>
    <div class="card prose">
      <ul class="safe-list">
        <li><b>Komplett kostenlos.</b> Jetzt und für immer. Keine Abos, keine Premium-Version.</li>
        <li><b>Keine Werbung, kein Tracking, keine Cookies.</b> Es werden keine Daten gesammelt, ausgewertet, verkauft oder weitergegeben.</li>
        <li><b>Keine privaten Daten nötig.</b> Kein echter Name, keine E-Mail, keine Telefonnummer, keine Adresse. Nur ein Name, unter dem dich die anderen im Haus erkennen.</li>
        <li><b>Nur fürs Haus.</b> Hineinkommen kann nur, wer Link und Hauspasswort hat. Jedes Haus sieht nur seine eigenen Einträge.</li>
        <li><b>Passwörter sind verschlüsselt.</b> Niemand – auch die Verwaltung nicht – kann sie lesen.</li>
        <li><b>Du hast die Kontrolle.</b> Du kannst deine Einträge jederzeit ändern oder löschen, und deinen ganzen Zugang auch.</li>
      </ul>
      <p class="hint">Technisch ehrlich: Gespeichert wird nur, was du selbst einträgst. Die Daten liegen in einem privaten Speicher bei GitHub und werden über Cloudflare übertragen – das ist reine Technik, über die nichts ausgewertet wird. Die App lädt keine Schriften, Skripte oder Bilder von fremden Servern. Die Verwaltung (${esc(MAINTAINER)}) kann technisch alle Einträge sehen, um bei Problemen helfen zu können, aber keine Passwörter.</p>
    </div>
    <h2 class="section-title">👋 Wer steckt dahinter?</h2>
    <div class="card prose">
      <p>Allmende ist ein kleines Soloprojekt von ${esc(MAINTAINER)} – ohne kommerzielle Absicht, ohne Firma dahinter. Einfach, weil gute Nachbarschaft einfacher sein darf.</p>
      <p>Tipps, Fragen, Ideen oder ein Fehler? Schreib gern eine kurze Beschreibung und – wenn möglich – einen Screenshot.</p>
      ${S.st ? '<div class="actions"><a class="btn" href="#feedback">✉️ Feedback senden</a></div>' : ''}
    </div>
    ${!S.st ? '<div class="small-links"><a class="link" href="#start">← Zur Anmeldung</a><a class="link" href="#wie">Wie funktioniert das?</a></div>' : ''}`;
}

function renderHow() {
  const list = (S.st ? mods() : ALL_MODULES.filter((m) => !['rides', 'polls', 'thanks'].includes(m)));
  app.innerHTML = `
    ${header('Wie funktioniert das?', '')}
    <div class="card prose"><ol class="steps">
      <li><b>Anmelden:</b> Beim ersten Mal mit dem Hauspasswort einen eigenen Zugang anlegen (Name + Passwort). Danach reicht dein Name und Passwort.</li>
      <li><b>Stöbern:</b> Unten in der Leiste findest du alle Bereiche. Auf der Startseite kannst du auch nach allem suchen.</li>
      <li><b>Eintragen:</b> In jedem Bereich gibt es unten rechts einen gelben Knopf „＋“. Damit trägst du etwas ein – zum Beispiel deine Leiter.</li>
      <li><b>Kontakt aufnehmen:</b> Tippe bei einem Eintrag auf „Kontakt“. Dort steht, wie man die Person erreicht – z. B. „3. OG, einfach klingeln“. Den Rest klärt ihr direkt.</li>
      <li><b>Verleihen:</b> Wenn du etwas verliehen hast, tippe auf „Verliehen“ und trag ein, bis wann. Dann sehen die anderen, dass es gerade weg ist, und du bekommst eine Erinnerung.</li>
      <li><b>Ändern & Löschen:</b> Deine eigenen Einträge kannst du jederzeit mit „Bearbeiten“ oder „Löschen“ anpassen.</li>
      <li><b>Als App aufs Handy:</b> ${/iphone|ipad/i.test(navigator.userAgent) ? 'Teilen-Symbol → „Zum Home-Bildschirm“.' : 'Im Browser-Menü „App installieren“ oder „Zum Startbildschirm hinzufügen“.'}</li>
      <li><b>Passwort vergessen?</b> Es gibt keine E-Mail. Sag ${esc(MAINTAINER)} Bescheid – dein Passwort wird dann zurückgesetzt.</li>
    </ol></div>
    <h2 class="section-title">Die Bereiche</h2>
    <div class="card list-menu">${list.map((m) => `<div style="display:flex;gap:14px;padding:10px 4px;border-bottom:1px solid var(--line)"><span class="ic" style="font-size:1.4rem">${MOD[m].ic}</span><span><b>${MOD[m].name}</b><br><small style="color:var(--ink-soft)">${MOD[m].desc}</small></span></div>`).join('')}</div>
    ${!S.st ? '<div class="small-links"><a class="link" href="#start">← Zur Anmeldung</a><a class="link" href="#was">Was ist das hier?</a></div>' : ''}`;
}

function renderFeedback() {
  app.innerHTML = `
    ${header('Fehler melden & Feedback', `Danke, dass du hilfst, die App besser zu machen! Deine Nachricht geht direkt an ${esc(MAINTAINER)}.`)}
    <div class="card"><form data-form="feedback">
      <label for="fb-t">Was ist passiert oder was wünschst du dir?</label>
      <textarea id="fb-t" name="text" required minlength="3" placeholder="z. B. Wenn ich auf „Speichern“ tippe, passiert nichts."></textarea>
      <label for="fb-s">Screenshot <span class="opt">(freiwillig)</span></label>
      <input id="fb-s" name="screenshot" type="file" accept="image/*">
      <p class="hint">Bildschirmfoto: meist gleichzeitig Power- und Leiser-Taste drücken.</p>
      <div class="sheet-actions"><button>Absenden</button></div>
    </form></div>`;
}

// ---------- Verwaltung ----------
async function renderAdmin() {
  const sup = session.isSuper;
  if (!sup && !me()?.admin) return go('start');
  if (sup && !session.slug) {
    let houses = [];
    try { houses = await call('GET', '/admin/houses'); } catch (e) { return handleErr(e); }
    app.innerHTML = `${header('Gesamtverwaltung', 'Alle Häuser')}
      ${houses.map((h) => `<div class="card"><div class="title-row"><h3>🏠 ${esc(h.name)}</h3><button class="small" data-act="pick-house" data-slug="${esc(h.slug)}">Verwalten</button></div><div class="meta">Kennung: ${esc(h.slug)} · seit ${ago(h.at)}</div></div>`).join('') || '<div class="empty">Noch kein Haus angelegt.</div>'}
      <div class="card"><form data-form="new-house"><h2>Neues Haus anlegen</h2>
        <label for="h-n">Name</label><input id="h-n" name="name" type="text" required placeholder="z. B. Brandvorwerkstraße 59">
        <label for="h-p">Hauspasswort</label><input id="h-p" name="housePassword" type="text" required minlength="6" autocomplete="off">
        <p class="hint">Das Passwort schickst du zusammen mit dem Link in die Hausgruppe. Am besten etwas Einfaches, aber nicht Erratbares.</p>
        <div class="sheet-actions"><button>Haus anlegen</button></div></form></div>
      <div class="actions"><button class="secondary" data-act="logout">Abmelden</button></div>`;
    return;
  }
  if (!S.st) { try { await loadState(); } catch (e) { return handleErr(e); } renderNav(); }
  let feedback = [];
  try { feedback = await call('GET', '/admin/feedback'); } catch {}
  const h = S.st.house;
  const link = location.origin + location.pathname + '?haus=' + encodeURIComponent(h.slug) + (DEMO ? '&demo' : '');
  app.innerHTML = `
    ${header('Verwaltung', esc(h.name))}
    ${sup ? '<div class="actions" style="margin-bottom:12px"><button class="secondary" data-act="pick-house" data-slug="">← Alle Häuser</button></div>' : ''}
    <div class="card"><h2>📨 Einladen</h2>
      <p class="text">Diesen Link zusammen mit dem Hauspasswort in die Hausgruppe schicken:</p>
      <div class="share-box">${esc(link)}</div>
      <div class="actions"><button class="small" data-act="copy" data-text="${esc(link)}">Link kopieren</button>
      <button class="small secondary" data-act="copy" data-text="${esc(`Hallo zusammen! 🏡 Für unser Haus gibt es jetzt die Allmende – eine kleine App, um Werkzeug, Hilfe und Termine zu teilen. Kostenlos, ohne Werbung, ohne Datensammeln.\n\nLink: ${link}\nHauspasswort: (bitte einsetzen)\n\nEinfach öffnen, „Ich bin neu hier“ wählen und loslegen.`)}">Einladungstext kopieren</button></div>
    </div>
    <div class="card"><form data-form="house-settings"><h2>⚙️ Haus-Einstellungen</h2>
      <label for="hs-n">Name des Hauses</label><input id="hs-n" name="name" type="text" value="${esc(h.name)}">
      <label for="hs-p">Neues Hauspasswort <span class="opt">(leer = bleibt gleich)</span></label><input id="hs-p" name="housePassword" type="text" minlength="6" autocomplete="off">
      <p class="hint">Wer schon einen Zugang hat, bleibt angemeldet. Das Hauspasswort braucht man nur zum Registrieren.</p>
      <label>Bereiche in diesem Haus</label>
      ${ALL_MODULES.map((m) => `<label class="check"><input type="checkbox" name="mod-${m}" ${h.modules.includes(m) ? 'checked' : ''}> ${MOD[m].ic} ${MOD[m].name}</label>`).join('')}
      <div class="sheet-actions"><button>Speichern</button></div></form></div>
    <div class="card"><h2>👥 Personen (${S.st.users.length})</h2>
      ${S.st.users.map((u) => `<div style="padding:10px 0;border-bottom:1px solid var(--line)">
        <b>${esc(u.name)}</b> ${u.admin ? '<span class="badge">Verwaltung</span>' : ''}<div class="meta">dabei seit ${ago(u.at)}${u.contact ? ' · ' + esc(u.contact) : ''}</div>
        <div class="actions"><button class="small secondary" data-act="reset-pw" data-id="${u.id}" data-name="${esc(u.name)}">Passwort zurücksetzen</button>
        ${sup ? `<button class="small secondary" data-act="toggle-admin" data-id="${u.id}" data-admin="${u.admin ? '0' : '1'}">${u.admin ? 'Verwaltung entziehen' : 'Zur Verwaltung machen'}</button>` : ''}
        ${u.id !== me().id ? `<button class="small danger" data-act="remove-user" data-id="${u.id}" data-name="${esc(u.name)}">Entfernen</button>` : ''}</div></div>`).join('') || '<p class="text">Noch niemand registriert.</p>'}
    </div>
    <div class="card"><h2>✉️ Feedback (${feedback.length})</h2>
      ${feedback.slice().reverse().map((f) => `<div style="padding:10px 0;border-bottom:1px solid var(--line)">
        <div class="meta">${esc(f.by)} · ${ago(f.at)}${f.page ? ' · Seite: ' + esc(f.page) : ''}</div><p class="text">${esc(f.text)}</p>
        ${f.screenshot ? `<img class="photo" style="width:100%;border-radius:12px;margin-top:8px" alt="Screenshot" loading="lazy" src="${esc(imgSrc(f.screenshot))}">` : ''}
        ${f.ua ? `<p class="hint">${esc(f.ua)}</p>` : ''}
        <div class="actions"><button class="small ghost" data-act="del-feedback" data-id="${f.id}">Erledigt – löschen</button></div></div>`).join('') || '<p class="text">Kein Feedback.</p>'}
    </div>`;
}

// ---------- Untere Ebene ----------
function openSheet(html) {
  $('#sheet').innerHTML = html;
  $('#sheet-wrap').hidden = false;
  if (!S.sheetOpen) { history.pushState({ sheet: 1 }, ''); S.sheetOpen = true; }
  document.body.style.overflow = 'hidden';
  setTimeout(() => $('#sheet input:not([type=hidden]), #sheet textarea, #sheet button')?.focus(), 50);
}
function closeSheet(fromPop) {
  if (!S.sheetOpen) return;
  S.sheetOpen = false;
  $('#sheet-wrap').hidden = true;
  $('#sheet').innerHTML = '';
  document.body.style.overflow = '';
  if (!fromPop && history.state?.sheet) history.back();
}
window.addEventListener('popstate', () => { if (S.sheetOpen) closeSheet(true); });
$('#sheet-wrap').addEventListener('click', (e) => { if (e.target.id === 'sheet-wrap') closeSheet(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

const sheetHead = (t) => `<div class="sheet-head"><h2>${t}</h2><button class="close" data-act="close" aria-label="Schließen">✕</button></div>`;

function findItem(col, id) { return (S.st.data[col] || []).find((x) => x.id === id); }

function openForm(col, item, preset = {}) {
  const v = item || { kind: col === 'gifts' ? 'ding' : col === 'away' ? 'weg' : col === 'events' ? 'einladung' : undefined, status: col === 'defects' ? 'offen' : undefined, from: col === 'away' ? isoDay() : undefined, since: col === 'defects' ? isoDay() : undefined, ...preset };
  const fields = FORMS[col].map((f) => {
    const id = 'ff-' + f.k;
    const val = v[f.k] ?? '';
    const lab = `<label for="${id}">${f.label}${f.req ? '' : ' <span class="opt">(freiwillig)</span>'}</label>`;
    const hint = f.hint ? `<p class="hint">${f.hint}</p>` : '';
    switch (f.type) {
      case 'textarea': return lab + `<textarea id="${id}" name="${f.k}" ${f.req ? 'required' : ''} placeholder="${esc(f.ph || '')}" ${f.big ? 'style="min-height:200px"' : ''}>${esc(val)}</textarea>` + hint;
      case 'select': {
        const opts = Array.isArray(f.opts) ? Object.fromEntries(f.opts.map((o) => [o, o])) : f.opts;
        return lab.replace(' <span class="opt">(freiwillig)</span>', '') + `<select id="${id}" name="${f.k}">${Array.isArray(f.opts) ? '<option value="">– bitte wählen –</option>' : ''}${Object.entries(opts).map(([k, l]) => `<option value="${esc(k)}" ${k === val ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>` + hint;
      }
      case 'date': case 'time': return lab + `<input id="${id}" name="${f.k}" type="${f.type}" value="${esc(val)}" ${f.req ? 'required' : ''}>` + hint;
      case 'photo': return lab + (val ? `<img class="photo" alt="" src="${esc(imgSrc(val))}" style="width:100%;max-height:200px;object-fit:cover;border-radius:12px"><label class="check"><input type="checkbox" name="photo-remove"> Foto entfernen</label>` : '') +
        `<input id="${id}" name="photo-file" type="file" accept="image/*"><input type="hidden" name="photo" value="${esc(val)}">`;
      case 'options': return lab + `<textarea id="${id}" name="options" required placeholder="${esc(f.ph)}" ${item && Object.keys(item.votes || {}).length ? 'disabled' : ''}>${esc((v.options || []).join('\n'))}</textarea>${item && Object.keys(item.votes || {}).length ? '<p class="hint">Antworten lassen sich nach der ersten Stimme nicht mehr ändern.</p>' : ''}`;
      default: return lab + `<input id="${id}" name="${f.k}" type="text" value="${esc(val)}" ${f.req ? 'required' : ''} placeholder="${esc(f.ph || '')}" maxlength="${f.k === 'contact' ? 200 : 120}">` + hint;
    }
  }).join('');
  openSheet(`${sheetHead(item ? 'Bearbeiten' : `${MOD[col].ic} ${MOD[col].add}`)}
    <form data-form="item" data-col="${col}" data-id="${item ? item.id : ''}">${fields}
      <div class="err" hidden></div>
      <div class="sheet-actions"><button type="button" class="secondary" data-act="close">Abbrechen</button><button>Speichern</button></div>
    </form>`);
}

async function compressImage(file, maxSide = 1280, maxLen = 600000) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Dieses Bildformat kann nicht gelesen werden.')); i.src = url; });
    let side = maxSide, q = 0.8, out = '';
    for (let i = 0; i < 6; i++) {
      const scale = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
      const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      out = c.toDataURL('image/jpeg', q).split(',')[1];
      if (out.length <= maxLen) return out;
      side *= 0.8; q -= 0.08;
    }
    return out;
  } finally { URL.revokeObjectURL(url); }
}

// ---------- Aktionen (Klicks) ----------
const actions = {
  close: () => closeSheet(),
  goto: (d) => go(d.h),
  'login-mode': (d) => { S.loginMode = d.mode; renderLogin(); },
  'other-house': () => { session.slug = ''; S.loginHouse = null; S.forceNoHouse = true; history.replaceState(null, '', location.pathname + (location.search.includes('demo') ? '?demo' : '') + '#start'); renderLogin(); },
  'reload-page': () => location.reload(),
  'demo-login': async () => { try { const r = await call('POST', '/login', { slug: 'demo', name: 'Eric', password: 'demo123' }); await afterLogin(r.token, 'demo'); } catch (e) { toast(e.message); } },
  'reset-demo': () => { resetDemo(); location.reload(); },
  'dismiss-welcome': () => { session.pref('welcomed', '1'); renderStart(); },
  'dismiss-install': () => { session.pref('install-dismissed', '1'); renderStart(); },
  install: async () => { if (!S.installEvt) return; S.installEvt.prompt(); await S.installEvt.userChoice.catch(() => {}); S.installEvt = null; render(); },
  logout: () => { const wasSuper = session.isSuper; session.clear(); if (wasSuper) session.slug = ''; S.st = null; S.loginHouse = null; go('start'); },
  font: (d) => { document.documentElement.classList.toggle('big', d.big === '1'); session.pref('big', d.big === '1' ? '1' : null); renderProfile(); },
  new: (d) => openForm(d.col, null, d.title ? { title: d.title } : {}),
  edit: (d) => { const it = findItem(d.col, d.id); if (it) openForm(d.col, it); },
  del: (d) => {
    const it = findItem(d.col, d.id);
    openSheet(`${sheetHead('Wirklich löschen?')}<p class="text">„${esc(it?.title || it?.text || 'Eintrag')}“ wird gelöscht.</p>
      <div class="sheet-actions"><button class="secondary" data-act="close">Abbrechen</button><button class="danger" data-act="del-yes" data-col="${d.col}" data-id="${d.id}">Löschen</button></div>`);
  },
  'del-yes': async (d) => { try { await call('DELETE', `/items/${d.col}/${d.id}`); closeSheet(); toast('Gelöscht'); await reload(); } catch (e) { handleErr(e); } },
  contact: (d) => {
    const it = findItem(d.col, d.id); if (!it) return;
    const u = S.users.get(it.by);
    const c = it.contact || u?.contact;
    openSheet(`${sheetHead('💬 Kontakt')}<p class="text">${esc(it.title || '')}</p>
      <p class="text">Von <b>${esc(userName(it.by))}</b>:</p>
      <div class="contact-big">${c ? esc(c) : 'Kein Kontakthinweis eingetragen.\nFrag am besten in der Hausgruppe nach ' + esc(userName(it.by)) + '.'}</div>
      <p class="hint">Den Rest klärt ihr direkt miteinander. 🙂</p>
      <div class="sheet-actions"><button data-act="close">Alles klar</button></div>`);
  },
  lend: (d) => {
    const it = findItem('things', d.id);
    const def = new Date(); def.setDate(def.getDate() + 7);
    openSheet(`${sheetHead('📤 Verliehen')}<form data-form="lend" data-id="${d.id}"><p class="text">${esc(it.title)}</p>
      <label for="l-to">An wen? <span class="opt">(freiwillig, sehen nur du und die Verwaltung)</span></label><input id="l-to" name="lentTo" type="text" maxlength="80" list="userlist">
      <datalist id="userlist">${S.st.users.filter((u) => u.id !== me().id).map((u) => `<option value="${esc(u.name)}">`).join('')}</datalist>
      <label for="l-d">Zurück bis</label><input id="l-d" name="returnDate" type="date" value="${isoDay(def)}">
      <div class="sheet-actions"><button type="button" class="secondary" data-act="close">Abbrechen</button><button>Speichern</button></div></form>`);
  },
  returned: async (d) => { try { await call('PUT', `/items/things/${d.id}`, { status: 'frei', lentTo: '', returnDate: '' }); toast('Schön, dass es zurück ist!'); await reload(); } catch (e) { handleErr(e); } },
  reserve: async (d) => { const it = findItem('gifts', d.id); try { await call('PUT', `/items/gifts/${d.id}`, { status: it.status === 'reserviert' ? '' : 'reserviert' }); await reload(); } catch (e) { handleErr(e); } },
  affect: async (d) => { try { await call('POST', `/items/defects/${d.id}/affect`); await reload(); } catch (e) { handleErr(e); } },
  vote: async (d) => {
    const it = findItem('polls', d.id); const opt = Number(d.opt);
    try { await call('POST', `/items/polls/${d.id}/vote`, { option: it.votes?.[me().id] === opt ? null : opt }); await reload(); } catch (e) { handleErr(e); }
  },
  'close-poll': async (d) => { try { await call('PUT', `/items/polls/${d.id}`, { closed: true }); toast('Umfrage beendet'); await reload(); } catch (e) { handleErr(e); } },
  'delete-me': () => openSheet(`${sheetHead('Zugang löschen?')}<p class="text">Dein Zugang und <b>alle deine Einträge</b> werden gelöscht. Das lässt sich nicht rückgängig machen.</p>
    <div class="sheet-actions"><button class="secondary" data-act="close">Abbrechen</button><button class="danger" data-act="delete-me-yes">Endgültig löschen</button></div>`),
  'delete-me-yes': async () => { try { await call('DELETE', '/me'); closeSheet(); session.clear(); S.st = null; toast('Dein Zugang wurde gelöscht.'); go('start'); } catch (e) { handleErr(e); } },
  copy: async (d) => { try { await navigator.clipboard.writeText(d.text); toast('Kopiert!'); } catch { toast('Kopieren nicht möglich – bitte markieren und kopieren.'); } },
  'pick-house': async (d) => { session.slug = d.slug; S.st = null; if (d.slug) { try { await loadState(); } catch (e) { return handleErr(e); } } renderNav(); renderAdmin(); },
  'reset-pw': (d) => openSheet(`${sheetHead('Passwort zurücksetzen')}<form data-form="reset-pw" data-id="${d.id}">
    <p class="text">Neues Passwort für <b>${esc(d.name)}</b>. Gib es der Person danach persönlich.</p>
    <label for="r-p">Neues Passwort</label><input id="r-p" name="password" type="text" required minlength="6" autocomplete="off" value="${Math.random().toString(36).slice(2, 8)}">
    <div class="sheet-actions"><button type="button" class="secondary" data-act="close">Abbrechen</button><button>Zurücksetzen</button></div></form>`),
  'toggle-admin': async (d) => { try { await call('POST', `/admin/users/${d.id}/admin`, { admin: d.admin === '1' }); await loadState(); renderAdmin(); } catch (e) { handleErr(e); } },
  'remove-user': (d) => openSheet(`${sheetHead('Person entfernen?')}<p class="text"><b>${esc(d.name)}</b> und alle Einträge dieser Person werden gelöscht.</p>
    <div class="sheet-actions"><button class="secondary" data-act="close">Abbrechen</button><button class="danger" data-act="remove-user-yes" data-id="${d.id}">Entfernen</button></div>`),
  'remove-user-yes': async (d) => { try { await call('DELETE', `/admin/users/${d.id}`); closeSheet(); toast('Entfernt'); await loadState(); renderAdmin(); } catch (e) { handleErr(e); } },
  'del-feedback': async (d) => { try { await call('DELETE', `/admin/feedback/${d.id}`); renderAdmin(); } catch (e) { handleErr(e); } },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  e.preventDefault();
  const fn = actions[el.dataset.act];
  if (fn) fn(el.dataset, el);
});

// ---------- Formulare ----------
async function afterLogin(token, slug, isSuper = false) {
  session.token = token; session.slug = slug; session.isSuper = isSuper;
  if (location.search.includes('haus=')) history.replaceState(null, '', location.pathname + (DEMO && location.search.includes('demo') ? '?demo' : ''));
  if (isSuper) { S.st = null; go('verwaltung'); return; }
  await loadState();
  S.prevSeen = Number(session.pref('seen:' + slug)) || 0;
  go('start');
}

const forms = {
  house: async (fd) => { S.loginHouse = null; S.forceNoHouse = false; const slug = fd.get('slug').trim().toLowerCase(); history.replaceState(null, '', location.pathname + '?haus=' + encodeURIComponent(slug) + (DEMO ? '&demo' : '')); await renderLogin(); },
  join: async (fd) => {
    if (fd.get('password') !== fd.get('password2')) throw new Error('Die beiden Passwörter sind nicht gleich.');
    const slug = S.loginHouse.slug;
    const r = await call('POST', '/join', { slug, housePassword: fd.get('housePassword'), name: fd.get('name'), password: fd.get('password'), contact: fd.get('contact') });
    session.pref('seen:' + slug, String(Date.now()));
    await afterLogin(r.token, slug);
    toast('Willkommen in der Allmende! 🎉');
  },
  login: async (fd) => { const slug = S.loginHouse.slug; const r = await call('POST', '/login', { slug, name: fd.get('name'), password: fd.get('password') }); await afterLogin(r.token, slug); },
  'admin-login': async (fd) => { const r = await call('POST', '/admin/login', { key: fd.get('key') }); await afterLogin(r.token, '', true); },
  search: () => {},
  item: async (fd, form) => {
    const col = form.dataset.col, id = form.dataset.id;
    const body = {};
    for (const f of FORMS[col]) {
      if (f.type === 'photo') continue;
      if (f.type === 'options') { if (!form.querySelector('[name=options]').disabled) body.options = String(fd.get('options') || '').split('\n').map((s) => s.trim()).filter(Boolean); continue; }
      body[f.k] = fd.get(f.k) ?? '';
    }
    if (FORMS[col].some((f) => f.type === 'photo')) {
      const file = fd.get('photo-file');
      if (file && file.size) {
        form.querySelector('button:not([type=button])').textContent = 'Foto wird hochgeladen …';
        const data = await compressImage(file);
        body.photo = (await call('POST', '/upload', { data })).photo;
      } else body.photo = fd.get('photo-remove') ? '' : (fd.get('photo') || '');
    }
    if (col === 'away' && body.kind === 'weg' && !body.to) body.to = body.from;
    if (col === 'away' && body.kind === 'da') body.to = '';
    if (col === 'away' && body.to && body.to < body.from) throw new Error('„Bis“ liegt vor „Ab“.');
    if (id) await call('PUT', `/items/${col}/${id}`, body); else await call('POST', `/items/${col}`, body);
    closeSheet(); toast(id ? 'Gespeichert' : 'Eingetragen – danke fürs Teilen!');
    await reload();
  },
  lend: async (fd, form) => { await call('PUT', `/items/things/${form.dataset.id}`, { status: 'verliehen', lentTo: fd.get('lentTo'), returnDate: fd.get('returnDate') }); closeSheet(); toast('Als verliehen markiert'); await reload(); },
  profile: async (fd) => { const r = await call('PUT', '/me', { contact: fd.get('contact') }); S.st.me = r.me; toast('Gespeichert'); await reload(); },
  password: async (fd, form) => { const r = await call('PUT', '/me', { oldPassword: fd.get('oldPassword'), password: fd.get('password') }); if (r.token) session.token = r.token; form.reset(); toast('Passwort geändert'); },
  feedback: async (fd, form) => {
    const file = fd.get('screenshot');
    const body = { text: fd.get('text'), page: location.hash, ua: navigator.userAgent };
    if (file && file.size) body.screenshot = await compressImage(file, 1600);
    await call('POST', '/feedback', body);
    form.reset(); toast('Danke! Dein Feedback ist angekommen.'); go('start');
  },
  'new-house': async (fd, form) => { const r = await call('POST', '/admin/houses', { name: fd.get('name'), housePassword: fd.get('housePassword') }); form.reset(); toast('Haus angelegt'); actions['pick-house']({ slug: r.slug }); },
  'house-settings': async (fd) => {
    const body = { name: fd.get('name'), modules: ALL_MODULES.filter((m) => fd.get('mod-' + m)) };
    if (fd.get('housePassword')) body.housePassword = fd.get('housePassword');
    if (!body.modules.length) throw new Error('Mindestens ein Bereich muss an sein.');
    await call('PUT', '/admin/house', body); await loadState(); toast('Gespeichert'); renderNav(); renderAdmin();
  },
  'reset-pw': async (fd, form) => { await call('POST', `/admin/users/${form.dataset.id}/reset`, { password: fd.get('password') }); closeSheet(); toast('Passwort zurückgesetzt: ' + fd.get('password')); },
};

document.addEventListener('submit', async (e) => {
  const form = e.target.closest('form[data-form]');
  if (!form) return;
  e.preventDefault();
  const fn = forms[form.dataset.form];
  if (!fn) return;
  const btn = form.querySelector('button:not([type=button])');
  const errBox = form.querySelector('.err');
  const label = btn?.textContent;
  if (btn) { btn.disabled = true; btn.textContent = 'Einen Moment …'; }
  try { await fn(new FormData(form), form); }
  catch (err) {
    if (err.status === 401 && session.token) return handleErr(err);
    if (errBox) { errBox.textContent = err.message; errBox.hidden = false; } else toast(err.message);
  } finally { if (btn && btn.isConnected) { btn.disabled = false; btn.textContent = label; } }
});

document.addEventListener('input', (e) => { if (e.target.closest('form[data-form=search]')) doSearch(e.target.value); });

// ---------- Start ----------
window.addEventListener('hashchange', () => { if (S.sheetOpen) closeSheet(true); render(); });
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); S.installEvt = e; });
const markSeen = () => { if (S.st && !me()?.super) session.pref('seen:' + S.st.house.slug, String(Date.now())); };
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'hidden') return markSeen();
  if (S.st && !S.sheetOpen && Date.now() - S.loadedAt > 30000) { try { await loadState(); render(); } catch {} }
});
window.addEventListener('pagehide', markSeen);

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
if (session.pref('big')) document.documentElement.classList.add('big');
drawSky();

(async function init() {
  const qs = new URLSearchParams(location.search);
  if (qs.get('haus') && qs.get('haus') !== session.slug && !session.isSuper) { session.token = ''; }
  if (session.token) {
    try {
      if (!session.isSuper || session.slug) await loadState();
      if (S.st) S.prevSeen = Number(session.pref('seen:' + S.st.house.slug)) || 0;
    } catch (e) {
      if (e.status === 401) { session.clear(); S.st = null; }
      else { app.innerHTML = `${header('', '')}<div class="card"><h3>Keine Verbindung</h3><p class="text">${esc(e.message)}</p><div class="actions"><button data-act="reload-page">Nochmal versuchen</button></div></div>`; return; }
    }
  }
  render();
})();
