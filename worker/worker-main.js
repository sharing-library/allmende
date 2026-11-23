
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
