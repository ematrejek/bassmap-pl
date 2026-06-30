/**
 * Verifies PWA artifacts exist in the production client bundle.
 * Run after `npm run build`.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const clientDir = path.join(root, "dist", "client");

const required = [
  "manifest.webmanifest",
  "sw.js",
  "pwa-192x192.png",
  "pwa-512x512.png",
  "pwa-maskable-512x512.png",
  "apple-touch-icon.png",
  "offline/index.html",
  "404.html",
];

let failed = false;

for (const file of required) {
  const full = path.join(clientDir, file);
  if (!existsSync(full)) {
    console.error("missing:", file);
    failed = true;
  }
}

if (!failed) {
  const manifest = JSON.parse(readFileSync(path.join(clientDir, "manifest.webmanifest"), "utf8"));
  if (manifest.display !== "standalone") {
    console.error("manifest.display must be standalone");
    failed = true;
  }
  if (!Array.isArray(manifest.icons) || manifest.icons.length < 2) {
    console.error("manifest.icons must include at least 2 entries");
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log("PWA build artifacts OK");
