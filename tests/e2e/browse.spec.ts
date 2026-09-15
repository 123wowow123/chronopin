import { expect, test } from '@playwright/test';

test('the timeline opens on today and loads earlier pins when scrolled up', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#today-marker, [id^="day-"]').first()).toBeVisible();
  const before = await page.locator('article').count();
  expect(before).toBeGreaterThan(0);

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(async () => page.locator('article').count(), { timeout: 15_000 }).toBeGreaterThan(before);
});

test('a pin card opens its page, and a label searches for its company', async ({ page }) => {
  await page.goto('/search?q=company:Apple');
  const card = page.locator('article').first();
  await expect(card).toBeVisible();
  const title = await card.locator('h2').innerText();
  await card.locator('h2 a').click();
  await expect(page).toHaveURL(/\/pin\/\d+\//);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(title);
});

test('the map plots pins', async ({ page }) => {
  await page.goto('/map');
  await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible({ timeout: 20_000 });
});
