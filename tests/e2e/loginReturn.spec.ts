import { expect, test, type Page } from '@playwright/test';

const stamp = Date.now().toString(36);
const handle = `e2er${stamp}`;
const email = `e2e-return-${stamp}@example.com`;
const password = 'correct horse battery';

// The highest card on screen below the navbar, and how far down the window it is.
function cardAtTop(page: Page) {
  return page.evaluate(() => {
    const covered = Math.max(...[...document.querySelectorAll('header, [data-sticky-sort]')].map((el) => el.getBoundingClientRect().bottom));
    let best: { id: string; top: number } | null = null;
    for (const el of document.querySelectorAll<HTMLElement>('[role="listitem"][id^="pin-"], li[id^="rank-"]')) {
      const rect = el.getBoundingClientRect();
      if (!rect.height || rect.bottom <= covered || rect.top >= window.innerHeight) continue;
      if (!best || rect.top < best.top) best = { id: el.id, top: rect.top };
    }
    return best!;
  });
}

// Well past the first page, so the card is not one the page opens with.
async function scrollFarFromToday(page: Page, path = '/', direction: 1 | -1 = 1) {
  await page.goto(path);
  const cards = page.locator('[role="listitem"][id^="pin-"], li[id^="rank-"]');
  await expect(cards.first()).toBeVisible();
  const opened = await cards.evaluateAll((els) => els.map((el) => el.id));
  await page.mouse.move(400, 400);
  for (let i = 0; i < 30; i++) {
    await page.mouse.wheel(0, 1500 * direction);
    await page.waitForTimeout(150);
  }
  await page.mouse.wheel(0, 100 * direction);
  await page.waitForTimeout(1000);
  const before = await cardAtTop(page);
  expect(before).not.toBeNull();
  expect(opened, 'the card should be one only paging reaches').not.toContain(before.id);
  return before;
}

async function logIn(page: Page) {
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/login\?redirect=/);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
}

async function expectBackAt(page: Page, before: { id: string; top: number }, url?: string) {
  if (url) await expect(page).toHaveURL(url);
  else await expect(page).toHaveURL(new RegExp(`/\\?(.*&)?pin=${before.id.slice('pin-'.length)}`));
  const card = page.locator(`#${before.id}`);
  await expect(card).toBeVisible();
  // Once the cards above it have settled.
  await expect.poll(async () => Math.abs((await card.boundingBox())!.y - before.top), { timeout: 15_000 }).toBeLessThanOrEqual(2);
}

// Logging in or signing up reloads the whole page, which used to open the
// timeline and search back on today (or the best match) however far the reader
// had scrolled, and the map on its default view.
test.describe.serial('leaving a page to sign in', () => {
  test('creating an account from the login page comes back to the card scrolled to', async ({ page }) => {
    const before = await scrollFarFromToday(page);
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Log in' }).click();
    await page.getByRole('link', { name: 'Create an account' }).click();
    await expect(page).toHaveURL(/\/signup\?redirect=/);
    await page.getByLabel('User Handle').fill(handle);
    await page.getByLabel('First Name').fill('End');
    await page.getByLabel('Last Name').fill('ToEnd');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByLabel('Confirm Password').fill(password);
    await page.getByRole('button', { name: 'Sign up' }).click();
    await expect(page.getByRole('button', { name: `@${handle}` })).toBeVisible();
    await expectBackAt(page, before);
  });

  test('logging in comes back to the card scrolled to', async ({ page }) => {
    const before = await scrollFarFromToday(page);
    await logIn(page);
    await expectBackAt(page, before);
  });

  // Search has no ?pin= to open on, so its results page toward the card.
  for (const sort of ['date', 'relevance']) {
    test(`logging in from a search by ${sort} comes back to the card scrolled to`, async ({ page, baseURL }) => {
      const path = `/search?q=category%3AAnime&posted=all${sort === 'relevance' ? '&sort=relevance' : ''}`;
      // Most anime has aired: by date, the pages are behind today.
      const before = await scrollFarFromToday(page, path, sort === 'date' ? -1 : 1);
      const url = page.url();
      await logIn(page);
      await expectBackAt(page, before, url);
      expect(new URL(url, baseURL).search).toBe(new URL(page.url()).search);
    });
  }

  test('logging in from the map comes back to the same view', async ({ page }) => {
    await page.goto('/map?past=all&future=all&posted=all');
    const markers = page.locator('.leaflet-marker-icon');
    await expect(markers.first()).toBeVisible();
    const canvas = page.locator('.pins-map');
    const box = (await canvas.boundingBox())!;
    // Somewhere other than the default view: zoomed in off-centre.
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.4);
    for (let i = 0; i < 3; i++) {
      await page.mouse.wheel(0, -300);
      await page.waitForTimeout(400);
    }
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.6, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(800);
    const view = () =>
      page.evaluate(() => {
        const visible = [...document.querySelectorAll<HTMLElement>('.leaflet-marker-icon')]
          .map((el) => ({ title: el.title, rect: el.getBoundingClientRect() }))
          .filter(({ rect }) => rect.top > 60 && rect.bottom < window.innerHeight && rect.left > 0 && rect.right < window.innerWidth);
        return visible.map(({ title, rect }) => ({ title, x: Math.round(rect.x), y: Math.round(rect.y) }));
      });
    const before = await view();
    expect(before.length).toBeGreaterThan(0);
    const url = page.url();
    await logIn(page);
    await expect(page).toHaveURL(url);
    const marker = markers.and(page.locator(`[title="${before[0].title.replace(/"/g, '\\"')}"]`)).first();
    await expect(marker).toBeVisible();
    await expect.poll(async () => {
      const at = (await marker.boundingBox())!;
      return Math.abs(at.x - before[0].x) + Math.abs(at.y - before[0].y);
    }).toBeLessThanOrEqual(2);
  });
});
