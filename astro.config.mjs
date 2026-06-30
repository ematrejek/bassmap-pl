// @ts-check
import { defineConfig, envField } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";
import AstroPWA from "@vite-pwa/astro";
import { SITE_ORIGIN, SITEMAP_STATIC_PATHS } from "./site.config.mjs";
import { PWA_NAVIGATE_FALLBACK_DENYLIST, isPwaNavigateCacheDenied, pwaManifest } from "./pwa.config.mjs";

const SITEMAP_EXCLUDED = [
  /^\/auth(?:\/|$)/,
  /^\/admin(?:\/|$)/,
  /^\/api(?:\/|$)/,
  /^\/profile(?:\/|$)/,
  /^\/my-events(?:\/|$)/,
  /^\/403(?:\/|$)/,
  /^\/offline(?:\/|$)/,
  /^\/404(?:\/|$)/,
];

// https://astro.build/config
export default defineConfig({
  site: SITE_ORIGIN,
  output: "server",
  integrations: [
    react(),
    sitemap({
      filter: (page) => {
        const pathname = new URL(page).pathname;
        return !SITEMAP_EXCLUDED.some((pattern) => pattern.test(pathname));
      },
      customPages: SITEMAP_STATIC_PATHS.map((path) => new URL(path, SITE_ORIGIN).href),
      serialize(item) {
        const { pathname } = new URL(item.url);
        if (pathname !== "/" && pathname.endsWith("/")) {
          return undefined;
        }
        return item;
      },
    }),
    AstroPWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "apple-touch-icon.png"],
      manifest: pwaManifest,
      workbox: {
        navigateFallback: "/offline",
        navigateFallbackDenylist: PWA_NAVIGATE_FALLBACK_DENYLIST,
        globPatterns: ["**/*.{css,js,svg,png,ico,webp,woff2}"],
        globIgnores: ["**/node_modules/**", "**/_worker.js/**"],
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) => {
              if (request.mode !== "navigate") return false;
              const pathname = new URL(url).pathname;
              return !isPwaNavigateCacheDenied(pathname);
            },
            handler: "NetworkFirst",
            options: {
              cacheName: "bassmap-pages",
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 32,
                maxAgeSeconds: 60 * 60 * 24,
              },
            },
          },
        ],
      },
      experimental: {
        directoryAndTrailingSlashHandler: true,
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      dedupe: ["react", "react-dom"],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "leaflet",
        "react-leaflet",
        "lucide-react",
      ],
      exclude: ["@radix-ui/react-alert-dialog", "@radix-ui/react-checkbox", "@radix-ui/react-dialog"],
    },
    ssr: {
      // Bundle these with the SSR graph so dev/prod share one React instance (avoids invalid hook call).
      noExternal: [
        "lucide-react",
        "@radix-ui/react-dialog",
        "@radix-ui/react-checkbox",
        "@radix-ui/react-alert-dialog",
      ],
    },
  },
  adapter: cloudflare(),
  env: {
    schema: {
      SUPABASE_URL: envField.string({ context: "server", access: "secret", optional: true }),
      SUPABASE_KEY: envField.string({ context: "server", access: "secret", optional: true }),
      SUPABASE_SERVICE_ROLE_KEY: envField.string({ context: "server", access: "secret", optional: true }),
    },
  },
});
