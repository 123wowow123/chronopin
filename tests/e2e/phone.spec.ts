import { expect, test } from '@playwright/test';
import { expectReloadMatchesTodayButton } from './todayPosition';

// Below lg the filters ride in the nav drawer, so these run at phone size.

// The tag panel's header row, which the drawer does not carry.
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

test('the drawer lends the page its filters, but not the tag cloud', async ({ page }) => {
  await page.goto('/');
  const drawer = page.getByRole('dialog', { name: 'Menu' });
  await page.getByRole('button', { name: /open menu/i }).click();
  await expect(drawer).toBeVisible();
  // The filters are the page's own panels, lent to the drawer: the sliders,
  // and not the tag cloud, which needs a column to be read in.
  await expect(drawer.locator('button[aria-label^="Posted within"]')).toBeVisible();
  await expect(drawer.locator(tagsRow)).toHaveCount(0);
  // The page is held still while the drawer covers it, and moves again after.
  expect(await scrolls(page)).toBe(false);
  // The drawer's own menu button stands exactly where the one that opened it
  // does, so its three lines come to rest over that button's three.
  const trigger = page.getByRole('button', { name: /open menu/i });
  const inDrawer = drawer.getByRole('button', { name: /^close menu$/i }).first();
  expect(await inDrawer.boundingBox()).toEqual(await trigger.boundingBox());

  // Two close it: the menu button in its open state at the head of the
  // drawer (three lines where the logo was), and the cross opposite it.
  await expect(drawer.getByRole('button', { name: /^close menu$/i })).toHaveCount(2);
  await drawer.getByRole('button', { name: /^close menu$/i }).first().click();
  await expect(drawer).toBeHidden();
  await expect.poll(() => scrolls(page)).toBe(true);
});

// A search started from the page leaves the timeline mounted and hidden for a
// moment behind the results, rather than blanking the screen between them.
test("tapping a card's category searches for it and gives the page back", async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('article').first()).toBeVisible();
  // A card's category label: a plain search for the pins sharing it.
  await page.locator('article a[href*="q=tag%3A"]').first().click();
  await expect(page).toHaveURL(/\/search\?/);
  await expect(page.locator('article').first()).toBeVisible();
  await expect.poll(() => scrolls(page)).toBe(true);
});

// The sort bar used to be pinned under the navbar, where it took the top of
// every result page; on a phone it rides in the bottom left corner instead.
test('the sort rides in the bottom left corner, not over the results', async ({ page }) => {
  await page.goto('/search?q=anime');
  await expect(page.locator('article').first()).toBeVisible();
  // One of the three SortToggles is shown at this width: the floating one.
  const sort = page.getByRole('group', { name: 'Sort results by' });
  await expect(sort).toHaveCount(1);
  const box = (await sort.boundingBox())!;
  const view = page.viewportSize()!;
  expect(box.y).toBeGreaterThan(view.height / 2);
  // The left corner: "Today" keeps the right one.
  expect(box.x).toBeLessThan(view.width / 2 - box.width / 2);

  // It sorts from there, and stays where it is.
  await sort.getByRole('button', { name: 'Date' }).click();
  await expect(page).toHaveURL(/sort=date/);
  await expect(sort.getByRole('button', { name: 'Date' })).toHaveAttribute('aria-pressed', 'true');
  const moved = (await sort.boundingBox())!;
  expect(moved.y).toBeGreaterThan(view.height / 2);
  // Sorting by date brings "Today" up beside it, which must not push it over.
  await expect(page.getByRole('button', { name: 'Today' })).toBeVisible();
  expect(moved.x).toBe(box.x);
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

// The account's pages are opened from the drawer, and each has an arrow back
// to it: the page the drawer was open over, with the drawer open again. Signed
// in as a throwaway account (the run's teardown removes it), since all three
// pages are an account's.
test.describe('the arrow back to the drawer', () => {
  // An account per test: each starts signed out in a browser of its own, and
  // a handle can be taken only once.
  test.beforeEach(async ({ page }, testInfo) => {
    const stamp = `${Date.now().toString(36)}${testInfo.testId.slice(0, 4)}`;
    await page.goto('/signup');
    await page.getByLabel('User Handle').fill(`e2eback${stamp}`);
    await page.getByLabel('First Name').fill('End');
    await page.getByLabel('Last Name').fill('ToEnd');
    await page.getByLabel('Email').fill(`e2e-back-${stamp}@example.com`);
    await page.getByLabel('Password', { exact: true }).fill('correct horse battery');
    await page.getByLabel('Confirm Password').fill('correct horse battery');
    await page.getByRole('button', { name: 'Sign up' }).click();
    await expect(page).not.toHaveURL(/\/signup/);
  });

  for (const [row, path] of [
    [/Profile & settings/, /\/profile$/],
    [/Notifications/, /\/notifications$/],
  ] as const) {
    test(`goes from ${path.source.replace(/\\|\$/g, '')} to the page the drawer was open over`, async ({ page }) => {
      await page.goto('/search?q=anime');
      await expect(page.locator('article').first()).toBeVisible();
      const drawer = page.getByRole('dialog', { name: 'Menu' });
      await page.getByRole('button', { name: /open menu/i }).click();
      await drawer.getByRole('link', { name: row }).click();
      await expect(page).toHaveURL(path);
      await expect(drawer).toBeHidden();

      // The arrow leads the title's line: the profile's is its row of tabs,
      // the picked one standing for the title.
      const back = page.getByRole('button', { name: 'Back to the menu' });
      const title = /profile/.test(path.source) ? page.getByRole('navigation', { name: 'Profile' }).locator('[aria-current="page"]') : page.getByRole('heading', { level: 1 });
      const [arrow, heading] = [(await back.boundingBox())!, (await title.boundingBox())!];
      expect(Math.abs(arrow.y + arrow.height / 2 - (heading.y + heading.height / 2))).toBeLessThan(4);

      await back.click();
      await expect(page).toHaveURL(/\/search\?q=anime/);
      await expect(drawer).toBeVisible();
    });
  }

  // Reached without the drawer, there is no page behind to go back to: the
  // arrow opens the drawer over the timeline.
  test('opens the drawer over the timeline when the page was reached directly', async ({ page }) => {
    await page.goto('/profile');
    await page.getByRole('button', { name: 'Back to the menu' }).click();
    await expect(page).toHaveURL((url) => url.pathname === '/');
    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible();

    // And a later change of page, not through the arrow, leaves it shut.
    await page.getByRole('dialog', { name: 'Menu' }).getByRole('button', { name: /^close menu$/i }).first().click();
    await page.goto('/map');
    await page.waitForTimeout(500);
    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeHidden();
  });
});
