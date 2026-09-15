import { expect, test } from '@playwright/test';

// The floating controls fold behind pills below xl, so these run at phone size.

const foldPill = 'button[aria-controls="timeline-category"]:visible';

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
  const pills = page.getByRole('group', { name: 'Filter by category' }).getByRole('button');
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
