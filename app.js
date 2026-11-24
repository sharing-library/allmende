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

// ---------- Symbole (einfarbig, im Stil der Fußleiste) ----------
const IC = {
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  gift: '<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8.5h14V12M12 8v12.5"/><path d="M12 8C10.5 4.5 7 4.5 7 6.5S10 8 12 8zm0 0c1.5-3.5 5-3.5 5-1.5S14 8 12 8z"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  bag: '<rect x="3.5" y="7.5" width="17" height="12" rx="2"/><path d="M9 7.5v-2A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5v2M3.5 12.5h17"/>',
  alert: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.2v.3"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.3"/>',
  bike: '<circle cx="6" cy="16" r="3.5"/><circle cx="18" cy="16" r="3.5"/><path d="M6 16l4-8h5l3 8M10 8l3.5 8H6M14 5.5h2.5"/>',
  poll: '<path d="M5 20V11M12 20V5M19 20v-6"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  user: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20.5c1.2-3.8 4-5.5 7.5-5.5s6.3 1.7 7.5 5.5"/>',
  users: '<circle cx="9" cy="9" r="3.3"/><path d="M3 19.5c.9-3.2 3.2-4.7 6-4.7s5.1 1.5 6 4.7"/><path d="M15.5 6a3.2 3.2 0 0 1 0 6.2M17.5 14.9c1.8.6 3 2 3.5 4.6"/>',
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.5v.4M12 16.8v.3"/>',
  mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 7 8 6 8-6"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 8.5-8.5M16 7l2.5 2.5M14 9l2 2"/>',
  logout: '<path d="M14 4.5h4.5v15H14M10 8l-4 4 4 4M6 12h9"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  box: '<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>',
  edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  left: '<path d="m15 6-6 6 6 6"/>',
};
const ic = (k, cls = '') => `<svg class="i${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k]}</svg>`;

const MOD = {
  things:   { ic: 'wrench', name: 'Dinge leihen', short: 'Dinge', desc: 'Werkzeug & Co., das Nachbar*innen verleihen', add: 'Ding eintragen' },
  skills:   { ic: 'bulb', name: 'Fähigkeiten', short: 'Können', desc: 'Wobei Nachbar*innen helfen können', add: 'Fähigkeit eintragen' },
  requests: { ic: 'search', name: 'Ich suche …', short: 'Ich suche', desc: 'Bitten um Hilfe oder Dinge', add: 'Etwas suchen' },
  gifts:    { ic: 'gift', name: 'Verschenkekiste', short: 'Verschenken', desc: 'Dinge & Essen, das weg darf', add: 'Etwas verschenken' },
  events:   { ic: 'cal', name: 'Kalender', short: 'Kalender', desc: 'Was im und ums Haus passiert', add: 'Termin eintragen' },
  away:     { ic: 'bag', name: 'Bin weg / Bin da', short: 'Weg / Da', desc: 'Blumen gießen, Pakete annehmen', add: 'Eintragen' },
  defects:  { ic: 'alert', name: 'Mängel im Haus', short: 'Mängel', desc: 'Was kaputt ist – gesammelt', add: 'Mangel melden' },
  info:     { ic: 'info', name: 'Hausinfo', short: 'Hausinfo', desc: 'Müll, Hausverwaltung, Notfall', add: 'Info eintragen' },
  rides:    { ic: 'bike', name: 'Ich fahre los', short: 'Fahre los', desc: 'Baumarkt, Wertstoffhof – was mitbringen?', add: 'Fahrt eintragen' },
  polls:    { ic: 'poll', name: 'Umfragen', short: 'Umfragen', desc: 'Gemeinsam entscheiden', add: 'Umfrage starten' },
  thanks:   { ic: 'heart', name: 'Danke-Wand', short: 'Danke', desc: 'Kleine Dankeschöns', add: 'Danke sagen' },
};
const mic = (m) => ic(MOD[m].ic);
// „Ich suche“ und Verschenkekiste verschwinden eine Woche nach dem Eintragen bzw. der letzten Änderung
const EXPIRE_DAYS = { requests: 7, gifts: 7 };
const ageDays = (it) => (Date.now() - new Date(it.up || it.at).getTime()) / 86400000;
const expired = (col, it) => !!EXPIRE_DAYS[col] && ageDays(it) > EXPIRE_DAYS[col];
const daysLeft = (col, it) => Math.max(0, Math.ceil(EXPIRE_DAYS[col] - ageDays(it)));
const SHARE_TABS = ['things', 'skills', 'requests'];
const MENU_MODS = ['away', 'defects', 'info', 'rides', 'polls', 'thanks'];

// ---------- Bearbeitbare Texte ----------
// Format: Leerzeile = neuer Absatz · **fett** · *kursiv* · Zeilen mit „- “ = Liste · „1. “ = nummerierte Schritte
// {verwaltung} wird durch den Namen aus config.js ersetzt.
const D = {
  super_name: 'Gesamtverwaltung',
  login_lead: 'Hier teilen Nachbar*innen Werkzeug, Fähigkeiten und Zeit – kostenlos, ohne Werbung, ohne Datensammeln.',
  start_lead: 'Schön, dass du da bist. Was brauchst du heute?',
  start_q: 'Was haben wir alles im Haus?',
  start_more: 'Weitere Bereiche',
  start_cal: 'Kalender',
  welcome_title: 'Schön, dass du da bist!',
  welcome_text: 'Neu hier? In zwei Minuten erklärt: worum es geht und was mit deinen Daten passiert.',
  was_title: 'Was ist das hier?',
  was_intro: '**Allmende** nannte man früher das Land, das allen im Dorf gemeinsam gehörte: die Wiese, den Brunnen, den Wald. Niemand musste alles allein besitzen, weil man es teilte.\n\nDiese App ist eine kleine Allmende für unser Haus. Hier teilen wir Werkzeug, Fähigkeiten und Zeit, verschenken, was wir nicht mehr brauchen, und wissen, was im Haus los ist.\n\nEine Bohrmaschine wird im Schnitt nur wenige Minuten im Jahr benutzt. Nicht jeder Haushalt braucht eine eigene Leiter, einen Pömpel oder ein Dörrgerät – **es reicht, wenn einer im Haus es hat und teilt.**',
  was_safety_title: 'Sicherheit & Daten',
  was_safety: '- **Komplett kostenlos.** Jetzt und für immer. Keine Abos, keine Premium-Version.\n- **Keine Werbung, kein Tracking, keine Cookies.** Es werden keine Daten gesammelt, ausgewertet, verkauft oder weitergegeben.\n- **Keine privaten Daten nötig.** Kein echter Name, keine E-Mail, keine Telefonnummer, keine Adresse. Nur ein Name, unter dem dich die anderen im Haus erkennen.\n- **Nur fürs Haus.** Hineinkommen kann nur, wer Link und Hauspasswort hat. Jedes Haus sieht nur seine eigenen Einträge.\n- **Passwörter sind verschlüsselt.** Niemand – auch die Verwaltung nicht – kann sie lesen.\n- **Du hast die Kontrolle.** Du kannst deine Einträge jederzeit ändern oder löschen, und deinen ganzen Zugang auch.',
  was_tech: 'Technisch ehrlich: Gespeichert wird nur, was du selbst einträgst. Die Daten liegen in einem privaten Speicher bei GitHub und werden über Cloudflare übertragen – das ist reine Technik, über die nichts ausgewertet wird. Die App lädt keine Schriften, Skripte oder Bilder von fremden Servern. Die Verwaltung ({verwaltung}) kann technisch alle Einträge sehen, um bei Problemen helfen zu können, aber keine Passwörter.',
  was_who_title: 'Wer steckt dahinter?',
  was_who: 'Allmende ist ein kleines Soloprojekt von {verwaltung} – ohne kommerzielle Absicht, ohne Firma dahinter. Einfach, weil gute Nachbarschaft einfacher sein darf.\n\nTipps, Fragen, Ideen oder ein Fehler? Schreib gern eine kurze Beschreibung und – wenn möglich – einen Screenshot.',
  wie_title: 'Wie funktioniert das?',
  wie_steps: '1. **Anmelden:** Beim ersten Mal mit dem Hauspasswort einen eigenen Zugang anlegen (Name + Passwort). Danach reicht dein Name und Passwort.\n2. **Stöbern:** Unten in der Leiste findest du alle Bereiche. Auf der Startseite kannst du auch nach allem suchen.\n3. **Eintragen:** In jedem Bereich gibt es unten rechts einen gelben Knopf „+“. Damit trägst du etwas ein – zum Beispiel deine Leiter.\n4. **Kontakt aufnehmen:** Tippe bei einem Eintrag auf „Kontakt“. Dort steht, wie man die Person erreicht – z. B. „3. OG, einfach klingeln“. Den Rest klärt ihr direkt.\n5. **Verleihen:** Wenn du etwas verliehen hast, tippe auf „Verliehen“ und trag ein, bis wann. Dann sehen die anderen, dass es gerade weg ist, und du bekommst eine Erinnerung.\n6. **Ändern & Löschen:** Deine eigenen Einträge kannst du jederzeit mit „Bearbeiten“ oder „Löschen“ anpassen.\n7. **Als App aufs Handy:** iPhone: Teilen-Symbol → „Zum Home-Bildschirm“. Android: Browser-Menü (⋮) → „App installieren“.\n8. **Passwort vergessen?** Es gibt keine E-Mail. Sag {verwaltung} Bescheid – dein Passwort wird dann zurückgesetzt.',
  wie_areas_title: 'Die Bereiche',
  feedback_title: 'Fehler melden & Feedback',
  feedback_lead: 'Danke, dass du hilfst, die App besser zu machen! Deine Nachricht geht direkt an {verwaltung}.',
  empty_list: 'Hier ist noch nichts.\nMach den Anfang!',
  intro_things: 'Dinge, die Nachbar*innen verleihen. Tippe auf „Kontakt“, um zu fragen.',
  intro_skills: 'Wobei Nachbar*innen gern helfen.',
  intro_requests: 'Hier bitten Nachbar*innen um Hilfe oder suchen etwas. Kannst du helfen? Einträge verschwinden nach einer Woche von selbst.',
  intro_gifts: 'Alles hier ist geschenkt. Einfach melden und abholen. Einträge verschwinden nach einer Woche von selbst.',
  intro_events: 'Termine im und ums Haus: Infos, Feiern, Einladungen.',
  intro_away: 'Wer ist verreist und braucht Hilfe? Wer ist da und nimmt Pakete an?',
  intro_defects: 'Was im Haus kaputt ist. Wenn es dich auch betrifft, tippe „Betrifft mich auch“ – so sieht man, wie viele es stört.',
  intro_info: 'Wichtiges zum Haus an einem Ort.',
  intro_rides: 'Wer fährt wohin? Vielleicht kann jemand etwas mitbringen oder mitnehmen.',
  intro_polls: 'Gemeinsam entscheiden. Tippe auf eine Antwort, um abzustimmen.',
  intro_thanks: 'Kleine Dankeschöns an die Nachbarschaft.',
};
for (const m of Object.keys(MOD)) { D[`mod_${m}_name`] = MOD[m].name; D[`mod_${m}_desc`] = MOD[m].desc; D[`mod_${m}_add`] = MOD[m].add; }

