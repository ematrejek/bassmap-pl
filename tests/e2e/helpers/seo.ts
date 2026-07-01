import { expect, type Page } from "@playwright/test";

export async function getMetaDescription(page: Page): Promise<string> {
  const content = await page.locator('meta[name="description"]').getAttribute("content");
  expect(content).toBeTruthy();
  return content ?? "";
}

export async function expectOgTags(page: Page): Promise<void> {
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /.+/u);
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content", /.+/u);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /^https?:\/\//u);
}
