import type { Event } from "@/types";

export const EVENT_COVERS_BUCKET = "event-covers";

export const MAX_COVER_BYTES = 5 * 1024 * 1024;

export const ALLOWED_COVER_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type AllowedCoverMimeType = (typeof ALLOWED_COVER_MIME_TYPES)[number];

const COVER_PATH_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/cover\.(jpg|jpeg|png|webp)$/;

const MIME_TO_EXTENSION: Record<AllowedCoverMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function isValidCoverPath(path: string): boolean {
  return COVER_PATH_PATTERN.test(path);
}

export function getEventCoverUrl(coverPath: string | null, supabaseUrl: string): string | null {
  if (!coverPath) {
    return null;
  }

  const base = supabaseUrl.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${EVENT_COVERS_BUCKET}/${coverPath}`;
}

export function buildCoverStoragePath(eventId: string, mimeType: string): string {
  const extension = MIME_TO_EXTENSION[mimeType as AllowedCoverMimeType];
  if (!extension) {
    throw new Error(`Nieobsługiwany typ pliku: ${mimeType}`);
  }

  return `${eventId}/cover.${extension}`;
}

export function validateCoverFile(file: File): { ok: true } | { ok: false; error: string } {
  if (!ALLOWED_COVER_MIME_TYPES.includes(file.type as AllowedCoverMimeType)) {
    return { ok: false, error: "Dozwolone formaty: JPEG, PNG lub WebP" };
  }

  if (file.size > MAX_COVER_BYTES) {
    return { ok: false, error: "Plik jest za duży (maks. 5 MB)" };
  }

  return { ok: true };
}

export function enrichEventWithCoverUrl<T extends Event>(
  event: T,
  supabaseUrl: string,
): T & { coverUrl: string | null } {
  return {
    ...event,
    coverUrl: getEventCoverUrl(event.coverPath, supabaseUrl),
  };
}
