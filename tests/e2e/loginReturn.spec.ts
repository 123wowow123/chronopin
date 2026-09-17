import { expect, test, type Page } from '@playwright/test';

const stamp = Date.now().toString(36);
const handle = `e2er${stamp}`;
const email = `e2e-return-${stamp}@example.com`;
const password = 'correct horse battery';

// The highest card on screen below the navbar, and how far down the window it is.
function cardAtTop(page: Page) {
  return page.evaluate(() => {
    const covered = document.querySelector('header')!.getBoundingClientRect().bottom;
    let best: { id: string; top: number } | null = null;
    for (const el of document.querySelectorAll<HTMLElement>('[role="listitem"][id^="pin-"]')) {
      const rect = el.getBoundingClientRect();
      if (!rect.height || rect.bottom <= covered || rect.top >= window.innerHeight) continue;
      if (!best || rect.top < best.top) best = { id: el.id, top: rect.top };
    }
    return best!;
  });
}

// Well past the first page, so the card is not one the plain timeline loads.
async function scrollFarFromToday(page: Page) {
  await page.goto('/');
  await expect(page.locator('[role="listitem"][id^="pin-"]').first()).toBeVisible();
  await page.mouse.move(400, 400);
  for (let i = 0; i < 30; i++) {
    await page.mouse.wheel(0, 1500);
    await page.waitForTimeout(150);
  }
  await page.mouse.wheel(0, 100);
  await page.waitForTimeout(1000);
  const before = await cardAtTop(page);
  expect(before).not.toBeNull();
  return before;
}

async function expectBackAt(page: Page, before: { id: string; top: number }) {
  await expect(page).toHaveURL(new RegExp(`/\\?(.*&)?pin=${before.id.slice('pin-'.length)}`));
  const card = page.locator(`#${before.id}`);
  await expect(card).toBeVisible();
  // Once the cards above it have settled.
  await expect.poll(async () => Math.abs((await card.boundingBox())!.y - before.top), { timeout: 15_000 }).toBeLessThanOrEqual(2);
}

// Logging in or signing up reloads the whole page, which used to open the
// timeline back on today however far the reader had scrolled from it.
test.describe.serial('leaving the timeline to sign in', () => {
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
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Log in' }).click();
    await expect(page).toHaveURL(/\/login\?redirect=/);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Login' }).click();
    await expectBackAt(page, before);
  });
});
