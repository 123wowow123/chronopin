import { execFile } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, request, test } from '@playwright/test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const stamp = Date.now().toString(36);
const handle = `e2elang${stamp}`;
const email = `e2e-lang-${stamp}@example.com`;
const password = 'correct horse battery';

// The other languages are an admin setting, off by default (src/lib/multilingual.ts):
// off, /es and the rest go to English. This spec turns it on through the admin
// route, as a throwaway admin, since the route also tells the running proxy at
// once; afterwards the setting's row goes back exactly as it was (or away, if
// it was never set) through scripts/data/e2eAppSetting.ts, not the route,
// which would sign it with the throwaway admin.
const run = (args: string[]) => promisify(execFile)('npx', ['tsx', ...args], { cwd: root }).then((r) => r.stdout);
let savedSetting: string | undefined;

test.beforeAll(async ({ baseURL }) => {
  // The row as JSON, or null: the one output line that is either.
  savedSetting = (await run(['scripts/data/e2eAppSetting.ts', 'get', 'multilingual'])).split('\n').find((line) => /^(\{|null$)/.test(line));
  const api = await request.newContext({ baseURL });
  const adminEmail = `e2e-langadmin-${stamp}@example.com`;
  const signup = await api.post('/api/users', {
    data: { userName: `@e2eladm${stamp}`, firstName: 'Lang', lastName: 'Admin', email: adminEmail, password },
  });
  expect(signup.ok()).toBe(true);
  await run(['scripts/data/e2eAdmin.ts', adminEmail]);
  expect((await api.put('/api/admin/multilingual', { data: { enabled: true } })).ok()).toBe(true);
  await api.dispose();
});

test.afterAll(async () => {
  if (savedSetting !== undefined) await run(['scripts/data/e2eAppSetting.ts', 'put', 'multilingual', savedSetting]);
});

// Pages in another language: the picker moves the page into it and keeps it
// there, links stay in it, and pins loaded as the timeline scrolls ask for it.
// The picker is the profile's, beside the theme - the only place it lives - so
// this needs an account of its own (the run's teardown clears it).
test('the language picker opens the page in Spanish, and links stay in it', async ({ page, context }) => {
  await page.goto('/signup');
  await page.getByLabel('User Handle').fill(handle);
  await page.getByLabel('First Name').fill('End');
  await page.getByLabel('Last Name').fill('ToEnd');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm Password').fill(password);
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page.getByRole('button', { name: `@${handle}` })).toBeVisible();

  await page.goto('/profile/preferences');
  await page.getByRole('combobox', { name: 'Language' }).selectOption('es');
  await expect(page).toHaveURL(/\/es\/profile\/preferences$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  expect((await context.cookies()).find((c) => c.name === 'locale')?.value).toBe('es');

  // More pins as the timeline scrolls come in the page's language. Listened
  // for from the start: the first load can go out as soon as the timeline
  // lands on today, before any scrolling.
  const pages: string[] = [];
  page.on('request', (request) => {
    if (/\/api\/main\?/.test(request.url())) pages.push(request.url());
  });

  // A plain path now opens in the chosen language.
  await page.goto('/');
  await expect(page).toHaveURL(/\/es$/);
  await expect(page.getByRole('link', { name: 'Mapa' }).first()).toBeVisible();

  await expect(page.locator('article').first()).toBeVisible();
  // Scrolled to the top again on every poll: the timeline settles on today
  // once its first page is in, which undoes a scroll made before that.
  await expect
    .poll(
      async () => {
        await page.evaluate(() => window.scrollTo(0, 0));
        return pages.length;
      },
      { timeout: 15_000 },
    )
    .toBeGreaterThan(0);
  expect(pages.every((url) => url.includes('lang=es'))).toBe(true);

  // A card's link stays in Spanish.
  await page.locator('article h2 a').first().click();
  await expect(page).toHaveURL(/\/es\/pin\/\d+\//);

  // Back to English through the picker, which the cookie then remembers. The
  // profile opens in Spanish on the way there, from that same cookie.
  await page.goto('/profile/preferences');
  await expect(page).toHaveURL(/\/es\/profile\/preferences$/);
  await page.getByRole('combobox', { name: 'Idioma' }).selectOption('en');
  await expect(page).toHaveURL(/\/profile\/preferences$/);
  await expect(page).not.toHaveURL(/\/es\//);
  await page.goto('/map');
  await expect(page).toHaveURL(/\/map$/);
});

test('a browser asking for French gets French on its first visit', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'fr-FR' });
  const page = await context.newPage();
  await page.goto('/map');
  await expect(page).toHaveURL(/\/fr\/map$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await context.close();
});
