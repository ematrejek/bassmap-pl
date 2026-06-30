import { describe, expect, it } from "vitest";
import {
  DEFAULT_OG_IMAGE_PATH,
  DEFAULT_SITE_DESCRIPTION,
  DEFAULT_SITE_TITLE,
  META_DESCRIPTION_MAX_LENGTH,
  buildDiscoveryPageDescription,
  buildEventPageDescription,
  buildPageMeta,
  resolveOgImageUrl,
  truncateMetaDescription,
} from "@/lib/site-meta";
import { absoluteUrl } from "@/lib/site";

describe("site-meta", () => {
  it("resolveOgImageUrl uses default when empty", () => {
    expect(resolveOgImageUrl()).toBe(absoluteUrl(DEFAULT_OG_IMAGE_PATH));
    expect(resolveOgImageUrl(null)).toBe(absoluteUrl(DEFAULT_OG_IMAGE_PATH));
  });

  it("resolveOgImageUrl keeps absolute URLs", () => {
    const url = "https://cdn.example.com/cover.jpg";
    expect(resolveOgImageUrl(url)).toBe(url);
  });

  it("resolveOgImageUrl absolutizes relative paths", () => {
    expect(resolveOgImageUrl("/pwa-512x512.png")).toBe(absoluteUrl("/pwa-512x512.png"));
  });

  it("buildPageMeta applies defaults", () => {
    const meta = buildPageMeta();
    expect(meta.title).toBe(DEFAULT_SITE_TITLE);
    expect(meta.description).toBe(DEFAULT_SITE_DESCRIPTION);
    expect(meta.canonicalUrl).toBe(absoluteUrl("/"));
    expect(meta.ogImage).toBe(absoluteUrl(DEFAULT_OG_IMAGE_PATH));
    expect(meta.ogType).toBe("website");
  });

  it("truncateMetaDescription shortens long text", () => {
    const long = "a".repeat(META_DESCRIPTION_MAX_LENGTH + 20);
    const result = truncateMetaDescription(long);
    expect(result.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX_LENGTH);
    expect(result.endsWith("…")).toBe(true);
  });

  it("buildDiscoveryPageDescription handles empty list", () => {
    expect(buildDiscoveryPageDescription(0)).toContain("Nadchodzące");
  });

  it("buildDiscoveryPageDescription includes count", () => {
    expect(buildDiscoveryPageDescription(12)).toContain("12");
  });

  it("buildEventPageDescription includes name, date and venue", () => {
    const description = buildEventPageDescription({
      name: "Bass Night",
      startsAt: "2026-07-15T18:00:00.000Z",
      city: "Warszawa",
      venueName: "Proxima",
      description: null,
    });

    expect(description).toContain("Bass Night");
    expect(description).toContain("Warszawa");
    expect(description.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX_LENGTH);
  });

  it("buildEventPageDescription truncates long body", () => {
    const description = buildEventPageDescription({
      name: "Bass Night",
      startsAt: "2026-07-15T18:00:00.000Z",
      city: "Warszawa",
      venueName: "Proxima",
      description: "x".repeat(300),
    });

    expect(description.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX_LENGTH);
  });
});
