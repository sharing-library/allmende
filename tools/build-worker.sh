#!/bin/sh
# Baut worker/worker.js aus core.js + worker/worker-main.js
cd "$(dirname "$0")/.."
{
  echo "// Allmende – teilgut · Cloudflare Worker"
  echo "// Diese Datei komplett bei Cloudflare unter „Edit code“ einfügen."
  echo "// Automatisch erzeugt aus core.js und worker/worker-main.js – bitte dort ändern."
  echo
  sed -e 's/^export //' core.js
  cat worker/worker-main.js
} > worker/worker.js
echo "worker/worker.js gebaut ($(wc -c < worker/worker.js) Bytes)"
