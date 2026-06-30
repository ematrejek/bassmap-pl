import {
  SITE_ORIGIN,
  SITE_SOCIAL_FACEBOOK_URL,
  SITE_SOCIAL_INSTAGRAM_URL,
  SITEMAP_STATIC_PATHS,
} from "../../site.config.mjs";

export { SITE_ORIGIN, SITE_SOCIAL_FACEBOOK_URL, SITE_SOCIAL_INSTAGRAM_URL, SITEMAP_STATIC_PATHS };

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_ORIGIN).href;
}

export function isPublicHttpUrl(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith("https://") || trimmed.startsWith("http://");
}

export function resolveSocialUrl(value: string): string | null {
  return isPublicHttpUrl(value) ? value.trim() : null;
}
