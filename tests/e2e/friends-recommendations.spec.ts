import { expect, test } from "@playwright/test";

import { signInAsFan, signInAsSecondFan } from "./helpers/auth";
import { ensureFriendsE2eFixture } from "./helpers/friends-fixture";
import { hasE2eDatabase } from "./helpers/env";

const runWorkflows = hasE2eDatabase();

test.describe("Friends and recommendations – S-23", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(!runWorkflows, "Wymaga lokalnego Supabase (.env.test + npx supabase start)");

  test.setTimeout(120_000);

  let fanBLogin = "";

  test.beforeAll(async () => {
    const fixture = await ensureFriendsE2eFixture();
    fanBLogin = fixture.fanBLogin;
  });

  test("zalogowany fan widzi dzwonek powiadomień", async ({ page }) => {
    await signInAsFan(page);
    await page.goto("/events");

    await expect(page.getByRole("button", { name: /Powiadomienia/i })).toBeVisible({ timeout: 30_000 });
  });

  test("fan otwiera panel znajomych /team", async ({ page }) => {
    await signInAsFan(page);
    await page.goto("/team");

    await expect(page.getByRole("heading", { name: /Znajomi i ekipa/i })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: "Wyślij zaproszenie" })).toBeVisible({ timeout: 30_000 });
  });

  test("zaproszenie → akceptacja → powiadomienie w dzwonku", async ({ browser }) => {
    const fanAContext = await browser.newContext();
    const fanBContext = await browser.newContext();
    const fanAPage = await fanAContext.newPage();
    const fanBPage = await fanBContext.newPage();

    await signInAsFan(fanAPage);
    await fanAPage.goto("/team");

    await fanAPage.getByLabel("Login fana").fill(fanBLogin);
    await fanAPage.getByRole("button", { name: "Wyślij zaproszenie" }).click();
    await expect(fanAPage.getByText("Zaproszenie wysłane.")).toBeVisible({ timeout: 30_000 });

    await signInAsSecondFan(fanBPage);
    await fanBPage.goto("/team");

    await expect(fanBPage.getByRole("button", { name: "Akceptuj" })).toBeVisible({ timeout: 30_000 });
    await fanBPage.getByRole("button", { name: "Akceptuj" }).click();
    await expect(fanBPage.getByText("Zaproszenie zaakceptowane.")).toBeVisible({ timeout: 30_000 });

    await signInAsFan(fanAPage);
    await fanAPage.goto("/events");

    const bell = fanAPage.getByRole("button", { name: /Powiadomienia/i });
    await expect(bell).toBeVisible({ timeout: 30_000 });
    await bell.click();
    await expect(fanAPage.getByText(/zaakceptował/i)).toBeVisible({ timeout: 30_000 });

    await fanAContext.close();
    await fanBContext.close();
  });
});
