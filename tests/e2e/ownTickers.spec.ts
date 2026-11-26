import { expect, test, type Page } from '@playwright/test';

// "Add my ticker" on /trades: signed out, Add goes to log in, comes back and
// adds what was typed. Reads live prices to accept the symbol.

const stamp = Date.now().toString(36);
const email = `e2e-ticker-${stamp}@example.com`;
const password = 'correct horse battery';

test.beforeAll(async ({ playwright, baseURL }) => {
  const api = await playwright.request.newContext({ baseURL });
  const res = await api.post('/api/users', { data: { userName: `@e2etick${stamp}`, firstName: 'Ticker', lastName: 'Test', email, password } });
  expect(res.ok(), 'signing up').toBeTruthy();
  await api.dispose();
});

const box = (page: Page) => page.getByRole('textbox', { name: 'Add my ticker' });
const add = (page: Page) => page.getByRole('button', { name: 'Add', exact: true });
const mine = (page: Page) => page.getByRole('list', { name: 'Your tickers' });

test('Add sends a visitor to log in, then adds the ticker on the way back', async ({ page }) => {
  await page.goto('/trades');
  await expect(add(page)).toBeEnabled();
  await expect(mine(page)).toHaveCount(0);

  await box(page).fill('msft');
  await add(page).click();
  await expect(page).toHaveURL(/\/login\?redirect=%2Ftrades/);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page).toHaveURL(/\/trades$/);
  await expect(mine(page).getByRole('link', { name: 'MSFT' })).toBeVisible({ timeout: 30_000 });
  // Saved to the account, so it is there after a reload.
  await page.reload();
  await expect(mine(page).getByRole('link', { name: 'MSFT' })).toBeVisible();

  await page.getByRole('button', { name: 'Remove MSFT' }).click();
  await expect(mine(page)).toHaveCount(0);
  const saved = await page.request.get('/api/own-tickers');
  expect(await saved.json()).toEqual({ symbols: [] });
});
