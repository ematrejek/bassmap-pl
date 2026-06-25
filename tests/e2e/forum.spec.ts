import { expect, test } from "@playwright/test";

import { signInAsAdmin, signInAsFan } from "./helpers/auth";
import { hasE2eDatabase } from "./helpers/env";

const runWorkflows = hasE2eDatabase();

function uniqueTitle(prefix: string): string {
  return `${prefix} ${String(Date.now())}`;
}

test.describe("Forum – fan i admin", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(!runWorkflows, "Wymaga lokalnego Supabase (.env.test + npx supabase start)");

  test.setTimeout(120_000);

  let threadTitle = "";
  let threadUrl = "";

  test("gość: /forum przekierowuje na logowanie", async ({ page }) => {
    await page.goto("/forum");
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test("fan: widzi hero i sześć działów", async ({ page }) => {
    await signInAsFan(page);
    await page.goto("/forum");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Share the", { timeout: 30_000 });
    await expect(page.getByRole("heading", { level: 2, name: "Szukam ekipy" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Pozostałe wątki" })).toBeVisible();
  });

  test("fan: tworzy wątek i trafia na jego stronę", async ({ page }) => {
    threadTitle = uniqueTitle("E2E wątek");

    await signInAsFan(page);
    await page.goto("/forum");

    await page.getByRole("button", { name: "Załóż wątek" }).first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 30_000 });

    await dialog.getByLabel("Tytuł").fill(threadTitle);
    await dialog.getByLabel("Treść").fill("Treść testowego wątku E2E.");
    await dialog.getByRole("button", { name: "Załóż wątek" }).click();

    await expect(page).toHaveURL(/\/forum\/[0-9a-f-]+/u, { timeout: 30_000 });
    threadUrl = page.url();
    await expect(page.getByRole("heading", { level: 1, name: threadTitle })).toBeVisible();
  });

  test("fan: dodaje komentarz w wątku", async ({ page }) => {
    await signInAsFan(page);
    await page.goto(threadUrl);

    const textarea = page.getByLabel("Twój komentarz");
    const submit = page.getByRole("button", { name: "Wyślij" });
    await expect(textarea).toBeVisible({ timeout: 30_000 });

    // Sekcja komentarzy montuje sie przez client:load (SSR + pozniejsza hydratacja
    // React). Wpisujemy tekst klawiatura, bo fill() potrafi ustawic wartosc DOM
    // bez odblokowania kontrolowanego przycisku Reacta.
    await expect(async () => {
      await textarea.clear();
      await textarea.click();
      await page.keyboard.type("Komentarz testowy E2E.");
      await expect(submit).toBeEnabled({ timeout: 1_000 });
    }).toPass({ timeout: 30_000 });

    await submit.click();
    await expect(page.getByText("Komentarz testowy E2E.")).toBeVisible({ timeout: 30_000 });
  });

  test("admin: usuwa wątek z forum", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/forum");

    const card = page.locator("article").filter({ hasText: threadTitle }).first();
    await expect(card).toBeVisible({ timeout: 30_000 });
    await card.getByRole("button", { name: "Usuń wątek" }).click();

    await expect(page.locator("article").filter({ hasText: threadTitle })).toBeHidden({ timeout: 30_000 });
  });
});