let TEXTS = {};
try { TEXTS = JSON.parse(localStorage.getItem('allmende:texts') || '{}'); } catch {}
let TEXT_LAYERS = { global: {}, house: {} };
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{23F0}-\u{23FA}\u{FE0F}\u{200D}]\s?/gu;
const raw = (k) => String(TEXTS[k] ?? D[k] ?? '').replace(EMOJI, '');
const inlineMd = (src) => esc(src).replace(/\{verwaltung\}/g, esc(MAINTAINER)).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>');
function blockMd(src, listCls) {
  return String(src).split(/\n\s*\n/).map((blk) => {
    const lines = blk.split('\n').filter((l) => l.trim());
    if (lines.length && lines.every((l) => /^\s*[-•]\s+/.test(l))) return `<ul class="${listCls || ''}">${lines.map((l) => `<li>${inlineMd(l.replace(/^\s*[-•]\s+/, ''))}</li>`).join('')}</ul>`;
    if (lines.length && lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) return `<ol class="steps">${lines.map((l) => `<li>${inlineMd(l.replace(/^\s*\d+[.)]\s+/, ''))}</li>`).join('')}</ol>`;
    return lines.length ? `<p>${lines.map(inlineMd).join('<br>')}</p>` : '';
  }).join('');
}
// tx: bearbeitbarer Text als HTML · txt: nur Text (für Knöpfe, Hinweise)
function tx(k, o = {}) {
  if (o.block) return `<div data-text="${k}"${o.cls ? ` class="${o.cls}"` : ''}>${blockMd(raw(k), o.list)}</div>`;
  return `<span data-text="${k}">${inlineMd(raw(k)).replace(/\n/g, '<br>')}</span>`;
}
const txt = (k) => raw(k).replace(/\{verwaltung\}/g, MAINTAINER).replace(/\*\*?/g, '');
async function loadTexts() {
  try {
    const slug = session.slug || new URLSearchParams(location.search).get('haus') || '';
    TEXT_LAYERS = await call('GET', '/texts', null, slug ? { slug } : {});
    TEXTS = { ...TEXT_LAYERS.global, ...TEXT_LAYERS.house };
    localStorage.setItem('allmende:texts', JSON.stringify(TEXTS));
  } catch {}
}
const canEditTexts = () => session.isSuper || !!me()?.admin;

