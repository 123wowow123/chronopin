import { expect, test } from '@playwright/test';
import { expectReloadMatchesTodayButton } from './todayPosition';

// Below lg the filters ride in the nav drawer, so these run at phone size.

// The tag panel's header row inside the drawer.
const tagsRow = 'button[aria-label^="Tags:"]';

// Whether the page moves under a wheel, rather than how it is held still.
// A scripted scrollTo would not do: overflow:hidden stops the reader
// scrolling but still lets script move the page.
async function scrolls(page: import('@playwright/test').Page) {
  const from = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(250);
  return (await page.evaluate(() => window.scrollY)) !== from;
}

test('picking a category in the drawer searches for it and gives the page back', async ({ page }) => {
  await page.goto('/');
  const drawer = page.getByRole('dialog', { name: 'Menu' });
  await page.getByRole('button', { name: /open menu/i }).click();
  await expect(drawer).toBeVisible();
  // The filters are the page's own panels, lent to the drawer.
  await drawer.locator(tagsRow).click();
  // The tag cloud's tags (categories lead it), not the chevrons that unfold a group.
  const pills = drawer.getByRole('group', { name: 'Filter by tag' }).locator('button[aria-pressed]');
  await expect(pills.first()).toBeVisible();
  // The page is held still while the drawer covers it.
  expect(await scrolls(page)).toBe(false);

  // A pick searches for that category, which leaves the timeline page mounted
  // and hidden for a moment behind the results - and puts the drawer away.
  await pills.first().click();
  await expect(page).toHaveURL(/\/search\?/);
  await expect(drawer).toBeHidden();
  await expect.poll(() => scrolls(page)).toBe(true);

  // The results' own filters are in the drawer now, saying what is picked.
  await page.getByRole('button', { name: /open menu/i }).click();
  await expect(drawer.locator(tagsRow)).not.toHaveAttribute('aria-label', 'Tags: All');
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
