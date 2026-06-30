import { expect, test } from "@playwright/test";

/**
 * Stały zestaw dymny – uruchamiany w CI i lokalnie (`npm run test:e2e`).
 * Nie zastępuje testów integracyjnych; łapie regresje „React się nie załadował”.
 */
test.describe("Smoke – gość", () => {
  test("lista eventów ładuje interaktywny shell i zawiera treść SSR", async ({ page }) => {
    await page.goto("/events", { waitUntil: "domcontentloaded" });

    const initialHtml = await page.content();
    const hasEventLink = /href="\/events\/[0-9a-f-]{36}"/u.test(initialHtml);
    const hasEmptyState = /Brak nadchodzących wydarzeń|Brak wydarzeń spełniających kryteria/u.test(initialHtml);
    expect(hasEventLink || hasEmptyState).toBe(true);
    if (hasEventLink) {
      expect(initialHtml).toContain("data-discovery-ssr-list");
    }

    await expect(page.getByRole("heading", { name: /MAP THE/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Filtruj" }).first()).toBeVisible({ timeout: 30_000 });
  });

  test("mapa ładuje się na desktopie; pinezka nawiguje gdy są eventy", async ({ page }) => {
    await page.goto("/events");
    await expect(page.getByRole("button", { name: "Filtruj" }).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("[data-discovery-map] .maplibregl-canvas")).toBeVisible({ timeout: 30_000 });

    const map = page.locator("[data-discovery-map]");
    const pins = map.locator(".discovery-map-pin");
    if ((await pins.count()) === 0) {
      test.skip(true, "Brak pinezek – brak opublikowanych eventów z współrzędnymi w bazie");
    }

    // Seed „Liquid Sundays” (Kraków) – unikalna lokalizacja; inne testy E2E często tworzą eventy w Warszawie i pinezki się nakładają.
    const isolatedPin = map.getByRole("button", { name: "Liquid Sundays" });
    if ((await isolatedPin.count()) > 0) {
      await isolatedPin.click();
    } else {
      await pins.last().click({ force: true });
    }
    await expect(page).toHaveURL(/\/events\/[0-9a-f-]{36}/, { timeout: 15_000 });
  });

  test("chroniony profil przekierowuje na logowanie", async ({ page }) => {
    await page.goto("/profile");

    await expect(page).toHaveURL(/\/auth\/signin/);
    await expect(page.getByRole("heading", { name: "Zaloguj się" })).toBeVisible();
  });

  test("strona logowania ma formularz e-mail i hasła", async ({ page }) => {
    await page.goto("/auth/signin");

    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Hasło")).toBeVisible();
    await expect(page.getByRole("button", { name: /Zaloguj się/i })).toBeVisible();
  });

  test("nieistniejący profil publiczny zwraca 404", async ({ page }) => {
    const response = await page.goto("/u/e2e-brak-takiego-loginu-xyz");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Nie znaleziono profilu" })).toBeVisible();
  });
});