const CATEGORIES = ['Werkzeug', 'Haushalt', 'Küche', 'Garten & Balkon', 'Freizeit & Sport', 'Kinder', 'Sonstiges'];
const EVENT_KINDS = { info: 'Info fürs Haus', laut: 'Feier – kann lauter werden', einladung: 'Einladung – kommt vorbei', sonst: 'Sonstiges' };
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
    { k: 'kind', label: 'Art', type: 'select', opts: { ding: 'Ein Ding', essen: 'Essen übrig' } },
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
    { k: 'kind', label: 'Was möchtest du sagen?', type: 'select', opts: { weg: 'Ich bin weg', da: 'Ich bin da und nehme Pakete an' } },
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
// Detaillierte Stadtsilhouette – wird passend zur Bildschirmbreite gezeichnet
function drawSkyline() {
  const el = $('#skyline');
  const W = Math.max(320, Math.round(el.clientWidth || innerWidth));
  const H = Math.max(140, Math.round(el.clientHeight || 220));
  drawSkyline.w = W;
  let seed = 42;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const ri = (a, b) => a + Math.floor(r() * (b - a + 1));
  const n = (v) => Math.round(v * 10) / 10;
  let back = '', backWin = '', front = '', unlit = '', lit = '';

  // Fenster als Raster, das garantiert komplett in die Fläche passt
  function grid(bx, by, bw, bh, ww, wh, gx, gy, p = .3, opt = {}) {
    const cols = Math.floor((bw + gx) / (ww + gx)), rows = Math.floor((bh + gy) / (wh + gy));
    if (cols < 1 || rows < 1) return;
    const ox = bx + (bw - (cols * (ww + gx) - gx)) / 2;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const x = n(ox + i * (ww + gx)), y = n(by + j * (wh + gy));
      const rx = opt.arch ? ` rx="${ww / 2}" ry="${Math.min(ww / 2, 3)}"` : ' rx="1"';
      if (r() < p) lit += `<rect class="win${r() < .08 ? ' f' : ''}" x="${x}" y="${y}" width="${ww}" height="${wh}"${rx} style="animation-delay:${(r() * 9).toFixed(1)}s"/>`;
      else unlit += `<rect x="${x}" y="${y}" width="${ww}" height="${wh}"${rx}/>`;
    }
  }
  const hgt = (a, b) => Math.round(H * (a + r() * (b - a)));

  // Hintere Reihe: blasser, ruhiger
  let x = -10;
  while (x < W + 10) {
    const w = ri(40, 120), h = hgt(.5, .92), top = H - h;
    back += `<rect x="${x}" y="${top}" width="${w}" height="${h}"/>`;
    const t = r();
    if (t < .2) back += `<rect x="${x + n(w * .3)}" y="${top - 16}" width="2" height="16"/><rect x="${x + n(w * .3) - 3}" y="${top - 10}" width="8" height="2"/>`;
    else if (t < .3) back += `<polygon points="${x},${top} ${x + w / 2},${top - w * .35} ${x + w},${top}"/>`;
    else if (t < .34 && top > 60) back += `<rect x="${x + w * .6}" y="${top - 50}" width="3" height="50"/><rect x="${x + w * .1}" y="${top - 50}" width="${w * .9 + 30}" height="3"/><rect x="${x + w * .6 + 26}" y="${top - 47}" width="1" height="22"/>`; // Kran
    for (let wy = top + 8; wy + 6 <= H - 6; wy += 12) for (let wx = x + 6; wx + 4 <= x + w - 6; wx += 10) if (r() < .07) backWin += `<rect x="${wx}" y="${wy}" width="4" height="6"/>`;
    x += w + ri(0, 8);
  }

  // Vordere Reihe: verschiedene Haustypen
  const types = ['altbau', 'altbau', 'altbau', 'gable', 'gable', 'platte', 'modern', 'stepped', 'altbau', 'factory'];
  const churchAt = W > 560 ? W * (.55 + r() * .25) : -1;
  let church = false, factories = 0;
  x = -ri(0, 20);
  while (x < W + 10) {
    if (!church && churchAt > 0 && x > churchAt) {
      church = true;
      const tw = 30, th = hgt(.5, .58), sp = Math.min(H * .32, H - th - 6), top = H - th;
      front += `<rect x="${x}" y="${top}" width="${tw}" height="${th}"/><polygon points="${x - 3},${top} ${x + tw / 2},${top - sp} ${x + tw + 3},${top}"/><rect x="${x + tw / 2 - .75}" y="${top - sp - 10}" width="1.5" height="10"/><rect x="${x + tw / 2 - 4}" y="${top - sp - 7}" width="8" height="1.5"/>`;
      lit += `<circle cx="${x + tw / 2}" cy="${top + 14}" r="5"/>`;
      grid(x + 8, top + 30, tw - 16, th - 46, 5, 14, 6, 14, .5, { arch: 1 });
      const nw = ri(60, 80), nh = hgt(.3, .36), nt = H - nh;
      front += `<rect x="${x + tw}" y="${nt}" width="${nw}" height="${nh}"/><polygon points="${x + tw},${nt} ${x + tw + nw / 2},${nt - nw * .38} ${x + tw + nw},${nt}"/>`;
      grid(x + tw + 8, nt + 10, nw - 16, nh - 22, 6, 16, 10, 12, .6, { arch: 1 });
      x += tw + nw + ri(2, 8);
      continue;
    }
    let t = types[ri(0, types.length - 1)];
    if (t === 'factory' && factories >= 1) t = 'altbau';
    if (t === 'altbau') {
      const w = ri(64, 110), h = hgt(.42, .72), top = H - h;
      const roofH = Math.min(22, top - 4);
      front += `<rect x="${x}" y="${top}" width="${w}" height="${h}"/><rect x="${x - 3}" y="${top - 5}" width="${w + 6}" height="5"/>`;
      front += `<polygon points="${x},${top - 5} ${x + 9},${top - 5 - roofH} ${x + w - 9},${top - 5 - roofH} ${x + w},${top - 5}"/>`;
      const dormers = Math.max(1, Math.floor(w / 40));
      for (let d = 0; d < dormers; d++) {
        const dx = x + (w / (dormers + 1)) * (d + 1) - 6;
        front += `<rect x="${n(dx)}" y="${top - 5 - roofH * .75}" width="12" height="${n(roofH * .75)}"/><polygon points="${n(dx - 1)},${n(top - 5 - roofH * .75)} ${n(dx + 6)},${n(top - 5 - roofH - 3)} ${n(dx + 13)},${n(top - 5 - roofH * .75)}"/>`;
        if (r() < .35) lit += `<rect class="win" x="${n(dx + 3)}" y="${n(top - 5 - roofH * .55)}" width="6" height="${n(roofH * .45)}" rx="1"/>`;
      }
      if (r() < .6) front += `<rect x="${x + w * .75}" y="${top - 5 - roofH - 10}" width="7" height="12"/>`;
      grid(x + 8, top + 10, w - 16, h - 40, 8, 13, 9, 13, .3);
      front += `<rect x="${x + w / 2 - 9}" y="${H - 4}" width="18" height="4"/>`;
      unlit += `<rect x="${x + w / 2 - 6}" y="${H - 22}" width="12" height="20" rx="6" ry="6"/>`;
      if (r() < .5) for (let by = top + 36; by < H - 40; by += 26) if (r() < .3) front += `<rect x="${x + w / 2 - 12}" y="${by}" width="24" height="3"/>`; // Balkone
      x += w;
    } else if (t === 'gable') {
      const w = ri(46, 74), h = hgt(.3, .55), top = H - h, rh = Math.min(w * .5, top - 6);
      front += `<rect x="${x}" y="${top}" width="${w}" height="${h}"/><polygon points="${x - 3},${top} ${x + w / 2},${top - rh} ${x + w + 3},${top}"/><rect x="${x + w * .7}" y="${top - rh * .8}" width="7" height="${n(rh * .5)}"/>`;
      (r() < .4 ? (lit += `<circle cx="${x + w / 2}" cy="${n(top - rh * .38)}" r="4"/>`) : (unlit += `<circle cx="${x + w / 2}" cy="${n(top - rh * .38)}" r="4"/>`));
      grid(x + 8, top + 10, w - 16, h - 34, 9, 11, 10, 13, .3);
      unlit += `<rect x="${x + 8}" y="${H - 20}" width="11" height="18" rx="1"/>`;
      x += w;
    } else if (t === 'stepped') {
      const w = ri(50, 66), h = hgt(.35, .55), top = H - h, st = Math.min(12, (top - 6) / 4), sw = w / 8;
      let pts = `${x},${H} ${x},${top}`;
      for (let i = 1; i <= 4; i++) pts += ` ${n(x + sw * (i - 1))},${n(top - st * i)} ${n(x + sw * i)},${n(top - st * i)}`;
      for (let i = 4; i >= 1; i--) pts += ` ${n(x + w - sw * i)},${n(top - st * i)} ${n(x + w - sw * (i - 1))},${n(top - st * (i - 1))}`;
      front += `<polygon points="${pts} ${x + w},${H}"/>`;
      grid(x + 9, top + 8, w - 18, h - 30, 8, 12, 9, 12, .3, { arch: 1 });
      x += w;
    } else if (t === 'platte') {
      const w = ri(120, 170), h = hgt(.5, .68), top = H - h;
      front += `<rect x="${x}" y="${top}" width="${w}" height="${h}"/><rect x="${x + 10}" y="${top - 8}" width="22" height="8"/><rect x="${x + w - 30}" y="${top - 20}" width="2" height="20"/><rect x="${x + w - 36}" y="${top - 16}" width="14" height="2"/>`;
      grid(x + 7, top + 8, w - 14, h - 22, 7, 8, 6, 8, .28);
      x += w;
    } else if (t === 'modern') {
      const w = ri(46, 70), h = hgt(.62, .86), top = H - h, sl = Math.min(18, top - 4);
      front += `<polygon points="${x},${H} ${x},${top} ${x + w},${top - sl} ${x + w},${H}"/>`;
      grid(x + 6, top + 6, w - 12, h - 20, w - 12, 5, 0, 7, .22);
      x += w;
    } else if (t === 'factory') {
      factories++;
      const w = ri(120, 160), h = hgt(.26, .34), top = H - h, teeth = Math.floor(w / 24), tw = w / teeth;
      let pts = `${x},${H} ${x},${top}`;
      for (let i = 0; i < teeth; i++) pts += ` ${n(x + i * tw)},${n(top - 16)} ${n(x + (i + 1) * tw)},${top}`;
      front += `<polygon points="${pts} ${x + w},${H}"/>`;
      const ch = Math.min(H * .78, H - 6), cx = x + w - 22;
      front += `<polygon points="${cx},${H - h} ${cx + 3},${H - ch} ${cx + 11},${H - ch} ${cx + 14},${H - h}"/><rect x="${cx + 1}" y="${H - ch + 14}" width="12" height="3"/><rect x="${cx + 1}" y="${H - ch + 30}" width="12" height="3"/>`;
      grid(x + 8, top + 10, w - 40, h - 22, 16, 11, 7, 10, .55);
      x += w;
    }
    // Lücke mit Baum oder Laterne
    const gap = r();
    if (gap < .22) {
      const gw = ri(18, 30), cx = x + gw / 2, tr = ri(9, 14);
      front += `<rect x="${cx - 1.5}" y="${H - 18}" width="3" height="18"/><circle cx="${cx}" cy="${H - 18 - tr * .6}" r="${tr}"/><circle cx="${cx - tr * .7}" cy="${H - 18 - tr * .2}" r="${tr * .7}"/><circle cx="${cx + tr * .7}" cy="${H - 18 - tr * .25}" r="${tr * .75}"/>`;
      x += gw;
    } else if (gap < .32) {
      const gw = 14, cx = x + 7;
      front += `<rect x="${cx - 1}" y="${H - 34}" width="2" height="34"/><rect x="${cx - 4}" y="${H - 36}" width="8" height="3" rx="1"/>`;
      lit += `<circle cx="${cx}" cy="${H - 31}" r="2.2"/>`;
      x += gw;
    } else x += ri(0, 3);
  }
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">
    <g fill="#222a57">${back}</g><g fill="#c9a24a" opacity=".45">${backWin}</g>
    <g fill="#0b1022">${front}<rect x="0" y="${H - 2}" width="${W}" height="2"/></g>
    <g fill="#18204a">${unlit}</g><g class="lit" fill="#ffc94d">${lit}</g></svg>`;
}
let skyResize;
window.addEventListener('resize', () => { clearTimeout(skyResize); skyResize = setTimeout(() => { if (Math.abs(($('#skyline').clientWidth || 0) - (drawSkyline.w || 0)) > 40) drawSkyline(); }, 200); });

function drawSky() {
  const sky = $('#sky');
  let rnd = 7;
  const r = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
  let html = '<div class="moon"></div>';
  for (let i = 0; i < 46; i++) html += `<i class="star" style="left:${(r() * 100).toFixed(1)}%;top:${(r() * 55).toFixed(1)}%;animation-delay:${(r() * 4).toFixed(1)}s;${r() > .8 ? 'width:3px;height:3px;' : ''}"></i>`;
  sky.innerHTML = html;

  drawSkyline();
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

// Logo (Variante E): leichte Grotesk im Blocksatz, beide Wörter exakt gleich breit
function logo() {
  return `<svg class="logo" viewBox="0 0 132 46" width="132" height="46" role="img" aria-label="allmende – teilgut">
    <text x="0" y="25" textLength="132" lengthAdjust="spacing" class="l1">allmende</text>
    <text x="1" y="42" textLength="130" lengthAdjust="spacing" class="l2">teilgut</text></svg>`;
}
function header(title, lead) {
  return `
    <div class="top">
      <a class="brand" href="#start" aria-label="allmende – teilgut, zur Startseite">${logo()}</a>
      <nav class="top-help" aria-label="Hilfe">
        <a href="#was" ${route()[0] === 'was' ? 'aria-current="page"' : ''}>${ic('info')}<span>Was ist das?</span></a>
        <a href="#wie" ${route()[0] === 'wie' ? 'aria-current="page"' : ''}>${ic('help')}<span>So geht's</span></a>
      </nav>
    </div>
    ${S.st?.house.name ? `<div class="house-name">${ic('home')} ${esc(S.st.house.name)}</div>` : ''}
    ${DEMO ? `<div class="demo-banner"><b>Demo-Modus</b> – alles bleibt nur auf diesem Gerät. <button class="secondary" data-act="reset-demo">Demo zurücksetzen</button></div>` : ''}
    ${me()?.super ? `<div class="demo-banner">Du bist als <b>Gesamtverwaltung</b> angemeldet und kannst hier nur verwalten, nichts eintragen. <button class="secondary" data-act="switch-to-house">Mit Haus-Zugang anmelden</button> <button class="secondary" data-act="goto" data-h="verwaltung">Zur Verwaltung</button></div>` : ''}
    ${canEditTexts() ? `<div class="edit-bar"><button class="small ${S.editMode ? '' : 'secondary'}" data-act="edit-mode">${S.editMode ? 'Fertig mit Bearbeiten' : ic('edit') + ' Texte bearbeiten'}</button>${S.editMode ? `<span>Tippe auf einen umrandeten Text. Gilt ${session.isSuper ? 'für <b>alle Häuser</b>' : 'nur für <b>dieses Haus</b>'}.</span>` : ''}</div>` : ''}
    ${title ? `<h1>${title}</h1>` : ''}${lead ? `<p class="lead">${lead}</p>` : ''}`;
}

// ---------- Laden ----------
async function loadState() {
  S.st = await call('GET', '/state');
  if (S.st.me.super) S.st.me.name = txt('super_name');
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
    <p class="lead">${tx('login_lead')}</p>
    ${DEMO ? `<div class="card notice"><h3>Einfach ausprobieren</h3><p class="text">Im Demo-Modus kannst du dich als „Eric“ anmelden und alles anklicken.</p><div class="actions"><button data-act="demo-login">Demo starten</button></div><p class="hint">Oder neu registrieren mit dem Hauspasswort <b>demo123</b>.</p></div>` : ''}
    <div class="card">
      ${!house ? `
        <form data-form="house">
          <label for="f-slug">Haus-Kennung</label>
          <input id="f-slug" name="slug" type="text" autocapitalize="none" autocorrect="off" spellcheck="false" autocomplete="off" required placeholder="z. B. brandvorwerkstrasse-59" value="${esc(S.loginHouse?.missing ? S.loginHouse.slug : '')}">
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
            <input id="f-hp" name="housePassword" type="password" autocapitalize="none" autocorrect="off" spellcheck="false" required autocomplete="off">
            <p class="hint">Steht in der Nachricht, mit der du den Link bekommen hast.</p>` : ''}
          <label for="f-name">Dein Name im Haus</label>
          <input id="f-name" name="name" type="text" required minlength="2" maxlength="40" autocomplete="username" placeholder="z. B. Eric, Frau Schulz, Wohnung 4">
          ${join ? '<p class="hint">Muss nicht dein echter Name sein – Hauptsache, die anderen wissen, wer du bist.</p>' : ''}
          <label for="f-pw">${join ? 'Wähle ein Passwort' : 'Passwort'}</label>
          <input id="f-pw" name="password" type="password" autocapitalize="none" autocorrect="off" spellcheck="false" required minlength="6" autocomplete="${join ? 'new-password' : 'current-password'}">
          ${join ? `
            <p class="hint">Mindestens 6 Zeichen. Am besten aufschreiben – es gibt keine E-Mail zum Zurücksetzen.</p>
            <label for="f-pw2">Passwort wiederholen</label>
            <input id="f-pw2" name="password2" type="password" autocapitalize="none" autocorrect="off" spellcheck="false" required minlength="6" autocomplete="new-password">
            <label for="f-c">Wie erreicht man dich? <span class="opt">(freiwillig)</span></label>
            <input id="f-c" name="contact" type="text" maxlength="200" placeholder="z. B. 3. OG links – einfach klingeln">
            <p class="hint">Wird bei deinen Einträgen angezeigt. Keine Telefonnummer nötig.</p>` : ''}
          <div class="sheet-actions"><button>${join ? 'Zugang anlegen' : 'Anmelden'}</button></div>
          ${!join ? '<p class="hint">Passwort vergessen? Frag die Hausverwaltung der App – sie kann es zurücksetzen.</p>' : ''}
        </form>
        <p class="hint" style="margin-top:14px"><button class="link" data-act="other-house">Anderes Haus wählen</button></p>`}
    </div>
    <div class="small-links">
      <a class="link" href="#verwaltung-login">Verwaltung</a>
    </div>`;
}

function renderAdminLogin() {
  app.innerHTML = `${header('Verwaltung', 'Nur für die Person, die die App betreibt.')}
    <div class="card"><form data-form="admin-login">
      <label for="f-key">Admin-Schlüssel</label>
      <input id="f-key" name="key" type="password" autocapitalize="none" autocorrect="off" spellcheck="false" required autocomplete="current-password">
      ${DEMO ? '<p class="hint">Demo: <b>demo-admin-schluessel</b></p>' : ''}
      <div class="sheet-actions"><a class="btn secondary" href="#start">Zurück</a><button>Anmelden</button></div>
    </form></div>`;
}

// ---------- Startseite ----------
function allItems() {
  const out = [];
  for (const m of mods()) for (const it of S.st.data[m] || []) if (!expired(m, it)) out.push({ m, it });
  return out;
}

function renderStart() {
  const today = isoDay();
  const d = S.st.data;
  const mine = me();
  const notices = [];
  if (!session.pref('welcomed')) {
    notices.push(`<div class="card notice"><h3>${tx('welcome_title')}</h3><p class="text">${tx('welcome_text')}</p>
      <div class="actions"><a class="btn" href="#was">Was ist das hier?</a><button class="secondary" data-act="dismiss-welcome">Schon klar</button></div></div>`);
  }
  if (S.installEvt && !session.pref('install-dismissed')) {
    notices.push(`<div class="card notice"><h3>${ic('phone')} Als App aufs Handy</h3><p class="text">Allmende lässt sich wie eine App auf dem Startbildschirm ablegen.</p><div class="actions"><button data-act="install">Installieren</button><button class="secondary" data-act="dismiss-install">Später</button></div></div>`);
  }

  // Heute im Haus
  const todayBits = [];
  for (const a of d.away || []) {
    if (a.kind === 'da' && a.from === today) todayBits.push(`${ic('box')} <b>${esc(userName(a.by))}</b> ist heute da${a.text ? ` – ${esc(a.text)}` : ' und nimmt Pakete an'}`);
    if (a.kind === 'weg' && a.from <= today && (a.to || a.from) >= today) todayBits.push(`${ic('bag')} <b>${esc(userName(a.by))}</b> ist weg bis ${fmtDay(a.to || a.from)}`);
  }
  for (const e of d.events || []) if (e.date === today || (e.endDate && e.date <= today && e.endDate >= today)) todayBits.push(`${ic('cal')} Heute: <b>${esc(e.title)}</b>${e.time ? ` um ${e.time} Uhr` : ''}`);

  const upcoming = (d.events || []).filter((e) => e.date > today).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 3);

  // Neu seit letztem Besuch
  const fresh = S.prevSeen ? allItems().filter(({ it }) => it.by !== mine.id && new Date(it.at).getTime() > S.prevSeen).sort((a, b) => b.it.at.localeCompare(a.it.at)).slice(0, 6) : [];

  app.innerHTML = `
    ${header(`Hallo ${esc(mine.name)}!`, '')}
    <form class="search" data-form="search" role="search"><span class="search-ic">${ic('search')}</span><input type="search" name="q" placeholder="Suchen, z. B. „Bohrer“ oder „Leiter“" aria-label="Suchen" autocomplete="off"></form>
    <div id="search-results"></div>
    <div id="start-body">
      ${notices.join('')}
      ${lentBox()}
      ${todayBits.length ? `<h2 class="section-title">Heute im Haus</h2><div class="card today">${todayBits.map((b) => `<p>${b}</p>`).join('')}</div>` : ''}
      <h2 class="hero-q">${tx('start_q')}</h2>
      ${inventory()}
      ${fresh.length ? `<h2 class="section-title">Neu seit deinem letzten Besuch</h2>${fresh.map(({ m, it }) => miniCard(m, it)).join('')}` : ''}
      ${has('events') ? `<h2 class="section-title">${tx('start_cal')}</h2>${monthCal(true)}` : ''}
    </div>`;
}

// Verliehen & ausgeliehen – nur für die beteiligten Personen sichtbar
const sameName = (a, b) => !!a && !!b && a.trim().toLocaleLowerCase('de') === b.trim().toLocaleLowerCase('de');
function dueInfo(t) {
  if (!t.returnDate) return { txt: 'ohne Rückgabedatum', cls: '' };
  const diff = daysBetween(isoDay(), t.returnDate);
  if (diff < 0) return { txt: `sollte seit ${fmtDay(t.returnDate)} zurück sein`, cls: 'red', badge: diff === -1 ? 'seit gestern fällig' : `${-diff} Tage überfällig` };
  if (diff === 0) return { txt: 'kommt heute zurück', cls: 'lent', badge: 'heute' };
  if (diff === 1) return { txt: 'kommt morgen zurück', cls: 'lent', badge: 'morgen' };
  return { txt: `zurück bis ${fmtDay(t.returnDate)}`, cls: '' };
}
function lentBox() {
  const mine = me(); if (mine.super) return '';
  const things = S.st.data.things || [];
  const out = things.filter((t) => t.by === mine.id && t.status === 'verliehen').sort((a, b) => (a.returnDate || '9').localeCompare(b.returnDate || '9'));
  const borrowed = things.filter((t) => t.by !== mine.id && t.status === 'verliehen' && sameName(t.lentTo, mine.name));
  if (!out.length && !borrowed.length) return '';
  const row = (t, own) => {
    const due = dueInfo(t);
    return `<div class="lent-row${due.cls === 'red' ? ' late' : ''}">
      <div class="lent-txt"><b>${esc(t.title)}</b>${due.badge ? ` <span class="badge ${due.cls}">${due.badge}</span>` : ''}
        <div class="meta">${own ? (t.lentTo ? `verliehen an <b>${esc(t.lentTo)}</b> · ` : 'verliehen · ') : `von <b>${esc(userName(t.by))}</b> · `}${due.txt}</div></div>
      <div class="actions">${own
        ? `<button class="small" data-act="returned" data-id="${t.id}">Ist wieder da</button><button class="small secondary" data-act="extend" data-id="${t.id}">+ 1 Woche</button>`
        : `<button class="small secondary" data-act="contact" data-col="things" data-id="${t.id}">Kontakt</button>`}</div></div>`;
  };
  return `${out.length ? `<h2 class="section-title">Verliehen <span class="sub">nur für dich sichtbar</span></h2><div class="card lent-card">${out.map((t) => row(t, true)).join('')}</div>` : ''}
    ${borrowed.length ? `<h2 class="section-title">Bei dir ausgeliehen <span class="sub">nur für dich sichtbar</span></h2><div class="card lent-card">${borrowed.map((t) => row(t, false)).join('')}</div>` : ''}`;
}

// „Was haben wir alles im Haus?“ – die ersten Einträge je Rubrik, ein Klick führt zur Rubrik
const INV_MODS = ['things', 'skills', 'gifts', 'requests'];
function inventory() {
  const groups = INV_MODS.filter(has).map((m) => {
    const items = sortItems(m, S.st.data[m] || []);
    const max = 8;
    const chips = items.slice(0, max).map((it) => {
      const off = (m === 'things' && it.status === 'verliehen') || (m === 'gifts' && it.status === 'reserviert');
      return `<a class="chip${off ? ' off' : ''}" href="#${hrefFor(m)}" title="${off ? (m === 'things' ? 'gerade verliehen' : 'reserviert') : ''}">${esc(it.title)}</a>`;
    }).join('');
    return `<section class="inv">
      <a class="inv-head" href="#${hrefFor(m)}"><span class="inv-ic">${mic(m)}</span><b>${tx(`mod_${m}_name`)}</b><span class="count">${items.length}</span><span class="go">${ic('chevron')}</span></a>
      ${items.length ? `<div class="chips">${chips}${items.length > max ? `<a class="chip more" href="#${hrefFor(m)}">+ ${items.length - max} weitere</a>` : ''}</div>`
        : `<p class="inv-empty">Noch nichts eingetragen. <button class="link" data-act="new" data-col="${m}">${txt(`mod_${m}_add`)}</button></p>`}
    </section>`;
  }).join('');
  const rest = mods().filter((m) => !INV_MODS.includes(m) && m !== 'events');
  return `<div class="card inv-card">${groups}</div>
    ${rest.length ? `<div class="more-links" aria-label="${esc(txt('start_more'))}">${rest.map((m) => `<a href="#${hrefFor(m)}">${mic(m)}<span>${tx(`mod_${m}_name`)}</span></a>`).join('')}</div>` : ''}`;
}

// ---------- Großer Monatskalender ----------
const calMonth = () => { if (!S.calMonth) { const t = new Date(); S.calMonth = [t.getFullYear(), t.getMonth()]; } return S.calMonth; };
function eventsByDay() {
  const map = {};
  for (const e of S.st.data.events || []) {
    const end = e.endDate && e.endDate > e.date ? e.endDate : e.date;
    for (let d = parseDay(e.date), i = 0; isoDay(d) <= end && i < 62; d.setDate(d.getDate() + 1), i++) (map[isoDay(d)] ||= []).push(e);
  }
  for (const k in map) map[k].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  return map;
}
function monthCal(upcoming = S.calUpcoming ?? true) {
  S.calUpcoming = upcoming;
  const [y, m] = calMonth();
  const today = isoDay(), first = new Date(y, m, 1), offset = (first.getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
  const ev = eventsByDay();
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push('<div class="cd empty"></div>');
  for (let d = 1; d <= days; d++) {
    const iso = `${y}-${pad(m + 1)}-${pad(d)}`, list = ev[iso] || [];
    const wk = (offset + d - 1) % 7 >= 5;
    cells.push(`<button class="cd${iso === today ? ' today' : ''}${iso === S.calDay ? ' sel' : ''}${list.length ? ' has' : ''}${wk ? ' wk' : ''}${iso < today ? ' past' : ''}" data-act="cal-day" data-day="${iso}" aria-label="${fmtDay(iso, { weekday: 'long', day: 'numeric', month: 'long' })}${list.length ? `, ${list.length} Termin${list.length > 1 ? 'e' : ''}` : ''}">
      <span class="n">${d}</span>${list.slice(0, 2).map((e) => `<span class="ev">${esc(e.title)}</span>`).join('')}${list.length > 2 ? `<span class="ev more">+${list.length - 2}</span>` : ''}${list.length ? '<i class="dot"></i>' : ''}</button>`);
  }
  while (cells.length % 7) cells.push('<div class="cd empty"></div>');
  const monthName = first.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  const inMonth = (e) => (e.endDate || e.date) >= `${y}-${pad(m + 1)}-01` && e.date <= `${y}-${pad(m + 1)}-${pad(days)}`;
  const sel = S.calDay ? (ev[S.calDay] || []) : null;
  const below = sel
    ? `<h3 class="cal-sub">${fmtDay(S.calDay, { weekday: 'long', day: 'numeric', month: 'long' })}</h3>${sel.length ? sel.map((e) => card('events', e)).join('') : '<p class="cal-none">An diesem Tag ist nichts eingetragen.</p>'}`
    : !upcoming ? '' : (() => { const l = (S.st.data.events || []).filter((e) => inMonth(e) && (e.endDate || e.date) >= today).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''))); return l.length ? `<h3 class="cal-sub">Demnächst im ${first.toLocaleDateString('de-DE', { month: 'long' })}</h3>${l.slice(0, 4).map((e) => card('events', e)).join('')}` : ''; })();
  return `<div id="cal"><div class="card cal">
      <div class="cal-top"><button class="icon-btn" data-act="cal-nav" data-dir="-1" aria-label="Voriger Monat">${ic('left')}</button>
        <b>${monthName}</b>
        <button class="icon-btn" data-act="cal-nav" data-dir="1" aria-label="Nächster Monat">${ic('chevron')}</button></div>
      <div class="cal-grid"><span class="wd">Mo</span><span class="wd">Di</span><span class="wd">Mi</span><span class="wd">Do</span><span class="wd">Fr</span><span class="wd wk">Sa</span><span class="wd wk">So</span>${cells.join('')}</div>
      <div class="cal-foot"><button class="small secondary" data-act="cal-nav" data-dir="0">Heute</button>${me().super ? '' : `<button class="small" data-act="new" data-col="events"${S.calDay ? ` data-date="${S.calDay}"` : ''}>${ic('plus')} Termin${S.calDay ? ` am ${fmtDay(S.calDay, { day: 'numeric', month: 'numeric' })}` : ''}</button>`}</div>
    </div>${below}</div>`;
}
function redrawCal() { const el = $('#cal'); if (el) el.outerHTML = monthCal(); }

function hrefFor(m) {
  if (SHARE_TABS.includes(m)) return 'teilen/' + m;
  if (m === 'events') return 'kalender';
  if (m === 'gifts') return 'verschenken';
  return 'm/' + m;
}

function miniCard(m, it) {
  const label = it.title || it.text || (m === 'away' ? (it.kind === 'weg' ? 'ist weg' : 'ist da') : '');
  return `<a class="card" href="#${hrefFor(m)}" style="display:block;text-decoration:none;color:inherit">
    <div class="title-row"><h3>${mic(m)} ${esc(label).slice(0, 90)}</h3><span class="badge new">neu</span></div>
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
    : `<div class="empty">Nichts gefunden für „${esc(q)}“.<br>${has('requests') ? `<br><button data-act="new" data-col="requests" data-title="${esc(q)}">Im Haus danach fragen</button>` : ''}</div>`;
}

