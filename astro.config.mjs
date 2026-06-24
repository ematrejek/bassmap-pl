// @ts-check
import { defineConfig, envField } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";
import { SITE_ORIGIN, SITEMAP_STATIC_PATHS } from "./site.config.mjs";

const SITEMAP_EXCLUDED = [/^\/auth(?:\/|$)/, /^\/admin(?:\/|$)/, /^\/api(?:\/|$)/, /^\/profile(?:\/|$)/, /^\/my-events(?:\/|$)/, /^\/403(?:\/|$)/];

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
