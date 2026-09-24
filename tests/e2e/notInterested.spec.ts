import { expect, test } from '@playwright/test';

const stamp = Date.now().toString(36);

// "Not interested" (0077), from a pin card's three-dot menu: the card folds
// to a line with Undo, and on the next page the pin is gone from the search
// it was in, until "Show this pin again" on its own page.
test('a reader marks a pin not interested and brings it back', async ({ page }) => {
  const res = await page.request.post('/api/users', {
    data: { userName: `@e2enoint${stamp}`, firstName: 'Not', lastName: 'Interested', email: `e2e-noint-${stamp}@example.com`, password: 'correct horse battery' },
  });
  expect(res.ok()).toBe(true);
  const pins = await page.request.get('/api/pins').then(async (r) => {
    const body = await r.json();
    return Array.isArray(body) ? body : body.pins;
  });
  const pin = pins.find((p: { user?: { userName?: string } }) => p.user?.userName)!;
  const search = `/search?q=${encodeURIComponent(`user:${pin.user.userName.replace(/^@/, '')}`)}`;
  await page.goto(search);
  const card = page.getByRole('article').filter({ has: page.getByRole('link', { name: pin.title, exact: true }) });
  await expect(card).toHaveCount(1);

  await card.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: 'Not interested' }).click();
  // Folded on this page, with Undo; Undo brings the card back.
  const notice = page.getByText("Hidden. You won't see this pin again.");
  await expect(notice).toHaveCount(1);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(card).toHaveCount(1);

  // Marked again, it is gone on the next page.
  await card.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: 'Not interested' }).click();
  await expect(notice).toHaveCount(1);
  await page.goto(search);
  await expect(page.getByRole('article').first()).toBeVisible().catch(() => {});
  await expect(card).toHaveCount(0);
  await expect(notice).toHaveCount(0);

  // Its own page still opens, and takes it back.
  await page.goto(`/pin/${pin.id}`);
  await page.getByRole('button', { name: 'Pin actions' }).click();
  await page.getByRole('menuitem', { name: 'Show this pin again' }).click();
  await page.goto(search);
  await expect(card).toHaveCount(1);
});
