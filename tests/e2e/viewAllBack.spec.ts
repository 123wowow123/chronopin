import { expect, test, type Locator, type Page } from '@playwright/test';

// "View all" under a crowded day opens the whole day as a date: search, and
// that page's "Back to timeline" pill returns to the spot the timeline was
// left at (src/lib/client/dayReturn.ts): through history while the timeline
// is still kept behind the search, and after a reload of the search by
// opening the timeline on the card that was at the top of the window.
//
// Card dates link to date: searches too, so the link is found by its words.

async function viewAllOnScreen(page: Page): Promise<Locator> {
  await page.goto('/');
  await expect(page.locator('article').first()).toBeVisible();
  for (let i = 0; i < 40; i++) {
    const links = page.locator('a[href*="/search?q=date%3A"]', { hasText: 'View all' }).filter({ visible: true });
    for (let k = 0; k < (await links.count()); k++) {
      const box = await links.nth(k).boundingBox();
      if (box && box.y > 150 && box.y < 600) return links.nth(k);
    }
    await page.mouse.wheel(0, 700);
    await page.waitForTimeout(300);
  }
  throw new Error('no "View all" link on the timeline');
}

// The highest card still showing below the header, and how far down it sits.
const cardAtTop = (page: Page) =>
  page.evaluate(() => {
    let best: { id: string; top: number } | null = null;
    for (const el of document.querySelectorAll<HTMLElement>('[role="listitem"][id^="pin-"]')) {
      const rect = el.getBoundingClientRect();
      if (!rect.height || rect.bottom <= 60 || rect.top >= innerHeight) continue;
      if (!best || rect.top < best.top) best = { id: el.id, top: Math.round(rect.top) };
    }
    return best;
  });

test.use({ viewport: { width: 900, height: 900 } });

test("a day's search opened from View all goes back to the same spot on the timeline", async ({ page }) => {
  const link = await viewAllOnScreen(page);
  const href = await link.getAttribute('href');
  const card = await cardAtTop(page);

  await link.click();
  await page.waitForURL(/\/search\?/);
  const pill = page.getByRole('button', { name: 'Back to timeline' });
  await expect(pill).toBeVisible();

  // Still in reach once the day has been scrolled.
  await page.mouse.wheel(0, 1500);
  await expect(pill).toBeInViewport();

  await pill.click();
  await page.waitForURL((url) => url.pathname === '/');
  // The same card leads the window, as far down it as it was. What is above
  // it can settle while the timeline is hidden (a page loaded above, whose
  // height the timeline takes out of the scroll to keep the view still; an
  // image, a live count), so the scroll position may move to hold the card
  // still, and a few pixels of drift are allowed.
  await expect.poll(async () => (await cardAtTop(page))?.id).toBe(card!.id);
  const back = await cardAtTop(page);
  expect(Math.abs(back!.top - card!.top)).toBeLessThanOrEqual(24);

  // Reached directly, the day's search has no timeline spot behind it.
  await page.goto(href!);
  await expect(page.locator('article').first()).toBeVisible();
  await expect(pill).toHaveCount(0);
});

test('after a reload of the search, the pill opens the timeline on the card it left', async ({ page }) => {
  const link = await viewAllOnScreen(page);
  const card = await cardAtTop(page);

  await link.click();
  await page.waitForURL(/\/search\?/);
  await page.reload();
  await page.getByRole('button', { name: 'Back to timeline' }).click();

  await page.waitForURL((url) => url.pathname === '/' && url.searchParams.get('pin') === card!.id.slice('pin-'.length));
  // Put back as far down the window as it was, give or take a pixel of layout.
  await expect.poll(async () => Math.abs(((await cardAtTop(page))?.top ?? 1e6) - card!.top)).toBeLessThanOrEqual(2);
  expect((await cardAtTop(page))?.id).toBe(card!.id);
});
