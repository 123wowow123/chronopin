import { expect, test, type Page } from '@playwright/test';

const stamp = Date.now().toString(36);
const handle = `e2e${stamp}`;
const email = `e2e-${stamp}@example.com`;
const password = 'correct horse battery';

async function signUp(page: Page) {
  await page.goto('/signup');
  await page.getByLabel('User Handle').fill(handle);
  await page.getByLabel('First Name').fill('End');
  await page.getByLabel('Last Name').fill('ToEnd');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm Password').fill(password);
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page.getByRole('button', { name: `@${handle}` })).toBeVisible();
}

test.describe.serial('a signed-in author', () => {
  test('signs up, creates a pin, and edits it without losing any field', async ({ page }) => {
    await signUp(page);

    await page.goto('/create');
    await page.getByLabel('Source URL').fill('https://en.wikipedia.org/wiki/Gordie_Howe_International_Bridge');
    await page.getByLabel('Title').fill(`E2E launch ${stamp}`);
    await page.getByLabel('Start').fill('2031-05-04');
    await page.getByLabel('Category').selectOption('Infrastructure & Transportation');
    await page.getByLabel('Company', { exact: true }).fill('Windsor-Detroit Bridge Authority');
    await page.getByLabel('Cost').fill('6400000000');
    await page.getByLabel('Currency').fill('CAD');
    await page.getByRole('button', { name: 'Add a merchant' }).click();
    await page.getByLabel('Merchant label').fill('Amazon');
    await page.getByLabel('Merchant URL').fill('https://www.amazon.com/dp/B000000000');
    const details = page.locator('details');
    if (!(await details.getAttribute('open'))) await details.locator('summary').click();
    await page.getByLabel('Place').fill('Detroit, Michigan');
    await page.getByLabel('Latitude').fill('42.29');
    await page.getByLabel('Longitude').fill('-83.1');
    await page.getByLabel('Date confidence').selectOption('estimated');
    await page.getByLabel('Why').fill('A target, per the source');
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page).toHaveURL(/\/pin\/\d+\/e2e-launch/);
    await expect(page.getByRole('button', { name: 'Submit' })).toHaveCount(0);
    const pinUrl = page.url();
    const pinId = pinUrl.match(/\/pin\/(\d+)\//)![1];
    await expect(page.getByRole('heading', { level: 1 })).toContainText(`E2E launch ${stamp}`);
    await expect(page.getByText('ESTIMATED', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Buy on Amazon/ })).toBeVisible();

    // Edit only the title; everything else must survive the save.
    await page.goto(`/update/${pinId}`);
    await page.getByLabel('Title').fill(`E2E launch ${stamp} edited`);
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page).toHaveURL(/edited/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('edited');

    const saved = await (await page.request.get(`/api/pins/${pinId}`)).json();
    expect(saved).toMatchObject({
      title: `E2E launch ${stamp} edited`,
      category: 'Infrastructure & Transportation',
      company: 'Windsor-Detroit Bridge Authority',
      price: 6400000000,
      priceCurrency: 'CAD',
      address: 'Detroit, Michigan',
      latitude: 42.29,
      longitude: -83.1,
      dateConfidence: 'estimated',
      dateConfidenceReasoning: 'A target, per the source',
      allDay: true,
      utcStartDateTime: '2031-05-04T00:00:00.000Z',
    });
    expect(saved.merchants).toEqual([expect.objectContaining({ label: 'Amazon', url: 'https://www.amazon.com/dp/B000000000' })]);

    // Watch it, comment on it, then edit and delete the comment.
    const article = page.getByRole('article').first();
    await article.getByRole('button', { name: /^Watch this pin/ }).click();
    await expect(article.getByRole('button', { name: 'Stop watching (1 watching)' })).toBeVisible();
    await page.getByPlaceholder('Add a comment...').fill('First!');
    await page.getByRole('button', { name: 'Post' }).click();
    await expect(page.getByText('First!')).toBeVisible();
    await page.getByTitle('Edit comment').click();
    await page.locator('textarea').first().fill('First, edited');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('First, edited')).toBeVisible();
    await page.getByTitle('Delete comment').click();
    await expect(page.getByText('First, edited')).toHaveCount(0);
  });

  test('a signed-out visitor is sent to log in, and logging in works', async ({ page }) => {
    await page.goto('/preferences');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fpreferences/);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL(/\/preferences$/);
    await page.getByLabel('Timeline filter default').selectOption('1w');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Preferences saved.')).toBeVisible();
  });
});
