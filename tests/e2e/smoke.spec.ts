import { expect, test } from "@playwright/test";

/**
 * Stały zestaw dymny – uruchamiany w CI i lokalnie (`npm run test:e2e`).
 * Nie zastępuje testów integracyjnych; łapie regresje „React się nie załadował”.
 */
test.describe("Smoke – gość", () => {
  test("lista eventów ładuje interaktywny shell (nie wisi na fallbacku)", async ({ page }) => {
    await page.goto("/events");

    await expect(page.getByRole("heading", { name: /MAP THE/i })).toBeVisible();
    await expect(page.getByText("Ładowanie listy wydarzeń…")).toBeHidden({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: "Filtruj" })).toBeVisible({ timeout: 30_000 });
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
