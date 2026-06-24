import { expect, type Page } from "@playwright/test";

export function futureDatetimeLocal(daysFromNow = 45): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${String(year)}-${month}-${day}T20:00`;
}

export function uniqueE2eName(label: string): string {
  return `e2e-${label}-${String(Date.now())}`;
}

export interface MinimalEventFormInput {
  name: string;
  city?: string;
  venueName?: string;
  startsAt?: string;
  latitude?: string;
  longitude?: string;
  subgenreLabel?: string;
}

export async function fillCoordinatesEventForm(page: Page, input: MinimalEventFormInput): Promise<void> {
  await page.getByLabel("Nazwa wydarzenia").fill(input.name);
  await page.locator("#startsAt").fill(input.startsAt ?? futureDatetimeLocal());
  await page.getByLabel("Miasto").fill(input.city ?? "E2E City");
  await page.getByLabel("Miejsce / opis lokalizacji").fill(input.venueName ?? "E2E Venue");
  await page.locator("#coordinatesMode").click();
  await expect(page.locator("#latitude")).toBeVisible();
  await page.locator("#latitude").fill(input.latitude ?? "52.2297");
  await page.locator("#longitude").fill(input.longitude ?? "21.0122");
  await page.getByText(input.subgenreLabel ?? "Neurofunk", { exact: true }).click();
  await page.getByLabel("Wstęp wolny").click();
}

export async function submitEventForm(page: Page, submitLabel: string): Promise<void> {
  await page.getByRole("button", { name: submitLabel }).click();

  const duplicateDialog = page.getByRole("alertdialog");
  const hasDuplicate = await duplicateDialog
    .waitFor({ state: "visible", timeout: 5_000 })
    .then(() => true)
    .catch(() => false);

  if (hasDuplicate) {
    const forceSubmit = page.getByRole("button", { name: /mimo to/i });
    await forceSubmit.click();
  }
}

export async function acceptFanContentRights(page: Page): Promise<void> {
  await page.getByLabel(/Oświadczam, że publikuję zgodnie z/).click();
}
