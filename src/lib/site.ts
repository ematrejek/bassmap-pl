import { SITE_ORIGIN, SITEMAP_STATIC_PATHS } from "../../site.config.mjs";

export { SITE_ORIGIN, SITEMAP_STATIC_PATHS };

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_ORIGIN).href;
}
