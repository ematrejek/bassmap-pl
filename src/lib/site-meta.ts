import { formatEventDate, formatEventVenueLine } from "@/lib/events/format";
import { absoluteUrl } from "@/lib/site";
import type { Event } from "@/types";

export const DEFAULT_SITE_TITLE = "BassMap PL – Find the place, drop the bass!";
export const DEFAULT_SITE_DESCRIPTION =
  "Mapa i lista imprez drum and bass w Polsce. Filtruj po mieście, dacie i podgatunku – znajdź następny rave.";
export const DEFAULT_OG_IMAGE_PATH = "/og-default.png";

export const META_DESCRIPTION_MAX_LENGTH = 160;

export function truncateMetaDescription(text: string, maxLength = META_DESCRIPTION_MAX_LENGTH): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}

export function resolveOgImageUrl(ogImage?: string | null): string {
  const path = ogImage?.trim();
  if (!path) {
    return absoluteUrl(DEFAULT_OG_IMAGE_PATH);
  }
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return absoluteUrl(path.startsWith("/") ? path : `/${path}`);
}

export interface BuildPageMetaInput {
  title?: string;
  description?: string;
  path?: string;
  ogImage?: string | null;
  ogType?: string;
}

export interface PageMeta {
  title: string;
  description: string;
  canonicalPath: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogType: string;
  ogUrl: string;
}

export function buildPageMeta(input: BuildPageMetaInput = {}): PageMeta {
  const title = input.title ?? DEFAULT_SITE_TITLE;
  const description = truncateMetaDescription(input.description ?? DEFAULT_SITE_DESCRIPTION);
  const canonicalPath = input.path ?? "/";
  const canonicalUrl = absoluteUrl(canonicalPath);
  const ogImage = resolveOgImageUrl(input.ogImage);
  const ogType = input.ogType ?? "website";

  return {
    title,
    description,
    canonicalPath,
    canonicalUrl,
    ogTitle: title,
    ogDescription: description,
    ogImage,
    ogType,
    ogUrl: canonicalUrl,
  };
}

export function buildDiscoveryPageDescription(eventCount: number): string {
  if (eventCount === 0) {
    return "Nadchodzące imprezy drum and bass w Polsce – filtruj po mieście, dacie i podgatunku na liście lub mapie.";
  }

  return truncateMetaDescription(
    `${String(eventCount)} nadchodzących wydarzeń drum and bass w Polsce – filtruj po mieście, dacie i podgatunku.`,
  );
}

export function buildEventPageDescription(
  event: Pick<Event, "name" | "startsAt" | "city" | "venueName" | "description">,
): string {
  const dateLine = formatEventDate(event.startsAt);
  const venueLine = formatEventVenueLine(event);
  const lead = `${event.name} – ${dateLine}, ${venueLine}.`;
  const body = event.description?.trim();

  if (body) {
    return truncateMetaDescription(`${lead} ${body}`);
  }

  return truncateMetaDescription(lead);
}

export function buildForumThreadDescription(thread: Pick<{ title: string; body: string }, "title" | "body">): string {
  const body = thread.body.trim().replace(/\s+/g, " ");
  if (!body) {
    return truncateMetaDescription(`${thread.title} – wątek na forum BassMap PL.`);
  }

  return truncateMetaDescription(`${thread.title}. ${body}`);
}
