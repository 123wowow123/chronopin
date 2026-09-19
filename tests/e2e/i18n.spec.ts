import { expect, test } from '@playwright/test';

// Pages in another language: the picker moves the page into it and keeps it
// there, links stay in it, and pins loaded as the timeline scrolls ask for it.
test('the language picker opens the page in Spanish, and links stay in it', async ({ page, context }) => {
  await page.goto('/map');
  await page.getByRole('combobox', { name: 'Language' }).first().selectOption('es');
  await expect(page).toHaveURL(/\/es\/map$/);
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

  await expect(page.locator('#today-marker, [id^="day-"]').first()).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => pages.length, { timeout: 15_000 }).toBeGreaterThan(0);
  expect(pages.every((url) => url.includes('lang=es'))).toBe(true);

  // A card's link stays in Spanish.
  await page.locator('article h2 a').first().click();
  await expect(page).toHaveURL(/\/es\/pin\/\d+\//);

  // Back to English through the picker, which the cookie then remembers.
  await page.getByRole('combobox', { name: 'Idioma' }).first().selectOption('en');
  await expect(page).toHaveURL(/\/pin\/\d+\//);
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
