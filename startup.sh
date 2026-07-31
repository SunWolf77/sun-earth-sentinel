#!/bin/sh
set -eu
cd /workspace
if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  exit 0
fi
if [ -d .vercel/output/functions/__server.func ] && [ ! -f dist/server/server.js ]; then
  node scripts/link-preview-server.mjs >>/tmp/app-startup.log 2>&1 || true
fi
npm run dev >>/tmp/app-startup.log 2>&1 &
