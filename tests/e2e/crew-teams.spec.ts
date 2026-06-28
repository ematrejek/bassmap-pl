import { expect, test } from "@playwright/test";

import { signInAsFan, signInAsSecondFan } from "./helpers/auth";
import { E2E_S24_CREW_NAME, ensureCrewsE2eFixture } from "./helpers/crews-fixture";
import { hasE2eDatabase } from "./helpers/env";

const runWorkflows = hasE2eDatabase();

async function openCrewTab(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/team#crew");
  await expect(page.getByRole("tab", { name: "Moja ekipa" })).toHaveAttribute("aria-selected", "true", {
    timeout: 30_000,
  });
}

test.describe("Crew teams – S-24", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(!runWorkflows, "Wymaga lokalnego Supabase (.env.test + npx supabase start)");

  test.setTimeout(180_000);

  let fanBLogin = "";

  test.beforeAll(async () => {
    const fixture = await ensureCrewsE2eFixture();
    fanBLogin = fixture.fanBLogin;
  });

  test("fan A tworzy ekipę na /team", async ({ page }) => {
    await signInAsFan(page);
    await openCrewTab(page);

    await page.getByLabel("Nazwa ekipy").fill(E2E_S24_CREW_NAME);
    await page.getByLabel("Miasto (opcjonalnie)").fill("Warszawa");
    await page.getByRole("button", { name: "Utwórz ekipę" }).click();

    await expect(page.getByText("Ekipa utworzona – jesteś właścicielem.")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("heading", { name: E2E_S24_CREW_NAME })).toBeVisible({ timeout: 30_000 });
  });

  test("fan B prosi o dołączenie z /team", async ({ page }) => {
    await signInAsSecondFan(page);
    await openCrewTab(page);

    await expect(page.getByRole("heading", { name: "Dołącz do ekipy" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("heading", { name: E2E_S24_CREW_NAME })).toBeVisible({ timeout: 30_000 });

    await page
      .getByRole("listitem")
      .filter({ hasText: E2E_S24_CREW_NAME })
      .getByRole("button", { name: "Poproś o dołączenie" })
      .click();
    await expect(page.getByText("Prośba o dołączenie wysłana – czekaj na odpowiedź właściciela.")).toBeVisible({
      timeout: 30_000,
    });
  });

  test("fan A akceptuje prośbę i obie strony widzą kontakt bez e-maila", async ({ browser }) => {
    const ownerContext = await browser.newContext();
    const memberContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    const memberPage = await memberContext.newPage();

    await signInAsFan(ownerPage);
    await openCrewTab(ownerPage);

    await expect(ownerPage.getByRole("button", { name: "Akceptuj" })).toBeVisible({ timeout: 30_000 });
    await ownerPage.getByRole("button", { name: "Akceptuj" }).click();
    await expect(ownerPage.getByText("Prośba zaakceptowana – nowy członek dołączył do ekipy.")).toBeVisible({
      timeout: 30_000,
    });

    await ownerPage.getByRole("button", { name: "Pokaż kontakt" }).click();
    await expect(ownerPage.getByText(`@${fanBLogin}`)).toBeVisible({ timeout: 30_000 });
    await expect(ownerPage.getByText(/@.+\.com/i)).not.toBeVisible();

    await signInAsSecondFan(memberPage);
    await openCrewTab(memberPage);

    await expect(memberPage.getByText("Ekipa, do której należysz")).toBeVisible({ timeout: 30_000 });
    await memberPage.getByRole("button", { name: "Pokaż kontakt" }).click();
    await expect(memberPage.getByText(/Login:/)).toBeVisible({ timeout: 30_000 });
    await expect(memberPage.getByText(/@.+\.com/i)).not.toBeVisible();

    await ownerContext.close();
    await memberContext.close();
  });

  test("fan A tworzy wątek rekrutacyjny, fan B po opuszczeniu ekipy prosi z forum", async ({ browser }) => {
    const ownerContext = await browser.newContext();
    const memberContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    const memberPage = await memberContext.newPage();

    await signInAsSecondFan(memberPage);
    await openCrewTab(memberPage);
    await memberPage.getByRole("button", { name: "Opuść ekipę" }).click();
    await memberPage.getByRole("button", { name: "Opuść ekipę" }).last().click();
    await expect(memberPage.getByText("Opuszczono ekipę.")).toBeVisible({ timeout: 30_000 });

    await signInAsFan(ownerPage);
    await ownerPage.goto("/forum");
    await ownerPage.getByRole("button", { name: "Załóż wątek" }).first().click();

    const dialog = ownerPage.getByRole("dialog");
    await dialog.getByLabel("Dział").selectOption("szukam_ekipy");
    await dialog.getByLabel("Tytuł").fill(`Rekrutacja ${E2E_S24_CREW_NAME}`);
    await dialog.getByLabel("Treść").fill("Szukamy ludzi do wspólnych wyjazdów na eventy DnB.");
    await dialog.getByRole("button", { name: "Załóż wątek" }).click();

    await expect(ownerPage).toHaveURL(/\/forum\/[0-9a-f-]+/u, { timeout: 30_000 });
    await expect(ownerPage.getByRole("heading", { name: E2E_S24_CREW_NAME })).toBeVisible({ timeout: 30_000 });

    await signInAsSecondFan(memberPage);
    await memberPage.goto(ownerPage.url());
    await memberPage.getByRole("button", { name: "Poproś o dołączenie" }).click();
    await expect(memberPage.getByText("Prośba o dołączenie oczekuje na odpowiedź właściciela.")).toBeVisible({
      timeout: 30_000,
    });

    await signInAsFan(ownerPage);
    await openCrewTab(ownerPage);
    await expect(ownerPage.getByRole("button", { name: "Akceptuj" })).toBeVisible({ timeout: 30_000 });

    await ownerContext.close();
    await memberContext.close();
  });

  test("odrzucenie jest ciche i pozwala ponowić prośbę", async ({ browser }) => {
    const ownerContext = await browser.newContext();
    const memberContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    const memberPage = await memberContext.newPage();

    await signInAsFan(ownerPage);
    await openCrewTab(ownerPage);
    await ownerPage.getByRole("button", { name: "Odrzuć" }).click();
    await expect(ownerPage.getByText("Prośba odrzucona.")).toBeVisible({ timeout: 30_000 });

    await signInAsSecondFan(memberPage);
    await openCrewTab(memberPage);
    await expect(
      memberPage
        .getByRole("listitem")
        .filter({ hasText: E2E_S24_CREW_NAME })
        .getByRole("button", { name: "Poproś o dołączenie" }),
    ).toBeVisible({ timeout: 30_000 });

    await ownerContext.close();
    await memberContext.close();
  });

  test("fan A usuwa ekipę, a zakładka znajomych nadal działa", async ({ page }) => {
    await signInAsFan(page);
    await openCrewTab(page);

    await page.getByRole("button", { name: "Usuń ekipę" }).click();
    await page.getByRole("button", { name: "Usuń ekipę" }).last().click();
    await expect(page.getByText("Ekipa została usunięta.")).toBeVisible({ timeout: 30_000 });

    await page.getByRole("tab", { name: "Znajomi" }).click();
    await expect(page.getByRole("button", { name: "Wyślij zaproszenie" })).toBeVisible({ timeout: 30_000 });
  });
});
