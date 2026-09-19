import { expect, test } from '@playwright/test';
import { expectReloadMatchesTodayButton } from './todayPosition';

// The floating controls fold behind pills below xl, so these run at phone size.

const foldPill = 'button[aria-controls="timeline-tags"]:visible';

// Whether the page moves under a wheel, rather than how it is held still.
// A scripted scrollTo would not do: overflow:hidden stops the reader
// scrolling but still lets script move the page.
async function scrolls(page: import('@playwright/test').Page) {
  const from = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(250);
  return (await page.evaluate(() => window.scrollY)) !== from;
}

test('picking a category and shutting the fold leaves the page scrolling', async ({ page }) => {
  await page.goto('/');
  await page.locator(foldPill).first().click();
  // The tag cloud's tags (categories lead it), not the chevrons that unfold a group.
  const pills = page.getByRole('group', { name: 'Filter by tag' }).locator('button[aria-pressed]');
  await expect(pills.first()).toBeVisible();
  // The page is held still while the fold covers it.
  expect(await scrolls(page)).toBe(false);

  // A pick searches for that category, which leaves the timeline page mounted
  // and hidden for a moment - dimmer and all - behind the results.
  await pills.first().click();
  await expect(page).toHaveURL(/\/search\?/);
  await expect(page.locator(foldPill).first()).toBeVisible();

  // Shutting the fold gives the page back, the hidden one's dimmer included.
  await page.locator(foldPill).first().click();
  await expect.poll(() => scrolls(page)).toBe(true);
});

test('a card on the timeline pictures its video instead of loading the player', async ({ page }) => {
  await page.goto('/');
  // A still under a play badge, and no player anywhere: an iframe in the
  // markup is already a download, so the card must never write one.
  await expect(page.getByRole('img', { name: "Play on the pin's page" }).first()).toBeVisible();
  await expect(page.locator('iframe[src*="youtube.com"]')).toHaveCount(0);

  // The pin's own page still plays it. A card's link: the trending panel's
  // come first in the page but are hidden at this width.
  await page.locator('article a[href^="/pin/"]').first().click();
  await expect(page).toHaveURL(/\/pin\//);
});

test('opening or reloading the timeline puts today where the Today button does', async ({ page }) => {
  await expectReloadMatchesTodayButton(page);
});
