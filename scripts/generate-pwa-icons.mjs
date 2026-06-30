/**
 * Generates PWA icon PNGs from the BassMap BM monogram (matches public/favicon.svg).
 * Run: node scripts/generate-pwa-icons.mjs
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");

const BG = "#08080c";
const STROKE = "rgba(158, 100, 255, 0.55)";
const TEXT = "#e9d5ff";

function iconSvg(size, { maskable = false } = {}) {
  const pad = maskable ? size * 0.1 : size * 0.06;
  const inner = size - pad * 2;
  const rx = inner * 0.22;
  const fontSize = inner * 0.34;
  const y = pad + inner * 0.67;
  const letterSpacing = inner * 0.05;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BG}"/>
  <rect x="${pad}" y="${pad}" width="${inner}" height="${inner}" rx="${rx}" fill="#120f1c"/>
  <rect x="${pad + 1}" y="${pad + 1}" width="${inner - 2}" height="${inner - 2}" rx="${rx - 1}" fill="none" stroke="${STROKE}" stroke-width="${Math.max(1, size / 64)}"/>
  <text x="${size / 2}" y="${y}" text-anchor="middle" font-family="Orbitron, ui-sans-serif, system-ui, sans-serif" font-size="${fontSize}" font-weight="900" letter-spacing="${letterSpacing}" fill="${TEXT}">BM</text>
</svg>`;
}

async function writePng(filename, svg) {
  const out = path.join(publicDir, filename);
  await sharp(Buffer.from(svg)).png().toFile(out);
  console.log("wrote", out);
}

await writePng("pwa-192x192.png", iconSvg(192));
await writePng("pwa-512x512.png", iconSvg(512));
await writePng("pwa-maskable-512x512.png", iconSvg(512, { maskable: true }));
await writePng("apple-touch-icon.png", iconSvg(180));

// Keep a copy of source SVG for reference
await writeFile(path.join(publicDir, "pwa-icon-source.svg"), iconSvg(512), "utf8");
console.log("done");
