import { expect, type Page } from '@playwright/test';

// Shared by the desktop and phone checks that the timeline opens where its
// Today button goes.

// Where the TODAY tag sits in the viewport once the page has stopped moving:
// cards above it keep growing for a moment after the first scroll (details
// that only render in the browser, embeds, pictures), so a single reading
// straight after load can miss the drift this is here to catch.
export async function settledTodayTop(page: Page) {
  const marker = page.locator('#today-marker');
  await expect(marker).toBeVisible();
  let last = Number.NaN;
  await expect
    .poll(
      async () => {
        const top = await marker.evaluate((el) => Math.round(el.getBoundingClientRect().top));
        const settled = top === last;
        last = top;
        return settled;
      },
      { intervals: [750], timeout: 20_000 },
    )
    .toBe(true);
  return last;
}

export async function expectReloadMatchesTodayButton(page: Page) {
  await page.goto('/');
  const onLoad = await settledTodayTop(page);

  await page.reload();
  const onReload = await settledTodayTop(page);

  // Somewhere else first, so the button has to bring today back.
  await page.mouse.wheel(0, -2500);
  await expect.poll(() => page.locator('#today-marker').evaluate((el) => el.getBoundingClientRect().top)).toBeGreaterThan(1000);
  await page.locator('button:visible', { hasText: /^Today$/ }).first().click();
  const onToday = await settledTodayTop(page);

  expect(Math.abs(onLoad - onToday), `opened with TODAY at ${onLoad}px, the Today button put it at ${onToday}px`).toBeLessThanOrEqual(1);
  expect(Math.abs(onReload - onToday), `reloaded with TODAY at ${onReload}px, the Today button put it at ${onToday}px`).toBeLessThanOrEqual(1);
}
