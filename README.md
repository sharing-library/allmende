# Allmende – teilgut

Eine kleine, kostenlose App für Hausgemeinschaften: Dinge verleihen, Fähigkeiten anbieten, Termine im Haus, Verschenkekiste, „Ich suche …“, „Bin weg / Bin da“, Mängel im Haus, Hausinfo – optional auch Fahrten, Umfragen und eine Danke-Wand.

Keine Werbung, kein Tracking, keine Cookies, keine Schriften oder Skripte von fremden Servern. Installierbar als App auf dem Handy (PWA).

**App:** https://sharing-library.github.io/allmende/
**Demo (ohne echte Daten):** https://sharing-library.github.io/allmende/?demo

## Aufbau

```
Handy/Browser  ──►  GitHub Pages (dieses Repo, öffentlich: nur die App, keine Daten)
      │
      └─────────►  Cloudflare Worker „allmende-api“  (prüft Logins und Rechte, hält den GitHub-Schlüssel)
                          │
                          ├──► allmende-data   (privat: alle Einträge, Passwörter nur als Hash)
                          └──► allmende-backup (privat: tägliche Sicherung unter mirror/)
```

| Datei | Zweck |
|---|---|
| `index.html`, `styles.css`, `app.js` | Oberfläche |
| `api.js` | Verbindung zum Worker – oder Demo-Modus im Browser |
| `core.js` | Alle Regeln (wer darf was). Wird auch in den Worker eingebaut. |
| `config.js` | **Hier die Worker-Adresse eintragen** (`API_URL`) |
| `sw.js`, `manifest.webmanifest`, `icons/` | App-Installation & Offline-Start |
| `worker/worker.js` | Fertige Datei zum Einfügen bei Cloudflare |
| `worker/worker-main.js` | Worker-Teil (GitHub-Speicher, Backup) |
| `tools/` | Tests, Icon-Erzeugung, Worker-Bauskript |

## Einrichtung (einmalig)

1. **GitHub-Token** (Account sharing-library): Settings → Developer settings → Personal access tokens → Fine-grained → nur `allmende-data` + `allmende-backup`, Permission *Contents: Read and write*.
2. **Cloudflare**: Workers & Pages → Create Worker `allmende-api` → Edit code → Inhalt von `worker/worker.js` einfügen → Deploy.
3. Settings → Variables and Secrets → drei **Secrets**: `GITHUB_TOKEN`, `ADMIN_KEY` (eigenes langes Admin-Passwort), `SESSION_SECRET` (lange Zufallszeichenkette).
4. Settings → Trigger Events → Cron `0 3 * * *` (tägliches Backup).
5. Worker-Adresse in `config.js` bei `API_URL` eintragen und committen.
6. Repo `allmende` → Settings → Pages → Deploy from branch → `main` / root.
7. App öffnen → unten „Verwaltung“ → mit `ADMIN_KEY` anmelden → Haus anlegen → Link + Hauspasswort in die Hausgruppe.

Damit du selbst Admin im Haus bist: mit deinem normalen Haus-Zugang registrieren, dann in der Gesamtverwaltung bei deinem Namen „Zur Verwaltung machen“.

## Änderungen am Worker

`core.js` oder `worker/worker-main.js` ändern → `sh tools/build-worker.sh` → neue `worker/worker.js` bei Cloudflare einfügen → Deploy.

Tests: `node tools/test-core.mjs` und `node tools/test-worker.mjs`

Nach Änderungen an der App die `VERSION` in `sw.js` hochzählen, damit Handys die neue Version laden.

## Grenzen (kostenlose Stufen)

- Cloudflare Workers: 100.000 Anfragen pro Tag – reicht für viele Häuser.
- GitHub API: 5.000 Anfragen pro Stunde – reicht locker.
- Fotos werden in der App verkleinert (max. ca. 600 KB).
- Pro Backup-Lauf werden bis zu 20 geänderte Dateien gesichert, der Rest beim nächsten Lauf.

## Rechtliches

© Eric. Alle Rechte vorbehalten. Der Code ist einsehbar, aber (noch) nicht unter einer Open-Source-Lizenz freigegeben.
