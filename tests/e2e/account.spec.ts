import { execFile } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, test, type Page } from '@playwright/test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const stamp = Date.now().toString(36);
const handle = `e2e${stamp}`;
const email = `e2e-${stamp}@example.com`;
// A source URL of this run's own. Only one pin may cite a URL - the 409 in
// rejectDuplicateSourceUrl, which no prompt gets past - so a fixed one would
// collide with the seeded pin that already cites it, and with whatever an
// earlier run left behind.
const sourceUrl = `https://example.com/e2e/${stamp}`;
const password = 'correct horse battery';
// A leap day: the one date a round trip through a time zone is most likely
// to land a day either side of.
const birthday = '1984-02-29';
// Saved with its whitespace tidied, not reformatted (src/lib/phone.ts).
const phone = '+1 (415) 555-0132';

async function signUp(page: Page) {
  await page.goto('/signup');
  await page.getByLabel('User Handle').fill(handle);
  await page.getByLabel('First Name').fill('End');
  await page.getByLabel('Last Name').fill('ToEnd');
  // Optional, but a given birthday has to come back the same day (0058 is a
  // `date`, which pg would otherwise hand back as local midnight).
  await page.getByLabel('Birthday').fill(birthday);
  await page.getByLabel('Phone Number').fill(phone);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm Password').fill(password);
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page.getByRole('button', { name: `@${handle}` })).toBeVisible();
  await confirmEmail(page);
}

// Posting waits for the link in the sign-up email (0071). The link comes from
// a local script rather than an inbox, and is followed the way a click would.
async function confirmEmail(page: Page) {
  await expect(page.getByText('Confirm your email to post pins and comments')).toBeVisible();
  const { stdout } = await promisify(execFile)('npx', ['tsx', 'scripts/data/e2eVerifyLink.ts', email], { cwd: root });
  await page.goto(stdout.split('\n').find((line) => line.startsWith('/auth/verify-email?'))!);
  await expect(page.getByText('Your email is confirmed')).toBeVisible();
  await page.goto('/');
  await expect(page.getByText('Confirm your email to post pins and comments')).toBeHidden();
}

