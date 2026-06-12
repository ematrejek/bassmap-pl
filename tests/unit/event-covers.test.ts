import { describe, expect, it } from "vitest";
import {
  buildCoverStoragePath,
  getEventCoverUrl,
  isValidCoverPath,
  MAX_COVER_BYTES,
  validateCoverFile,
} from "@/lib/storage/event-covers";

const SAMPLE_EVENT_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const VALID_COVER_PATH = `${SAMPLE_EVENT_ID}/cover.jpg`;
const SUPABASE_URL = "http://127.0.0.1:54321";

function mockFile(overrides: Partial<{ name: string; type: string; size: number }> = {}): File {
  const name = overrides.name ?? "poster.jpg";
  const type = overrides.type ?? "image/jpeg";
  const size = overrides.size ?? 1024;
  return new File([new Uint8Array(size)], name, { type });
}

describe("getEventCoverUrl", () => {
  it("returns null when coverPath is null", () => {
    expect(getEventCoverUrl(null, SUPABASE_URL)).toBeNull();
  });

  it("builds public storage URL for a valid cover path", () => {
    expect(getEventCoverUrl(VALID_COVER_PATH, SUPABASE_URL)).toBe(
      `${SUPABASE_URL}/storage/v1/object/public/event-covers/${VALID_COVER_PATH}`,
    );
  });

  it("strips trailing slash from supabase URL", () => {
    expect(getEventCoverUrl(VALID_COVER_PATH, `${SUPABASE_URL}/`)).toBe(
      `${SUPABASE_URL}/storage/v1/object/public/event-covers/${VALID_COVER_PATH}`,
    );
  });
});

describe("isValidCoverPath", () => {
  it("accepts UUID-based cover paths with allowed extensions", () => {
    expect(isValidCoverPath(VALID_COVER_PATH)).toBe(true);
    expect(isValidCoverPath(`${SAMPLE_EVENT_ID}/cover.webp`)).toBe(true);
  });

  it("rejects path traversal and malformed paths", () => {
    expect(isValidCoverPath("../evil/cover.jpg")).toBe(false);
    expect(isValidCoverPath("not-a-uuid/cover.jpg")).toBe(false);
    expect(isValidCoverPath(`${SAMPLE_EVENT_ID}/cover.gif`)).toBe(false);
  });
});

describe("buildCoverStoragePath", () => {
  it("maps MIME type to file extension", () => {
    expect(buildCoverStoragePath(SAMPLE_EVENT_ID, "image/png")).toBe(`${SAMPLE_EVENT_ID}/cover.png`);
  });
});

describe("validateCoverFile", () => {
  it("accepts allowed MIME types within size limit", () => {
    const result = validateCoverFile(mockFile({ type: "image/png", name: "flyer.png" }));

    expect(result).toEqual({ ok: true, mimeType: "image/png" });
  });

  it("resolves MIME from file extension when type is empty (Windows)", () => {
    const result = validateCoverFile(mockFile({ type: "", name: "flyer.webp" }));

    expect(result).toEqual({ ok: true, mimeType: "image/webp" });
  });

  it("rejects unsupported MIME types", () => {
    const result = validateCoverFile(mockFile({ type: "application/pdf", name: "flyer.pdf" }));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("JPEG");
    }
  });

  it("rejects files larger than 5 MB", () => {
    const result = validateCoverFile(mockFile({ size: MAX_COVER_BYTES + 1 }));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("5 MB");
    }
  });
});
