import { expect, test } from "@playwright/test";

/**
 * Pomiary czasu ładowania mapy na /events (MapLibre lazy chunk).
 * Progi orientacyjne dla lokalnego dev – nie są twardym gate CI.
 */
test.describe("Wydajność – mapa discovery", () => {
  test("desktop: mapa widoczna i interaktywna w rozsądnym czasie", async ({ page }) => {
    const start = Date.now();

    await page.goto("/events", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /MAP THE/i })).toBeVisible();
    await expect(page.getByText("Ładowanie listy wydarzeń…")).toBeHidden({ timeout: 30_000 });

    const shellReadyMs = Date.now() - start;

    await expect(page.locator("[data-discovery-map]")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".maplibregl-canvas")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: "Zoom in" })).toBeVisible({ timeout: 15_000 });

    const mapReadyMs = Date.now() - start;

    const resources = await page.evaluate(() => {
      const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
      const mapChunk = entries
        .filter((e) => e.name.includes("EventsMap") || e.name.includes("maplibre"))
        .map((e) => ({
          name: e.name.split("/").pop() ?? e.name,
          durationMs: Math.round(e.duration),
          transferKb: e.transferSize ? Math.round(e.transferSize / 1024) : null,
        }));
      return { mapChunk, resourceCount: entries.length };
    });

    console.log(
      JSON.stringify(
        {
          shellReadyMs,
          mapReadyMs,
          mapResources: resources.mapChunk,
          totalResources: resources.resourceCount,
        },
        null,
        2,
      ),
    );

    expect(shellReadyMs).toBeLessThan(15_000);
    expect(mapReadyMs).toBeLessThan(20_000);
  });

  test("mobile: mapa ładuje się dopiero po zakładce Mapa", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/events", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Ładowanie listy wydarzeń…")).toBeHidden({ timeout: 30_000 });

    await expect(page.locator(".maplibregl-canvas")).toHaveCount(0);

    const beforeTab = Date.now();
    await page.getByRole("button", { name: "Mapa" }).click();
    await expect(page.locator(".maplibregl-canvas")).toBeVisible({ timeout: 20_000 });
    const mapAfterTabMs = Date.now() - beforeTab;

    console.log(JSON.stringify({ mapAfterTabMs }, null, 2));

    expect(mapAfterTabMs).toBeLessThan(15_000);
  });
});