test.describe.serial('a signed-in author', () => {
  test('signs up, creates a pin, and edits it without losing any field', async ({ page }) => {
    test.setTimeout(240_000);
    await signUp(page);

    // The page asks only for a link and a note. This test wants every field:
    // its link has no date for the AI to find, so the full form opens with
    // what was read, and the rest is filled in there.
    await page.goto('/create');
    await page.getByLabel('Link').fill(sourceUrl);
    await page.getByRole('button', { name: 'Create pin' }).click();
    await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible({ timeout: 150_000 });
    await expect(page.getByLabel('Source URL')).toHaveValue(sourceUrl);
    await page.getByLabel('Title').fill(`E2E launch ${stamp}`);
    // Exact: a timed pin's form also has a "Start time" beside it.
    await page.getByLabel('Start', { exact: true }).fill('2031-05-04');
    // Categories are tags now, any number of them, picked one at a time.
    await page.getByLabel('Categories', { exact: true }).selectOption('Transport');
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
    await page.getByLabel('Episodes').fill('8');
    await page.getByLabel('What that counts').selectOption('planned');
    await page.getByRole('button', { name: 'Submit' }).click();
    // Earlier runs leave pins with this link and date behind, so the form may
    // first offer them as duplicates; this run posts its own pin regardless.
    const postMine = page.getByRole('button', { name: /post my pin/ });
    await Promise.race([page.waitForURL(/\/pin\/\d+\//), postMine.waitFor()]);
    if (await postMine.isVisible()) await postMine.click();

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
      categories: ['Transport'],
      company: 'Windsor-Detroit Bridge Authority',
      price: 6400000000,
      priceCurrency: 'CAD',
      address: 'Detroit, Michigan',
      latitude: 42.29,
      longitude: -83.1,
      dateConfidence: 'estimated',
      dateConfidenceReasoning: 'A target, per the source',
      episodeCount: 8,
      episodeStatus: 'planned',
      allDay: true,
      utcStartDateTime: '2031-05-04T00:00:00.000Z',
    });
    expect(saved.merchants).toEqual([expect.objectContaining({ label: 'Amazon', url: 'https://www.amazon.com/dp/B000000000' })]);

    // Watch it, comment on it, then delete the comment - a comment is never
    // edited, so its author gets only the delete.
    const article = page.getByRole('article').first();
    await article.getByRole('button', { name: /^Watch this pin/ }).click();
    await expect(article.getByRole('button', { name: 'Stop watching (1 watching)' })).toBeVisible();
    await page.getByPlaceholder('Add a comment...').fill('First!');
    await page.getByRole('button', { name: 'Post' }).click();
    await expect(page.getByText('First!')).toBeVisible();
    await expect(page.getByTitle('Edit comment')).toHaveCount(0);
    await page.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Remove' }).click();
    await expect(page.getByText('First!')).toHaveCount(0);

    // Take the pin down again. Nothing on the pin page does this, so it goes
    // through the API - and it has to happen here, not only in the run's
    // teardown: deleting a pin the way the app does broadcasts its removal
    // (src/server/events.ts), so it leaves the timeline, the new pins panel
    // of every open tab and the search index at once. The row-level tidying
    // in cleanup.ts runs outside the app and can tell it none of that, which
    // is why test pins used to sit in the new pins panel after a run.
    expect((await page.request.delete(`/api/pins/${pinId}`)).status()).toBe(204);
    expect((await page.request.get(`/api/pins/${pinId}`)).status()).toBe(404);
  });

  // A link the AI cannot make a pin of (here, no date on the page) opens the
  // full form with what was read and the author's note, to finish by hand.
  test('a link the AI cannot finish opens the full form, filled in', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'));

    await page.goto('/create');
    await page.getByLabel('Link').fill(`${sourceUrl}-quick`);
    await page.getByLabel(/What is this pin about/).fill('The bridge opening, not the groundbreaking');
    await page.getByRole('button', { name: 'Create pin' }).click();
    await expect(page.getByRole('status')).toContainText('Reading the page');

    await expect(page.getByText(/The AI (is not available|could not find)/)).toBeVisible({ timeout: 150_000 });
    await expect(page.getByLabel('Source URL')).toHaveValue(`${sourceUrl}-quick`);
    // The note starts the description (the editor; the preview card shows it too).
    await expect(page.locator('[contenteditable="true"]').first()).toContainText('The bridge opening, not the groundbreaking');
    await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();
  });

  test('a signed-out visitor is sent to log in, and logging in works', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fprofile/);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByLabel('Birthday')).toHaveValue(birthday);
    await expect(page.getByLabel('Phone Number')).toHaveValue(phone);
    await page.getByRole('navigation', { name: 'Profile' }).getByRole('link', { name: 'Preferences' }).click();
    await expect(page).toHaveURL(/\/profile\/preferences$/);
    await page.getByLabel('Timeline filter default').selectOption('1w');
    await expect(page.getByText('Preferences saved.')).toBeVisible();
  });

  test('the light theme applies at once and follows the account to a new browser', async ({ page, browser }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'));

    // Nothing chosen yet follows the device, here a dark one.
    await page.emulateMedia({ colorScheme: 'dark' });
    // Preferences are a tab of the profile now; old links land on it.
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/profile\/password$/);
    await page.goto('/preferences');
    await expect(page).toHaveURL(/\/profile\/preferences$/);
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByRole('radio', { name: 'System' })).toHaveAttribute('aria-checked', 'true');
    await page.getByRole('radio', { name: 'Light' }).click();
    await expect(html).toHaveAttribute('data-theme', 'light');
    await expect(page.getByText('Theme saved.')).toBeVisible();

    // The timeline filter default saved earlier is still there.
    await page.reload();
    await expect(page.getByLabel('Timeline filter default')).toHaveValue('1w');
    await expect(page.getByRole('radio', { name: 'Light' })).toHaveAttribute('aria-checked', 'true');

    // Another browser with nothing stored picks the theme up from the account.
    const other = await browser.newContext({ storageState: { cookies: await page.context().cookies(), origins: [] } });
    const otherPage = await other.newPage();
    await otherPage.goto('/');
    await expect(otherPage.locator('html')).toHaveAttribute('data-theme', 'light');
    await other.close();
  });

  // Removing a picture can be taken back while the Undo stands in for the
  // button; leaving the page with it up lets the removal go through.
  test('a removed picture can be taken back until the page is left', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'));
    await page.goto('/profile');

    await page.locator('input[type=file]').setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: onePixelPng() });
    const remove = page.getByRole('button', { name: 'Remove picture' });
    const undo = page.getByRole('button', { name: 'Undo' });
    await expect(remove).toBeVisible();
    const picture = async () => ((await (await page.request.get('/api/users/me')).json()) as { pictureUrl?: string | null }).pictureUrl;
    const uploaded = await picture();
    expect(uploaded).toBeTruthy();

    // Taken off the page at once, but nothing sent: the account still has it.
    await remove.click();
    await expect(undo).toBeVisible();
    await expect(remove).toHaveCount(0);
    await expect(page.getByText('Picture removed.')).toBeVisible();
    expect(await picture()).toBe(uploaded);

    await undo.click();
    await expect(remove).toBeVisible();
    await expect(undo).toHaveCount(0);

    // Removed again and the page left: that is the Undo lapsing.
    await remove.click();
    await expect(undo).toBeVisible();
    await page.goto('/');
    await expect.poll(picture).toBeFalsy();
    await page.goto('/profile');
    await expect(page.getByText('Upload picture')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Undo' })).toHaveCount(0);
  });

  // The default location (0066): picked from a search, taken from the device,
  // and cleared, each saved on its own. The search answer is stubbed, so the
  // test does not depend on the geocoder; the device's point is rounded to
  // two decimals before it is kept.
  test('the default location is set from a search or the device, and cleared', async ({ page, context }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'));
    await page.route('**/api/place/search?*', (route) =>
      route.fulfill({ json: [{ latitude: 45.52, longitude: -122.68, name: 'Portland, Oregon, United States' }] }),
    );
    const saved = async () => {
      const me = (await (await page.request.get('/api/users/me')).json()) as Record<string, unknown>;
      return { latitude: me.locationLatitude, longitude: me.locationLongitude, name: me.locationName, fromDevice: me.locationFromDevice };
    };
    await page.goto('/profile/preferences');
    const shown = page.getByTestId('default-location');
    await expect(shown).toContainText('Not set');

    await page.getByLabel('Or search for a place').fill('Portl');
    await page.getByRole('button', { name: 'Portland, Oregon, United States' }).click();
    await expect(shown).toContainText('Portland, Oregon, United States');
    expect(await saved()).toEqual({ latitude: 45.52, longitude: -122.68, name: 'Portland, Oregon, United States', fromDevice: false });
    await expect(page.getByLabel('Keep it updated from this device')).not.toBeChecked();

    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 51.507351, longitude: -0.127758 });
    await page.getByRole('button', { name: 'Use my current location' }).click();
    await expect(page.getByText('Default location saved.')).toBeVisible();
    await expect.poll(async () => (await saved()).latitude).toBe(51.51);
    expect(await saved()).toMatchObject({ longitude: -0.13, fromDevice: true });
    await expect(page.getByLabel('Keep it updated from this device')).toBeChecked();

    await page.getByRole('button', { name: 'Clear location' }).click();
    await expect(shown).toContainText('Not set');
    expect(await saved()).toEqual({ latitude: null, longitude: null, name: null, fromDevice: false });
  });
});

