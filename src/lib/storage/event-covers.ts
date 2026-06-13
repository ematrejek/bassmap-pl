import type { CoverAspect, Event } from "@/types";

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

const EXTENSION_TO_MIME: Record<string, AllowedCoverMimeType> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function resolveCoverMimeType(file: Pick<File, "name" | "type">): AllowedCoverMimeType | null {
  if (ALLOWED_COVER_MIME_TYPES.includes(file.type as AllowedCoverMimeType)) {
    return file.type as AllowedCoverMimeType;
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_TO_MIME[extension] ?? null;
}

export function buildCoverStoragePath(eventId: string, mimeType: AllowedCoverMimeType): string {
  const extension = MIME_TO_EXTENSION[mimeType];
  return `${eventId}/cover.${extension}`;
}

export function validateCoverFile(
  file: File,
): { ok: true; mimeType: AllowedCoverMimeType } | { ok: false; error: string } {
  const mimeType = resolveCoverMimeType(file);
  if (!mimeType) {
    return { ok: false, error: "Dozwolone formaty: JPEG, PNG lub WebP" };
  }

  if (file.size > MAX_COVER_BYTES) {
    return { ok: false, error: "Plik jest za duży (maks. 5 MB)" };
  }

  return { ok: true, mimeType };
}

export function verifyCoverMagicBytes(bytes: Uint8Array, mimeType: AllowedCoverMimeType): boolean {
  if (bytes.length < 12) {
    return false;
  }

  switch (mimeType) {
    case "image/jpeg":
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/png":
      return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    case "image/webp":
      return (
        bytes[0] === 0x52 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x46 &&
        bytes[8] === 0x57 &&
        bytes[9] === 0x45 &&
        bytes[10] === 0x42 &&
        bytes[11] === 0x50
      );
  }
}

export function getCoverAspectClassName(aspect: CoverAspect | null): string {
  return aspect === "landscape" ? "aspect-video" : "aspect-[3/4]";
}

export function mapStorageUploadError(message: string): string {
  if (message.includes("Bucket not found") || message.includes("bucket does not exist")) {
    return "Magazyn okładek nie jest skonfigurowany na serwerze. Skontaktuj się z administratorem.";
  }
  if (message.includes("row-level security") || message.includes("RLS")) {
    return "Brak uprawnień do wgrania okładki. Zaloguj się ponownie jako admin.";
  }
  if (message.includes("Payload too large") || message.includes("maximum allowed size")) {
    return "Plik jest za duży (maks. 5 MB)";
  }
  if (message.includes("mime type") || message.includes("Invalid file type")) {
    return "Dozwolone formaty: JPEG, PNG lub WebP";
  }
  if (message.includes("The resource already exists")) {
    return "Nie udało się nadpisać okładki. Spróbuj ponownie.";
  }
  return "Nie udało się wgrać okładki. Spróbuj ponownie.";
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
