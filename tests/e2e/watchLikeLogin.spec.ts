import { expect, request, test, type Locator, type Page } from '@playwright/test';

const stamp = Date.now().toString(36);
const email = `e2e-watchlike-${stamp}@example.com`;
const password = 'correct horse battery';

test.beforeAll(async ({ baseURL }) => {
  const api = await request.newContext({ baseURL });
  const signup = await api.post('/api/users', {
    data: { userName: `@e2ewl${stamp}`, firstName: 'Watch', lastName: 'Like', email, password },
  });
  expect(signup.ok()).toBe(true);
  await api.dispose();
});

async function finishLogin(page: Page, button: Locator) {
  const originalUrl = page.url();
  await button.click();
  await expect(page).toHaveURL(/\/login\?redirect=/);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
  // Timeline login may add ?pin= to restore the card's position.
  const original = new URL(originalUrl);
  await expect.poll(() => new URL(page.url()).pathname).toBe(original.pathname);
  if (original.pathname !== '/') await expect(page).toHaveURL(originalUrl);
}

for (const location of ['timeline', 'search', 'detail'] as const) {
  for (const action of ['watch', 'like'] as const) {
    test(`${action} from ${location} finishes after login and survives reload`, async ({ page }) => {
      await page.goto(location === 'search' ? '/search?q=category%3AAnime&posted=all' : '/');
      if (location === 'timeline') {
        const href = await page.locator('[role="listitem"][id^="pin-"] h2 a').first().getAttribute('href');
        const pinId = href!.match(/\/pin\/(\d+)\//)![1];
        await page.goto(`/?pin=${pinId}`);
      }
      if (location === 'detail') {
        await page.locator('[role="listitem"][id^="pin-"] h2 a').first().click();
        await page.waitForURL(/\/pin\/\d+\//);
      }
      await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Log in' })).toBeVisible({ timeout: 15_000 });
      const first = page.locator('article').first();
      const pinHref = await first.locator('h1 a, h2 a').first().getAttribute('href');
      const article = location === 'detail' ? first : page.locator('article').filter({ has: page.locator(`h2 a[href="${pinHref}"]`) }).first();
      const start = action === 'watch' ? /^Watch this pin/ : /^Like this pin/;
      const stop = action === 'watch' ? /^Stop watching \(/ : /^Unlike this pin/;
      // Remember the exact card, even if login changes the first timeline card.
      await finishLogin(page, article.getByRole('button', { name: start }));
      const back = article;
      const active = back.getByRole('button', { name: stop });
      await expect(active).toHaveAttribute('aria-pressed', 'true');
      await expect(active).toBeInViewport();
      await page.reload();
      await expect(active).toHaveAttribute('aria-pressed', 'true');
      await active.click();
      await expect(back.getByRole('button', { name: start })).toHaveAttribute('aria-pressed', 'false');
    });
  }
}

for (const all of [false, true]) {
  test(`${all ? 'all' : 'person'} trade watch finishes after login and survives reload`, async ({ page }) => {
    await page.goto(all ? '/people' : '/person/nancy-pelosi');
    const start = all ? 'Notify me of all trades' : 'Notify me of trades';
    const title = all ? 'Stop notifications about all stock trades' : 'Stop notifications about Nancy Pelosi’s stock trades';
    await finishLogin(page, page.getByRole('button', { name: start, exact: true }));
    const active = page.getByTitle(title, { exact: true });
    await expect(active).toHaveAttribute('aria-pressed', 'true');
    await expect(active).toBeInViewport();
    await page.reload();
    await expect(active).toHaveAttribute('aria-pressed', 'true');
    await active.click();
    await expect(page.getByRole('button', { name: start, exact: true })).toHaveAttribute('aria-pressed', 'false');
  });
}