// What a first Google, Facebook or Apple sign-in lands on (signInLanding):
// the provider shares no birthday or phone, so the page asks for them and
// goes on to where the sign-in was headed. The OAuth round trip itself cannot
// run here, so the account is made through the API, which has neither.
test('a new account without a birthday or phone is asked for them, and goes on', async ({ page }) => {
  const other = `e2d${stamp}`;
  const res = await page.request.post('/api/users', {
    data: { userName: `@${other}`, firstName: 'Oauth', lastName: 'Like', email: `e2e-d${stamp}@example.com`, password },
  });
  expect(res.ok()).toBe(true);

  await page.goto('/signup/details?redirect=%2Fprofile');
  await expect(page.getByRole('heading', { name: 'A little more about you' })).toBeVisible();
  await page.getByLabel('Phone Number').fill('12');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Please enter a phone number of 7 to 15 digits')).toBeVisible();

  await page.getByLabel('Phone Number').fill(phone);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByLabel('Phone Number')).toHaveValue(phone);
  // Skipped, the birthday stays empty rather than being cleared to anything.
  await expect(page.getByLabel('Birthday')).toHaveValue('');

  // With only the birthday left to give, the page still asks; the phone
  // already on the account comes back filled in.
  await page.goto('/signup/details?redirect=%2Fprofile');
  await expect(page.getByLabel('Phone Number')).toHaveValue(phone);
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await expect(page).toHaveURL(/\/profile$/);
});

// A 1x1 PNG, enough for the picture upload (which squares and re-encodes it).
function onePixelPng(): Buffer {
  return Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
}
