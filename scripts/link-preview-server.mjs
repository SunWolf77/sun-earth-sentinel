#!/usr/bin/env node
/**
 * Nitro vercel preset writes .vercel/output only.
 * TanStack `vite preview` still expects dist/server/server.js (fetch handler).
 * Bridge the two so preview / platform smoke does not MODULE_NOT_FOUND.
 */
import { cpSync, existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const nitroEntry = join(
  root,
  ".vercel/output/functions/__server.func/index.mjs",
);
const staticDir = join(root, ".vercel/output/static");
const distServer = join(root, "dist/server");
const distClient = join(root, "dist/client");

if (!existsSync(nitroEntry)) {
  console.error("[link-preview-server] missing nitro entry:", nitroEntry);
  process.exit(1);
}

mkdirSync(distServer, { recursive: true });
// Relative import from dist/server → .vercel/output/functions/__server.func/index.mjs
const rel = "../../.vercel/output/functions/__server.func/index.mjs";
writeFileSync(
  join(distServer, "server.js"),
  `/** Auto-generated bridge for vite preview (do not edit). */\nexport { default } from ${JSON.stringify(rel)};\n`,
);

if (existsSync(staticDir)) {
  if (existsSync(distClient)) rmSync(distClient, { recursive: true, force: true });
  mkdirSync(dirname(distClient), { recursive: true });
  cpSync(staticDir, distClient, { recursive: true });
}

console.log("[link-preview-server] dist/server/server.js + dist/client ready");
