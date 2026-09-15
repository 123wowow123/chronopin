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

test('search results page in as they are scrolled, by date and by relevance', async ({ page }) => {
  // Every pin a curator account posted: several pages' worth in the seed data,
  // most of them before today.
  await page.goto('/search?q=user:@GameDesk');
  const dateCards = page.locator('[class*="lg:before:left"] article');
  await expect(dateCards.first()).toBeVisible();
  const firstPage = await dateCards.count();

  // Each scroll to the top brings in an earlier page.
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => dateCards.count(), { timeout: 15_000 }).toBeGreaterThan(firstPage);
  const secondPage = await dateCards.count();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => dateCards.count(), { timeout: 15_000 }).toBeGreaterThan(secondPage);

  await page.getByRole('button', { name: 'relevance' }).first().click();
  await expect(page).toHaveURL(/sort=relevance/);
  const ranked = page.locator('ul:visible > li > article');
  await expect(ranked).toHaveCount(24);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => ranked.count(), { timeout: 15_000 }).toBeGreaterThan(24);

  const hrefs = await ranked.locator('h2 a').evaluateAll((links) => links.map((a) => a.getAttribute('href')));
  expect(new Set(hrefs).size).toBe(hrefs.length);
});

test('the map plots pins', async ({ page }) => {
  await page.goto('/map');
  await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible({ timeout: 20_000 });
});
