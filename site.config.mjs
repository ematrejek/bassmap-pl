/** Canonical production origin – used by astro.config and runtime sitemap/robots. */
export const SITE_ORIGIN = "https://bassmap.pl";

/** Public pages indexed in the static sitemap (build-time @astrojs/sitemap). */
export const SITEMAP_STATIC_PATHS = [
  "/",
  "/events",
  "/archive",
  "/privacy-policy",
  "/terms",
  "/report-issue",
  "/team",
  "/forum",
];
