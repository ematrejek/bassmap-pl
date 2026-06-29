import { expect, test } from "@playwright/test";

import { SUBGENRE_LABELS, SUBGENRES } from "../../src/types";
import { signInAsAdmin, signInAsFan } from "./helpers/auth";
import { hasE2eDatabase } from "./helpers/env";
import {
  acceptFanContentRights,
  fillCoordinatesEventForm,
  futureDatetimeLocal,
  submitEventForm,
  uniqueE2eName,
} from "./helpers/event-form";
import { createServiceClient } from "../helpers/supabase";
import {
  deleteLegacySubgenreEvent,
  insertLegacySubgenreEvent,
  type LegacySubgenreEventFixture,
} from "./helpers/subgenre-fixture";

const ACTIVE_LABELS = SUBGENRES.map((subgenre) => SUBGENRE_LABELS[subgenre]);
const LEGACY_ONLY_LABELS = ["Halftime", "Liquid Funk", "Anthem DnB", "Liquid DnB", "Darkstep"];

const runWithDatabase = hasE2eDatabase();

async function waitForDiscoveryShell(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/events");
  await expect(page.getByRole("button", { name: "Filtruj" })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("group", { name: "Wybór podgatunków" })).toBeVisible({ timeout: 15_000 });
}

function subgenreGroup(page: import("@playwright/test").Page) {
  return page.getByRole("group", { name: "Wybór podgatunków" });
}

test.describe("Katalog podgatunków v2 – S-29", () => {
  test.describe.configure({ mode: "serial" });

  test.describe("Gość – filtr discovery", () => {
    test("pokazuje dokładnie 13 aktywnych podgatunków", async ({ page }) => {
      await waitForDiscoveryShell(page);

      const group = subgenreGroup(page);
      await expect(group.getByRole("checkbox")).toHaveCount(13);

      for (const label of ACTIVE_LABELS) {
        await expect(group.getByText(label, { exact: true })).toBeVisible();
      }
    });

    test("nie pokazuje legacy podgatunków w filtrze", async ({ page }) => {
      await waitForDiscoveryShell(page);

      const group = subgenreGroup(page);
      for (const label of LEGACY_ONLY_LABELS) {
        await expect(group.getByText(label, { exact: true })).toHaveCount(0);
      }
    });

    test("ignoruje legacy param w URL i zostawia tylko aktywny", async ({ page }) => {
      await page.goto("/events?subgenre=halftime&subgenre=neurofunk");
      await expect(page.getByRole("button", { name: "Filtruj" })).toBeVisible({ timeout: 60_000 });

      const group = subgenreGroup(page);
      await expect(group.getByText("Neurofunk", { exact: true })).toBeVisible();
      await expect(group.getByText("Halftime", { exact: true })).toHaveCount(0);

      const neuroRow = group.locator("label").filter({ hasText: "Neurofunk" });
      await expect(neuroRow.getByRole("checkbox")).toBeChecked();

      await page.getByRole("button", { name: "Filtruj" }).click();
      await page.waitForURL(/subgenre=neurofunk/u, { timeout: 15_000 });
      expect(page.url()).not.toMatch(/subgenre=halftime/u);
    });
  });

  test.describe("Baza lokalna – legacy i formularze", () => {
    test.skip(!runWithDatabase, "Wymaga lokalnego Supabase (.env.test + npx supabase start)");

    test.setTimeout(180_000);

    let legacyEvent: LegacySubgenreEventFixture | null = null;

    test.afterAll(async () => {
      if (legacyEvent) {
        await deleteLegacySubgenreEvent(createServiceClient(), legacyEvent.id);
      }
    });

    test("karta wydarzenia ukrywa legacy badge, pokazuje aktywny", async ({ page }) => {
      legacyEvent = await insertLegacySubgenreEvent(createServiceClient());

      await page.goto(`/events/${legacyEvent.id}`);
      await expect(page.getByRole("heading", { name: legacyEvent.name })).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText("Neurofunk", { exact: true }).first()).toBeVisible();
      await expect(page.getByText("Halftime", { exact: true })).toHaveCount(0);
    });

    test("admin: formularz ma 13 podgatunków i zapisuje nowy (Garage)", async ({ page }) => {
      const eventName = uniqueE2eName("garage-v2");

      await signInAsAdmin(page);
      await page.goto("/admin/events/new");
      await expect(page.getByLabel("Nazwa wydarzenia")).toBeVisible({ timeout: 30_000 });

      await expect(page.getByText("Podgatunki (min. 1)")).toBeVisible();
      await expect(page.locator('[id^="subgenre-"]')).toHaveCount(13);
      await expect(page.getByText("Garage", { exact: true })).toBeVisible();
      await expect(page.getByText("Halftime", { exact: true })).toHaveCount(0);

      await fillCoordinatesEventForm(page, {
        name: eventName,
        startsAt: futureDatetimeLocal(55),
        city: `E2E Garage ${String(Date.now())}`,
        subgenreLabel: "Garage",
      });
      await submitEventForm(page, "Dodaj wydarzenie");

      await expect(page).toHaveURL(/\/admin/u, { timeout: 30_000 });
      await expect(page.getByRole("row").filter({ hasText: eventName }).first()).toBeVisible({ timeout: 30_000 });
    });

    test("fan: profil ma 13 ulubionych podgatunków do wyboru", async ({ page }) => {
      await signInAsFan(page);
      await page.goto("/profile");
      await expect(page.getByRole("heading", { name: /Mój profil/i })).toBeVisible({ timeout: 30_000 });
      await page.getByRole("button", { name: "Edytuj profil" }).click();
      await expect(page.getByRole("heading", { name: /Edytuj profil/i })).toBeVisible({ timeout: 15_000 });

      const subgenreButtons = page
        .getByRole("heading", { name: "Ulubione podgatunki" })
        .locator("+ div")
        .getByRole("button");
      await expect(subgenreButtons).toHaveCount(13);
      await expect(subgenreButtons.filter({ hasText: "Trance" })).toHaveCount(1);
      await expect(subgenreButtons.filter({ hasText: "Halftime" })).toHaveCount(0);
    });

    test("fan: formularz wydarzenia ma 13 podgatunków", async ({ page }) => {
      await signInAsFan(page);
      await page.goto("/my-events/new");
      await expect(page.getByLabel("Nazwa wydarzenia")).toBeVisible({ timeout: 30_000 });

      await expect(page.getByText("Podgatunki (min. 1)")).toBeVisible();
      await expect(page.locator('[id^="subgenre-"]')).toHaveCount(13);

      await fillCoordinatesEventForm(page, {
        name: uniqueE2eName("fan-subgenre-v2"),
        subgenreLabel: "Bounce",
      });
      await acceptFanContentRights(page);
      await page.getByRole("button", { name: "Wyślij do moderacji" }).click();
      await expect(page).toHaveURL(/\/my-events/u, { timeout: 30_000 });
    });
  });
});
