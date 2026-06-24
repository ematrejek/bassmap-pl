import { describe, expect, it } from "vitest";
import { buildUrlSetXml } from "@/lib/sitemap/xml";

describe("buildUrlSetXml", () => {
  it("escapes XML special characters in loc", () => {
    const xml = buildUrlSetXml([{ loc: "https://bassmap.pl/events?id=1&foo=bar" }]);
    expect(xml).toContain("<loc>https://bassmap.pl/events?id=1&amp;foo=bar</loc>");
  });

  it("includes lastmod when provided", () => {
    const xml = buildUrlSetXml([{ loc: "https://bassmap.pl/events", lastmod: "2026-06-24T10:00:00.000Z" }]);
    expect(xml).toContain("<lastmod>2026-06-24T10:00:00.000Z</lastmod>");
  });
});
