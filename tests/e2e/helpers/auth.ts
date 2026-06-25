import type { Page } from "@playwright/test";

import {
  INTEGRATION_ADMIN_EMAIL,
  INTEGRATION_ADMIN_PASSWORD,
  INTEGRATION_NON_ADMIN_EMAIL,
  INTEGRATION_NON_ADMIN_PASSWORD,
} from "../../helpers/supabase";
import { E2E_FRIENDS_FAN_B_EMAIL, E2E_FRIENDS_FAN_B_PASSWORD } from "./friends-fixture";

export async function signInAsAdmin(page: Page): Promise<void> {
  await signIn(page, INTEGRATION_ADMIN_EMAIL, INTEGRATION_ADMIN_PASSWORD);
}

export async function signInAsFan(page: Page): Promise<void> {
  await signIn(page, INTEGRATION_NON_ADMIN_EMAIL, INTEGRATION_NON_ADMIN_PASSWORD);
}

export async function signInAsSecondFan(page: Page): Promise<void> {
  await signIn(page, E2E_FRIENDS_FAN_B_EMAIL, E2E_FRIENDS_FAN_B_PASSWORD);
}

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/auth/signin");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Hasło").fill(password);
  await page.getByRole("button", { name: "Zaloguj się" }).click();

  try {
    await page.waitForURL((url) => !url.pathname.startsWith("/auth/signin"), { timeout: 30_000 });
  } catch {
    const errorText = (await page.locator("p.text-red-300").first().textContent())?.trim();
    throw new Error(
      errorText ?? "Logowanie nie powiodło się – nadal na /auth/signin (sprawdź Supabase w .dev.vars / CI)",
    );
  }
}
