/** Shared PWA manifest fields for @vite-pwa/astro */
export const PWA_THEME_COLOR = "#08080c";

/** @type {import('vite-plugin-pwa').ManifestOptions} */
export const pwaManifest = {
  name: "BassMap PL",
  short_name: "BassMap",
  description: "Mapa polskich wydarzeń drum and bass.",
  start_url: "/",
  scope: "/",
  display: "standalone",
  background_color: PWA_THEME_COLOR,
  theme_color: PWA_THEME_COLOR,
  lang: "pl",
  icons: [
    {
      src: "/pwa-192x192.png",
      sizes: "192x192",
      type: "image/png",
    },
    {
      src: "/pwa-512x512.png",
      sizes: "512x512",
      type: "image/png",
    },
    {
      src: "/pwa-maskable-512x512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ],
};

/** Routes that must not use offline navigation fallback or HTML runtime cache. */
export const PWA_NAVIGATE_FALLBACK_DENYLIST = [
  /^\/api(?:\/|$)/,
  /^\/admin(?:\/|$)/,
  /^\/auth(?:\/|$)/,
  /^\/profile(?:\/|$)/,
  /^\/my-events(?:\/|$)/,
  /^\/team(?:\/|$)/,
  /^\/forum(?:\/|$)/,
];

/** @param {string} pathname */
export function isPwaNavigateCacheDenied(pathname) {
  return PWA_NAVIGATE_FALLBACK_DENYLIST.some((pattern) => pattern.test(pathname));
}
