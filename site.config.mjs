/** Canonical production origin – used by astro.config and runtime sitemap/robots. */
export const SITE_ORIGIN = "https://bassmap.pl";

/** Optional social profile URLs – leave empty to hide footer links. */
export const SITE_SOCIAL_INSTAGRAM_URL = "https://www.instagram.com/bassmap.pl";
export const SITE_SOCIAL_FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61591014322762";

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
