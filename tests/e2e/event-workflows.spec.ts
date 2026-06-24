import { expect, test } from "@playwright/test";

import { signInAsAdmin, signInAsFan } from "./helpers/auth";
import { hasE2eDatabase } from "./helpers/env";
import {
  acceptFanContentRights,
  fillCoordinatesEventForm,
  futureDatetimeLocal,
  submitEventForm,
  uniqueE2eName,
} from "./helpers/event-form";

const runWorkflows = hasE2eDatabase();

test.describe("Ścieżki wydarzeń – fan i admin", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(!runWorkflows, "Wymaga lokalnego Supabase (.env.test + npx supabase start)");

  test.setTimeout(120_000);

  let baseEventName = "";
  let baseEventStartsAt = "";
  let catalogCity = "";
  let publishedEventId = "";
  let editTargetName = "";

  test("admin: dodaje wydarzenie do katalogu", async ({ page }) => {
    baseEventName = uniqueE2eName("catalog");
    baseEventStartsAt = futureDatetimeLocal(50);
    catalogCity = `E2E Catalog ${String(Date.now())}`;
    editTargetName = uniqueE2eName("edit-target");

    await signInAsAdmin(page);
    await page.goto("/admin/events/new");
    await expect(page.getByLabel("Nazwa wydarzenia")).toBeVisible({ timeout: 30_000 });

    await fillCoordinatesEventForm(page, {
      name: baseEventName,
      startsAt: baseEventStartsAt,
      city: catalogCity,
    });
    await submitEventForm(page, "Dodaj wydarzenie");

    await expect(page).toHaveURL(/\/admin/, { timeout: 30_000 });

    const catalogSection = page.locator("section").filter({ hasText: "Wszystkie wydarzenia" });
    await expect(catalogSection.getByRole("row").filter({ hasText: baseEventName }).first()).toBeVisible({
      timeout: 30_000,
    });
    const editHref = await catalogSection
      .getByRole("row")
      .filter({ hasText: baseEventName })
      .first()
      .getByRole("link", { name: "Edytuj" })
      .getAttribute("href");
    publishedEventId = editHref?.match(/\/events\/([^/]+)\/edit/u)?.[1] ?? "";
    expect(publishedEventId).not.toBe("");
  });

  test("fan: wykrywa duplikat i wysyła zgłoszenie mimo to", async ({ page }) => {
    await signInAsFan(page);
    await page.goto("/my-events/new");

    await fillCoordinatesEventForm(page, {
      name: baseEventName,
      startsAt: baseEventStartsAt,
      city: catalogCity,
    });
    await acceptFanContentRights(page);
    await page.getByRole("button", { name: "Wyślij do moderacji" }).click();
    await expect(page.getByRole("alertdialog")).toContainText("Podobne wydarzenie już istnieje", {
      timeout: 15_000,
    });
    await page.getByRole("button", { name: "Wyślij mimo to" }).click();

    await expect(page).toHaveURL(/\/my-events\?submitted=1/, { timeout: 30_000 });
    await expect(page.getByText(baseEventName)).toBeVisible();
  });

  test("admin: publikuje zgłoszenie fana", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/admin");

    const moderationRow = page
      .locator("section")
      .filter({ hasText: "Do moderacji" })
      .getByRole("row")
      .filter({ hasText: baseEventName })
      .first();
    await expect(moderationRow).toBeVisible({ timeout: 30_000 });
    await moderationRow.getByRole("button", { name: "Opublikuj" }).click();

    await expect(moderationRow).toBeHidden({ timeout: 30_000 });
  });

  test("fan: sugeruje zmianę na stronie wydarzenia", async ({ page }) => {
    await signInAsFan(page);
    await page.goto(`/events/${publishedEventId}`);

    await page.getByRole("button", { name: "Sugeruj zmiany" }).click();
    await expect(page.getByLabel("Opis wydarzenia")).toBeVisible({ timeout: 30_000 });
    await page.getByLabel("Opis wydarzenia").fill("E2E – zaktualizowany opis z sugestii fana.");
    await page.getByLabel("Komentarz dla admina (opcjonalnie)").fill("Proszę o aktualizację opisu.");
    await page.getByRole("button", { name: "Wyślij sugestię" }).click();

    await expect(page).toHaveURL(/\/my-events\?suggestionSubmitted=1/, { timeout: 30_000 });
  });

  test("admin: przyjmuje sugestię zmian", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/admin");

    const suggestionRow = page
      .locator("section")
      .filter({ hasText: "Sugestie zmian" })
      .getByRole("row")
      .filter({ hasText: baseEventName })
      .first();
    await expect(suggestionRow).toBeVisible({ timeout: 30_000 });
    await suggestionRow.getByRole("button", { name: "Otwórz sugestię" }).click();

    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.getByRole("button", { name: "Przyjmij" }).click();

    await expect(page.getByRole("alertdialog")).toBeHidden({ timeout: 30_000 });
  });

  test("admin: edytuje wydarzenie", async ({ page }) => {
    const updatedName = `${editTargetName}-updated`;

    await signInAsAdmin(page);
    await page.goto("/admin/events/new");
    await fillCoordinatesEventForm(page, { name: editTargetName, city: `E2E Edit ${String(Date.now())}` });
    await submitEventForm(page, "Dodaj wydarzenie");
    await expect(page).toHaveURL(/\/admin/, { timeout: 30_000 });

    const catalogSection = page.locator("section").filter({ hasText: "Wszystkie wydarzenia" });
    const row = catalogSection.getByRole("row").filter({ hasText: editTargetName }).first();
    await expect(row).toBeVisible({ timeout: 30_000 });
    await row.getByRole("link", { name: "Edytuj" }).click();
    await expect(page.getByRole("heading", { name: "Edytuj wydarzenie" })).toBeVisible();

    await page.getByLabel("Nazwa wydarzenia").fill(updatedName);
    await page.getByRole("button", { name: "Zapisz zmiany" }).click();

    await expect(page).toHaveURL(/\/admin/, { timeout: 30_000 });
    await expect(catalogSection.getByRole("row").filter({ hasText: updatedName }).first()).toBeVisible();
    editTargetName = updatedName;
  });

  test("admin: usuwa wydarzenie", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/admin");

    const catalogSection = page.locator("section").filter({ hasText: "Wszystkie wydarzenia" });
    const row = catalogSection.getByRole("row").filter({ hasText: editTargetName }).first();
    await row.getByRole("link", { name: "Usuń" }).click();

    await expect(page.getByRole("heading", { name: "Usunąć wydarzenie?" })).toBeVisible();
    await page.getByRole("button", { name: "Tak, usuń" }).click();

    await expect(page).toHaveURL(/\/admin/, { timeout: 30_000 });
    await expect(catalogSection.getByRole("row").filter({ hasText: editTargetName })).toBeHidden({
      timeout: 30_000,
    });
  });
});
