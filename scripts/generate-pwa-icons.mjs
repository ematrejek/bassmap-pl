/**
 * Generates PWA + favicon PNGs from public/pwa-icon-source.png.
 * Run: npm run pwa:icons
 */
import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");
const sourcePath = path.join(publicDir, "pwa-icon-source.png");

/** Matches PWA_THEME_COLOR in pwa.config.mjs */
const BG = { r: 8, g: 8, b: 12, alpha: 1 };

async function ensureSource() {
  try {
    await access(sourcePath);
  } catch {
    throw new Error(`Missing ${sourcePath}. Add a square PNG (512×512 or larger) as the icon source.`);
  }
}

/**
 * @param {number} size
 * @param {{ maskable?: boolean }} [options]
 */
async function renderIcon(size, { maskable = false } = {}) {
  if (!maskable) {
    return sharp(sourcePath).resize(size, size, { fit: "cover" }).png();
  }

  const pad = Math.round(size * 0.1);
  const inner = size - pad * 2;
  const icon = await sharp(sourcePath).resize(inner, inner, { fit: "cover" }).png().toBuffer();

  return sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  }).composite([{ input: icon, top: pad, left: pad }]);
}

/**
 * @param {string} filename
 * @param {number} size
 * @param {{ maskable?: boolean }} [options]
 */
async function writePng(filename, size, options) {
  const out = path.join(publicDir, filename);
  await (await renderIcon(size, options)).png().toFile(out);
  console.log("wrote", out);
}

await ensureSource();

await writePng("pwa-192x192.png", 192);
await writePng("pwa-512x512.png", 512);
await writePng("pwa-maskable-512x512.png", 512, { maskable: true });
await writePng("apple-touch-icon.png", 180);
await writePng("favicon.png", 48);

console.log("done");