// ---------- Listen ----------
function sortItems(col, items) {
  const today = isoDay();
  let list = items.filter((it) => !expired(col, it));
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
  const old = all.filter((it) => expired(col, it) && it.by === me().id).sort((a, b) => (b.up || b.at).localeCompare(a.up || a.at));
  const tabs = withTabs ? `<div class="seg">${SHARE_TABS.filter(has).map((m) => `<a href="#teilen/${m}" ${m === col ? 'aria-current="page"' : ''}>${mic(m)} ${MOD[m].short}</a>`).join('')}</div>` : '';
  const intro = tx(`intro_${col}`);
  app.innerHTML = `
    ${header(withTabs ? 'Teilen' : `${mic(col)} ${tx(`mod_${col}_name`)}`, withTabs ? '' : intro)}
    ${tabs}${withTabs ? `<p class="lead">${intro}</p>` : ''}
    ${col === 'events' ? monthCal(false) + '<h2 class="section-title">Alle kommenden Termine</h2>' : ''}
    ${items.length ? items.map((it) => card(col, it)).join('') : `<div class="empty">${tx('empty_list')}</div>`}
    ${past ? `<p class="empty" style="padding:8px">${past} vergangene Einträge werden ausgeblendet.</p>` : ''}
    ${old.length ? `<h2 class="section-title">Abgelaufen <span class="sub">nur für dich sichtbar</span></h2>${old.map((it) => `<article class="card expired"><h3>${esc(it.title)}</h3><div class="meta">eingetragen ${ago(it.at)} · für die anderen nicht mehr sichtbar</div>
      <div class="actions"><button class="small" data-act="renew" data-col="${col}" data-id="${it.id}">Noch eine Woche zeigen</button><button class="small ghost" data-act="del" data-col="${col}" data-id="${it.id}">Löschen</button></div></article>`).join('')}` : ''}
    ${me().super ? `<p class="empty" style="padding:8px">Zum Eintragen bitte mit deinem Haus-Zugang anmelden.</p>` : `<button class="fab" data-act="new" data-col="${col}">${ic('plus')} ${tx(`mod_${col}_add`)}</button>`}`;
}

