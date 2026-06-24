import { expect, test } from "@playwright/test";

test.describe("Zgłoś problem – gość", () => {
  test("formularz wysyła zgłoszenie (API zamockowane)", async ({ page }) => {
    await page.route("**/api/contact/report-issue", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto("/report-issue");
    await expect(page.getByRole("button", { name: "Wyślij zgłoszenie" })).toBeVisible({ timeout: 30_000 });

    await page.getByLabel("Twój e-mail").fill("e2e-tester@example.com");
    await page.getByLabel("Treść zgłoszenia").fill("To jest testowe zgłoszenie z Playwright E2E.");
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/contact/report-issue") && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Wyślij zgłoszenie" }).click();
    await responsePromise;

    await expect(page.getByText("Dziękujemy – wiadomość została wysłana.")).toBeVisible({ timeout: 15_000 });
  });
});
