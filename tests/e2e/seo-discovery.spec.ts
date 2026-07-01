import { expect, test } from "@playwright/test";

import { expectOgTags, getMetaDescription } from "./helpers/seo";

/**
 * Regresje SEO z audytu ui-audit-seo-nav – treść SSR na /events i meta bez JS.
 */
test.describe("SEO – discovery", () => {
  test("/events – HTML zawiera listę SSR lub stan pusty", async ({ page }) => {
    await page.goto("/events", { waitUntil: "domcontentloaded" });

    const html = await page.content();
    const hasEventLink = /href="\/events\/[0-9a-f-]{36}"/u.test(html);
    const hasEmptyState = /Brak nadchodzących wydarzeń|Brak wydarzeń spełniających kryteria/u.test(html);

    expect(hasEventLink || hasEmptyState).toBe(true);

    if (hasEventLink) {
      expect(html).toContain("data-discovery-ssr-list");
      expect(html).toMatch(/<h2[^>]*>[\s\S]*?<a[^>]*href="\/events\/[0-9a-f-]{36}"/u);
    }
  });

  test("/events – meta description, canonical i Open Graph", async ({ page }) => {
    await page.goto("/events", { waitUntil: "domcontentloaded" });

    const description = await getMetaDescription(page);
    expect(description.length).toBeGreaterThan(20);
    expect(description).toMatch(/drum and bass|imprez|wydarzeń/i);

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/events$/u);
    await expectOgTags(page);
  });
});
