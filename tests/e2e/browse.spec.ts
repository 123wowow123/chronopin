import { expect, test } from '@playwright/test';

test('the timeline opens on today and loads earlier pins when scrolled up', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#today-marker, [id^="day-"]').first()).toBeVisible();
  const before = await page.locator('article').count();
  expect(before).toBeGreaterThan(0);

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(async () => page.locator('article').count(), { timeout: 15_000 }).toBeGreaterThan(before);
});

test('a wide screen swaps the still on a card for the player', async ({ page }) => {
  // The server cannot know the screen, so every card is written with the
  // still; a wide one mounts the players once it hydrates.
  await page.goto('/search?q=category:Anime');
  await expect(page.locator('article').first()).toBeVisible();
  await expect(page.locator('iframe[src*="youtube.com"]').first()).toBeAttached({ timeout: 15_000 });
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

// The timeline and the results share one loading boundary, so a pick keeps the
// pins it was made over on screen until the search is in.
test('picking a category searches without blanking the page', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('article').first()).toBeVisible();
  await page.getByRole('button', { name: /^Category:/ }).click();
  const pills = page.getByRole('group', { name: 'Filter by category' }).getByRole('button');
  await expect(pills.first()).toBeVisible();

  // Every frame from the click to the results: a page of its own for the
  // search would put an empty one between them for as long as it took.
  await page.evaluate(() => {
    const counter = Object.assign(window, { blankFrames: 0 });
    const tick = () => {
      const card = document.querySelector('article');
      if (!card || !card.getClientRects().length) counter.blankFrames += 1;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  await pills.first().click();
  await expect(page).toHaveURL(/\/search\?q=category/);
  await expect(pills.first()).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { blankFrames: number }).blankFrames)).toBe(0);
});

test('the map plots pins', async ({ page }) => {
  await page.goto('/map');
  await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible({ timeout: 20_000 });
});