function ownerActions(col, it) {
  if (!canEdit(it)) return '';
  let extra = '';
  const own = it.by === me().id;
  if (!own) { /* Verwaltung: nur Bearbeiten/Löschen */ }
  else if (col === 'things') extra = it.status === 'verliehen'
    ? `<button class="small secondary" data-act="returned" data-id="${it.id}">Ist zurück</button>`
    : `<button class="small secondary" data-act="lend" data-id="${it.id}">Verliehen</button>`;
  else if (col === 'gifts') extra = `<button class="small secondary" data-act="reserve" data-id="${it.id}">${it.status === 'reserviert' ? 'Wieder frei' : 'Reserviert'}</button>`;
  else if (col === 'polls' && !it.closed) extra = `<button class="small secondary" data-act="close-poll" data-id="${it.id}">Beenden</button>`;
  return `${extra}<button class="small ghost" data-act="edit" data-col="${col}" data-id="${it.id}">Bearbeiten</button>
    <button class="small ghost" data-act="del" data-col="${col}" data-id="${it.id}">Löschen</button>`;
}

function contactBtn(col, it, label = 'Kontakt') {
  if (it.by === me().id) return '';
  return `<button class="small" data-act="contact" data-col="${col}" data-id="${it.id}">${label}</button>`;
}

const expLeft = (col, it) => { const n = daysLeft(col, it); return n <= 1 ? 'nur noch heute sichtbar' : `noch ${n} Tage sichtbar`; };
function card(col, it, showModule) {
  const isNew = S.prevSeen && it.by !== me().id && new Date(it.at).getTime() > S.prevSeen;
  const by = `von ${esc(userName(it.by))}`;
  const photo = it.photo ? `<img class="photo" loading="lazy" alt="" src="${esc(imgSrc(it.photo))}">` : '';
  const modLabel = showModule ? `<span>${mic(col)} ${MOD[col].short} · </span>` : '';
  const newB = isNew ? ' <span class="badge new">neu</span>' : '';
  const today = isoDay();
  switch (col) {
    case 'things': {
      const lent = it.status === 'verliehen';
      return `<article class="card"><div class="title-row"><h3>${esc(it.title)}${newB}</h3>
        <span class="badge ${lent ? 'lent' : ''}">${lent ? (it.returnDate ? 'verliehen bis ' + fmtDay(it.returnDate, { day: 'numeric', month: 'short' }) : 'verliehen') : 'verfügbar'}</span></div>
        ${photo}${it.text ? `<p class="text">${esc(it.text)}</p>` : ''}
        <div class="meta">${modLabel}${it.category ? esc(it.category) + ' · ' : ''}${by}${lent && it.lentTo && canEdit(it) ? ` · bei ${esc(it.lentTo)}` : ''}</div>
        <div class="actions">${contactBtn(col, it, 'Ausleihen fragen')}${ownerActions(col, it)}</div></article>`;
    }
    case 'skills': case 'requests':
      return `<article class="card"><h3>${esc(it.title)}${newB}</h3>${it.text ? `<p class="text">${esc(it.text)}</p>` : ''}
        <div class="meta">${modLabel}${by} · ${ago(it.at)}${it.by === me().id && EXPIRE_DAYS[col] ? ` · ${expLeft(col, it)}` : ''}</div>
        <div class="actions">${contactBtn(col, it, col === 'requests' ? 'Ich kann helfen' : 'Kontakt')}${ownerActions(col, it)}</div></article>`;
    case 'gifts':
      return `<article class="card"><div class="title-row"><h3>${esc(it.title)}${newB}</h3>
        ${it.status === 'reserviert' ? '<span class="badge lent">reserviert</span>' : '<span class="badge">zu verschenken</span>'}</div>
        ${photo}${it.text ? `<p class="text">${esc(it.text)}</p>` : ''}
        <div class="meta">${modLabel}${by} · ${ago(it.at)}${it.by === me().id ? ` · ${expLeft(col, it)}` : ''}</div>
        <div class="actions">${contactBtn(col, it, 'Hätte ich gern')}${ownerActions(col, it)}</div></article>`;
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
      return `<article class="card"><h3>${ic(weg ? 'bag' : 'box')} ${esc(userName(it.by))} ist ${weg ? 'weg' : 'da'}${newB}</h3>
        <div class="meta">${when}</div>${it.text ? `<p class="text">${esc(it.text)}</p>` : ''}
        <div class="actions">${contactBtn(col, it, weg ? 'Ich helfe' : 'Kontakt')}${ownerActions(col, it)}</div></article>`;
    }
    case 'defects': {
      const n = (it.affected || []).length;
      const mineAff = (it.affected || []).includes(me().id);
      const st = it.status || 'offen';
      const days = it.since ? daysBetween(it.since, today) : null;
      return `<article class="card"><div class="title-row"><h3>${esc(it.title)}${newB}</h3>
        <span class="badge ${st === 'behoben' ? '' : st === 'gemeldet' ? 'lent' : 'red'}">${DEFECT_SHORT[st]}</span></div>
        ${photo}<div class="meta">${it.place ? ic('pin', 'sm') + ' ' + esc(it.place) + ' · ' : ''}${days !== null && st !== 'behoben' ? `seit ${days} Tagen` : 'gemeldet ' + ago(it.at)}</div>
        ${it.text ? `<p class="text">${esc(it.text)}</p>` : ''}
        <div class="meta">${modLabel}${by} · betrifft ${n} ${n === 1 ? 'Haushalt' : 'Haushalte'}</div>
        <div class="actions">${st !== 'behoben' && !me().super ? `<button class="small ${mineAff ? 'secondary' : ''}" data-act="affect" data-id="${it.id}">${mineAff ? '✓ Betrifft mich' : 'Betrifft mich auch'}</button>` : ''}${ownerActions(col, it)}</div></article>`;
    }
    case 'info':
      return `<article class="card"><h3>${esc(it.title)}${newB}</h3>${it.text ? `<p class="text">${esc(it.text)}</p>` : ''}
        <div class="meta">${modLabel}eingetragen ${by} · zuletzt geändert ${ago(it.up || it.at)}</div><div class="actions">${ownerActions(col, it)}</div></article>`;
    case 'rides':
      return `<article class="card"><h3>${esc(it.title)}${newB}</h3><div class="meta">${fmtDay(it.date)}${it.time ? ', ' + it.time + ' Uhr' : ''} · ${by}</div>
        ${it.text ? `<p class="text">${esc(it.text)}</p>` : ''}<div class="actions">${contactBtn(col, it, 'Bring mir was mit')}${ownerActions(col, it)}</div></article>`;
    case 'polls': {
      const votes = Object.values(it.votes || {});
      const myVote = (it.votes || {})[me().id];
      const total = votes.length;
      return `<article class="card"><div class="title-row"><h3>${esc(it.title)}${newB}</h3>${it.closed ? '<span class="badge grey">beendet</span>' : ''}</div>
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
      return `<article class="card soft"><h3>${it.to ? 'Danke an ' + esc(it.to) : 'Danke!'}${newB}</h3><p class="text">${esc(it.text)}</p>
        <div class="meta">${by} · ${ago(it.at)}</div><div class="actions">${ownerActions(col, it)}</div></article>`;
  }
  return '';
}

// ---------- Menü & Seiten ----------
function renderMenu() {
  const extra = MENU_MODS.filter(has);
  app.innerHTML = `
    ${header('Mehr', '')}
    ${extra.length ? `<div class="card list-menu">${extra.map((m) => `<a href="#m/${m}"><span class="ic">${mic(m)}</span><span>${tx(`mod_${m}_name`)}<br><small style="font-weight:400;color:var(--ink-soft)">${tx(`mod_${m}_desc`)}</small></span></a>`).join('')}</div>` : ''}
    <div class="card list-menu">
      <a href="#profil"><span class="ic">${ic('user')}</span>Mein Profil</a>
      <a href="#was"><span class="ic">${ic('home')}</span>Was ist das hier?</a>
      <a href="#wie"><span class="ic">${ic('help')}</span>Wie funktioniert das?</a>
      <a href="#feedback"><span class="ic">${ic('mail')}</span>Fehler melden & Feedback</a>
      ${me().admin ? `<a href="#verwaltung"><span class="ic">${ic('key')}</span>Verwaltung</a>` : ''}
      <button data-act="logout"><span class="ic">${ic('logout')}</span>Abmelden</button>
    </div>`;
}

function installHelp() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (matchMedia('(display-mode: standalone)').matches) return '<p class="text">Allmende ist bereits als App installiert.</p>';
  return `${S.installEvt ? `<div class="actions"><button data-act="install">${ic('phone')} Jetzt installieren</button></div>` : ''}
    <p class="text">${ios ? 'iPhone/iPad: Unten auf das Teilen-Symbol (Quadrat mit Pfeil) tippen → „Zum Home-Bildschirm“.' : 'Android: Im Browser-Menü (⋮) auf „App installieren“ oder „Zum Startbildschirm hinzufügen“ tippen.'}</p>`;
}

function renderProfile() {
  const m = me();
  if (m.super) {
    app.innerHTML = `${header('Mein Profil', '')}
      <div class="card"><form data-form="super-name">
        <label for="p-sn">Dein Name als Gesamtverwaltung</label>
        <input id="p-sn" name="name" type="text" maxlength="40" value="${esc(m.name)}">
        <p class="hint">Wird nur dir angezeigt. Zum Eintragen und für deinen Namen im Haus nutze deinen Haus-Zugang.</p>
        <div class="sheet-actions"><button>Speichern</button></div>
      </form></div>
      <div class="card"><h2>Schriftgröße</h2>
        <div class="actions"><button class="${document.documentElement.classList.contains('big') ? 'secondary' : ''}" data-act="font" data-big="0">Normal</button>
        <button class="${document.documentElement.classList.contains('big') ? '' : 'secondary'}" data-act="font" data-big="1" style="font-size:1.15rem">Größer</button></div></div>`;
    return;
  }
  app.innerHTML = `
    ${header('Mein Profil', '')}
    <div class="card"><form data-form="profile">
      <label for="p-n0">Dein Name im Haus</label>
      <input id="p-n0" name="name" type="text" required minlength="2" maxlength="40" value="${esc(m.name)}">
      <p class="hint">So sehen dich die anderen. Damit meldest du dich auch an.</p>
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
      <label for="p-o">Bisheriges Passwort</label><input id="p-o" name="oldPassword" type="password" autocapitalize="none" autocorrect="off" spellcheck="false" required autocomplete="current-password">
      <label for="p-n">Neues Passwort</label><input id="p-n" name="password" type="password" autocapitalize="none" autocorrect="off" spellcheck="false" required minlength="6" autocomplete="new-password">
      <div class="sheet-actions"><button class="secondary">Passwort ändern</button></div>
    </form></div>
    <div class="card"><h2>Zugang löschen</h2><p class="text">Löscht deinen Zugang und alle deine Einträge. Das lässt sich nicht rückgängig machen.</p>
      <div class="actions"><button class="danger" data-act="delete-me">Zugang löschen</button></div></div>`;
}

function renderWhat() {
  app.innerHTML = `
    ${header(tx('was_title'), '')}
    <div class="card prose">${tx('was_intro', { block: 1 })}</div>
    <h2 class="section-title">${tx('was_safety_title')}</h2>
    <div class="card prose">${tx('was_safety', { block: 1, list: 'safe-list' })}${tx('was_tech', { block: 1, cls: 'hint' })}</div>
    <h2 class="section-title">${tx('was_who_title')}</h2>
    <div class="card prose">${tx('was_who', { block: 1 })}
      ${S.st ? `<div class="actions"><a class="btn" href="#feedback">${ic('mail')} Feedback senden</a></div>` : ''}
    </div>
    ${!S.st ? '<div class="small-links"><a class="link" href="#start">← Zur Anmeldung</a><a class="link" href="#wie">Wie funktioniert das?</a></div>' : ''}`;
}

function renderHow() {
  const list = (S.st ? mods() : ALL_MODULES.filter((m) => !['rides', 'polls', 'thanks'].includes(m)));
  app.innerHTML = `
    ${header(tx('wie_title'), '')}
    <div class="card prose">${tx('wie_steps', { block: 1 })}</div>
    <h2 class="section-title">${tx('wie_areas_title')}</h2>
    <div class="card list-menu">${list.map((m) => `<div style="display:flex;gap:14px;padding:10px 4px;border-bottom:1px solid var(--line)"><span class="ic" style="font-size:1.4rem">${mic(m)}</span><span><b>${tx(`mod_${m}_name`)}</b><br><small style="color:var(--ink-soft)">${tx(`mod_${m}_desc`)}</small></span></div>`).join('')}</div>
    ${!S.st ? '<div class="small-links"><a class="link" href="#start">← Zur Anmeldung</a><a class="link" href="#was">Was ist das hier?</a></div>' : ''}`;
}

function renderFeedback() {
  app.innerHTML = `
    ${header(tx('feedback_title'), tx('feedback_lead'))}
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
      ${houses.map((h) => `<div class="card"><div class="title-row"><h3>${ic('home')} ${esc(h.name)}</h3><button class="small" data-act="pick-house" data-slug="${esc(h.slug)}">Verwalten</button></div><div class="meta">Kennung: ${esc(h.slug)} · seit ${ago(h.at)}</div></div>`).join('') || '<div class="empty">Noch kein Haus angelegt.</div>'}
      <div class="card"><form data-form="new-house"><h2>Neues Haus anlegen</h2>
        <label for="h-n">Name</label><input id="h-n" name="name" type="text" required placeholder="z. B. Brandvorwerkstraße 59">
        <label for="h-p">Hauspasswort</label><input id="h-p" name="housePassword" type="text" autocapitalize="none" autocorrect="off" spellcheck="false" required minlength="6" autocomplete="off">
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
    <div class="card"><h2>${ic('mail')} Einladen</h2>
      <p class="text">Diesen Link zusammen mit dem Hauspasswort in die Hausgruppe schicken:</p>
      <div class="share-box">${esc(link)}</div>
      <div class="actions"><button class="small" data-act="copy" data-text="${esc(link)}">Link kopieren</button>
      <button class="small secondary" data-act="copy" data-text="${esc(`Hallo zusammen! Für unser Haus gibt es jetzt die Allmende – eine kleine App, um Werkzeug, Hilfe und Termine zu teilen. Kostenlos, ohne Werbung, ohne Datensammeln.\n\nLink: ${link}\nHauspasswort: (bitte einsetzen)\n\nEinfach öffnen, „Ich bin neu hier“ wählen und loslegen.`)}">Einladungstext kopieren</button></div>
    </div>
    <div class="card"><form data-form="house-settings"><h2>${ic('gear')} Haus-Einstellungen</h2>
      <label for="hs-n">Name des Hauses</label><input id="hs-n" name="name" type="text" value="${esc(h.name)}">
      <label for="hs-p">Neues Hauspasswort <span class="opt">(leer = bleibt gleich)</span></label><input id="hs-p" name="housePassword" type="text" autocapitalize="none" autocorrect="off" spellcheck="false" minlength="6" autocomplete="off">
      <p class="hint">Wer schon einen Zugang hat, bleibt angemeldet. Das Hauspasswort braucht man nur zum Registrieren.</p>
      <label>Bereiche in diesem Haus</label>
      ${ALL_MODULES.map((m) => `<label class="check"><input type="checkbox" name="mod-${m}" ${h.modules.includes(m) ? 'checked' : ''}> ${mic(m)} ${MOD[m].name}</label>`).join('')}
      <div class="sheet-actions"><button>Speichern</button></div></form></div>
    <div class="card"><h2>${ic('users')} Personen (${S.st.users.length})</h2>
      ${S.st.users.map((u) => `<div style="padding:10px 0;border-bottom:1px solid var(--line)">
        <b>${esc(u.name)}</b> ${u.admin ? '<span class="badge">Verwaltung</span>' : ''}<div class="meta">dabei seit ${ago(u.at)}${u.contact ? ' · ' + esc(u.contact) : ''}</div>
        <div class="actions"><button class="small secondary" data-act="reset-pw" data-id="${u.id}" data-name="${esc(u.name)}">Passwort zurücksetzen</button>
        ${sup ? `<button class="small secondary" data-act="toggle-admin" data-id="${u.id}" data-admin="${u.admin ? '0' : '1'}">${u.admin ? 'Verwaltung entziehen' : 'Zur Verwaltung machen'}</button>` : ''}
        ${u.id !== me().id ? `<button class="small danger" data-act="remove-user" data-id="${u.id}" data-name="${esc(u.name)}">Entfernen</button>` : ''}</div></div>`).join('') || '<p class="text">Noch niemand registriert.</p>'}
    </div>
    <div class="card"><h2>${ic('mail')} Feedback (${feedback.length})</h2>
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
  openSheet(`${sheetHead(item ? 'Bearbeiten' : esc(txt(`mod_${col}_add`)))}
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
function openTextEditor(k) {
  const isSuper = session.isSuper;
  const layer = isSuper ? TEXT_LAYERS.global : TEXT_LAYERS.house;
  const changed = k in (layer || {});
  const multi = /\n/.test(D[k] || '') || (D[k] || '').length > 90;
  openSheet(`${sheetHead('Text bearbeiten')}
    <form data-form="text" data-key="${k}">
      <p class="hint">Gilt ${isSuper ? 'für <b>alle Häuser</b> (Gesamtverwaltung)' : 'nur für <b>dieses Haus</b>'}.${changed ? ' Dieser Text wurde schon angepasst.' : ''}</p>
      ${multi ? `<textarea name="value" style="min-height:260px">${esc(raw(k))}</textarea>` : `<input type="text" name="value" value="${esc(raw(k))}">`}
      <p class="hint">Leerzeile = neuer Absatz · <b>**fett**</b> · <i>*kursiv*</i> · Zeilen mit „- “ = Liste · „1. “ = Schritte · <code>{verwaltung}</code> = ${esc(MAINTAINER)}</p>
      <div class="err" hidden></div>
      <div class="sheet-actions">
        ${changed ? `<button type="button" class="ghost" data-act="text-reset" data-key="${k}">Original wiederherstellen</button>` : ''}
        <button type="button" class="secondary" data-act="close">Abbrechen</button><button>Speichern</button>
      </div>
    </form>`);
}

const actions = {
  close: () => closeSheet(),
  'edit-mode': () => { S.editMode = !S.editMode; document.body.classList.toggle('edit-mode', S.editMode); render(); },
  'text-reset': async (d) => { try { await call('PUT', '/admin/texts', { key: d.key, value: null }); await loadTexts(); closeSheet(); toast('Original wiederhergestellt'); render(); } catch (e) { handleErr(e); } },
  goto: (d) => go(d.h),
  'login-mode': (d) => { S.loginMode = d.mode; renderLogin(); },
  'other-house': () => { session.slug = ''; S.loginHouse = null; S.forceNoHouse = true; history.replaceState(null, '', location.pathname + (location.search.includes('demo') ? '?demo' : '') + '#start'); renderLogin(); },
  'reload-page': () => location.reload(),
  'switch-to-house': () => { const slug = session.slug; session.clear(); session.slug = slug; S.st = null; S.loginHouse = null; S.loginMode = 'login'; go('start'); },
  'demo-login': async () => { try { const r = await call('POST', '/login', { slug: 'demo', name: 'Eric', password: 'demo123' }); await afterLogin(r.token, 'demo'); } catch (e) { toast(e.message); } },
  'reset-demo': () => { resetDemo(); location.reload(); },
  'dismiss-welcome': () => { session.pref('welcomed', '1'); renderStart(); },
  'dismiss-install': () => { session.pref('install-dismissed', '1'); renderStart(); },
  install: async () => { if (!S.installEvt) return; S.installEvt.prompt(); await S.installEvt.userChoice.catch(() => {}); S.installEvt = null; render(); },
  logout: () => { const wasSuper = session.isSuper; session.clear(); if (wasSuper) session.slug = ''; S.st = null; S.loginHouse = null; go('start'); },
  font: (d) => { document.documentElement.classList.toggle('big', d.big === '1'); session.pref('big', d.big === '1' ? '1' : null); renderProfile(); },
  new: (d) => openForm(d.col, null, d.title ? { title: d.title } : d.date ? { date: d.date } : {}),
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
    openSheet(`${sheetHead('Kontakt')}<p class="text">${esc(it.title || '')}</p>
      <p class="text">Von <b>${esc(userName(it.by))}</b>:</p>
      <div class="contact-big">${c ? esc(c) : 'Kein Kontakthinweis eingetragen.\nFrag am besten in der Hausgruppe nach ' + esc(userName(it.by)) + '.'}</div>
      <p class="hint">Den Rest klärt ihr direkt miteinander.</p>
      <div class="sheet-actions"><button data-act="close">Alles klar</button></div>`);
  },
  lend: (d) => {
    const it = findItem('things', d.id);
    const def = new Date(); def.setDate(def.getDate() + 7);
    openSheet(`${sheetHead('Verliehen')}<form data-form="lend" data-id="${d.id}"><p class="text">${esc(it.title)}</p>
      <label for="l-to">An wen? <span class="opt">(freiwillig, sehen nur du, diese Person und die Verwaltung)</span></label><input id="l-to" name="lentTo" type="text" maxlength="80" list="userlist">
      <p class="hint">Wählst du einen Namen aus dem Haus, sieht die Person es auf ihrer Startseite unter „Bei dir ausgeliehen“.</p>
      <datalist id="userlist">${S.st.users.filter((u) => u.id !== me().id).map((u) => `<option value="${esc(u.name)}">`).join('')}</datalist>
      <label for="l-d">Zurück bis</label><input id="l-d" name="returnDate" type="date" value="${isoDay(def)}">
      <div class="sheet-actions"><button type="button" class="secondary" data-act="close">Abbrechen</button><button>Speichern</button></div></form>`);
  },
  extend: async (d) => {
    const it = findItem('things', d.id); if (!it) return;
    const base = it.returnDate && it.returnDate > isoDay() ? parseDay(it.returnDate) : new Date();
    base.setDate(base.getDate() + 7);
    try { await call('PUT', `/items/things/${d.id}`, { returnDate: isoDay(base) }); toast(`Verlängert bis ${fmtDay(isoDay(base))}`); await reload(); } catch (e) { handleErr(e); }
  },
  returned: async (d) => { try { await call('PUT', `/items/things/${d.id}`, { status: 'frei', lentTo: '', returnDate: '' }); toast('Schön, dass es zurück ist!'); await reload(); } catch (e) { handleErr(e); } },
  reserve: async (d) => { const it = findItem('gifts', d.id); try { await call('PUT', `/items/gifts/${d.id}`, { status: it.status === 'reserviert' ? '' : 'reserviert' }); await reload(); } catch (e) { handleErr(e); } },
  affect: async (d) => { try { await call('POST', `/items/defects/${d.id}/affect`); await reload(); } catch (e) { handleErr(e); } },
  vote: async (d) => {
    const it = findItem('polls', d.id); const opt = Number(d.opt);
    try { await call('POST', `/items/polls/${d.id}/vote`, { option: it.votes?.[me().id] === opt ? null : opt }); await reload(); } catch (e) { handleErr(e); }
  },
  renew: async (d) => { const it = findItem(d.col, d.id); if (!it) return; try { await call('PUT', `/items/${d.col}/${d.id}`, { title: it.title }); toast('Wird wieder eine Woche angezeigt.'); await reload(); } catch (e) { handleErr(e); } },
  'cal-nav': (d) => { const [y, m] = calMonth(); const t = d.dir === '0' ? new Date() : new Date(y, m + Number(d.dir), 1); S.calMonth = [t.getFullYear(), t.getMonth()]; S.calDay = d.dir === '0' ? isoDay() : null; redrawCal(); },
  'cal-day': (d) => { S.calDay = S.calDay === d.day ? null : d.day; redrawCal(); },
  'close-poll': async (d) => { try { await call('PUT', `/items/polls/${d.id}`, { closed: true }); toast('Umfrage beendet'); await reload(); } catch (e) { handleErr(e); } },
  'delete-me': () => openSheet(`${sheetHead('Zugang löschen?')}<p class="text">Dein Zugang und <b>alle deine Einträge</b> werden gelöscht. Das lässt sich nicht rückgängig machen.</p>
    <div class="sheet-actions"><button class="secondary" data-act="close">Abbrechen</button><button class="danger" data-act="delete-me-yes">Endgültig löschen</button></div>`),
  'delete-me-yes': async () => { try { await call('DELETE', '/me'); closeSheet(); session.clear(); S.st = null; toast('Dein Zugang wurde gelöscht.'); go('start'); } catch (e) { handleErr(e); } },
  copy: async (d) => { try { await navigator.clipboard.writeText(d.text); toast('Kopiert!'); } catch { toast('Kopieren nicht möglich – bitte markieren und kopieren.'); } },
  'pick-house': async (d) => { session.slug = d.slug; S.st = null; await loadTexts(); if (d.slug) { try { await loadState(); } catch (e) { return handleErr(e); } } renderNav(); renderAdmin(); },
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
  if (!S.editMode) return;
  const t = e.target.closest('[data-text]');
  if (!t || t.closest('#sheet')) return;
  e.preventDefault(); e.stopPropagation();
  openTextEditor(t.dataset.text);
}, true);

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
  await loadTexts();
  if (isSuper) { S.st = null; go('verwaltung'); return; }
  await loadState();
  S.prevSeen = Number(session.pref('seen:' + slug)) || 0;
  go('start');
}

const forms = {
  text: async (fd, form) => {
    await call('PUT', '/admin/texts', { key: form.dataset.key, value: String(fd.get('value') || '') });
    await loadTexts(); closeSheet(); toast('Text gespeichert'); render();
  },
  house: async (fd) => { S.loginHouse = null; S.forceNoHouse = false; const slug = fd.get('slug').trim().toLowerCase(); history.replaceState(null, '', location.pathname + '?haus=' + encodeURIComponent(slug) + (DEMO ? '&demo' : '')); await renderLogin(); },
  join: async (fd) => {
    if (fd.get('password') !== fd.get('password2')) throw new Error('Die beiden Passwörter sind nicht gleich.');
    const slug = S.loginHouse.slug;
    const r = await call('POST', '/join', { slug, housePassword: fd.get('housePassword'), name: fd.get('name'), password: fd.get('password'), contact: fd.get('contact') });
    session.pref('seen:' + slug, String(Date.now()));
    await afterLogin(r.token, slug);
    toast('Willkommen in der Allmende!');
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
  profile: async (fd) => { const r = await call('PUT', '/me', { name: fd.get('name'), contact: fd.get('contact') }); S.st.me = r.me; toast('Gespeichert'); await reload(); },
  'super-name': async (fd) => { await call('PUT', '/admin/texts', { key: 'super_name', value: String(fd.get('name') || '').trim() || null }); await loadTexts(); await loadState(); toast('Gespeichert'); renderProfile(); },
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
  await loadTexts();
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
