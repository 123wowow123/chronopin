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

async function signIn(page: Page) {
  const res = await page.request.post('/auth/local', { data: { email, password } });
  expect(res.ok(), 'signing in through the API').toBeTruthy();
}

async function logOut(page: Page) {
  // The account menu sits beside the Main nav, not in it.
  await page.getByRole('button', { name: `@${handle}` }).click();
  await page.getByRole('link', { name: 'Log out' }).click();
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

// In front of the reader, not left off the top or bottom of the page, once the
// rest of it has settled around it.
async function expectInView(page: Page, target: ReturnType<Page['locator']>) {
  await expect
    .poll(
      async () => {
        const box = (await target.boundingBox())!;
        const height = page.viewportSize()!.height;
        return box.y < height && box.y + box.height > 0;
      },
      { timeout: 15_000 },
    )
    .toBe(true);
}

// Logging in, signing up and logging out all reload the whole page, which used
// to open the timeline and search back on today (or the best match) however far
// the reader had scrolled, and the map on its default view.
const WAYS = [
  { name: 'logging in', signedIn: false, leave: logIn },
  { name: 'logging out', signedIn: true, leave: logOut },
];

test.describe.serial('leaving a page to sign in or out', () => {
  // Each of these scrolls through pages of results twice over.
  test.describe.configure({ timeout: 90_000 });

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

    // Neither page is behind the other: the login page sent the reader on to
    // sign-up in its own place, so Back is the timeline and not a login form
    // for the account just made.
    await page.goBack();
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).not.toMatch(/\/(login|signup)/);
  });

  test('logging in leaves no login page behind the back button', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[role="listitem"][id^="pin-"]').first()).toBeVisible();
    await logIn(page);
    await expect(page.getByRole('button', { name: `@${handle}` })).toBeVisible();
    const landed = page.url();
    // Signing in stands in the place of the login page rather than after it,
    // so Back goes to the page the Log in link was clicked on - not to a login
    // form for the session the reader is now in.
    await page.goBack();
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).not.toMatch(/\/login/);
    expect(page.url()).not.toBe(landed);
  });

  test('a watch clicked signed out happens, on the card it was clicked on, after logging in', async ({ page }) => {
    // A pin page, and a card well down its "More like this": logging in
    // reloads the page at the top, which used to leave both the click and the
    // card behind.
    await page.goto('/');
    await page.locator('[role="listitem"][id^="pin-"] h2 a').first().click();
    await page.waitForURL(/\/pin\/\d+\//);
    const pinUrl = page.url();
    const cards = page.locator('section[aria-labelledby="related-heading"] article');
    await expect(cards.first()).toBeVisible();
    const card = cards.nth(2);
    await card.scrollIntoViewIfNeeded();
    const title = (await card.locator('h2').innerText()).trim();
    const watch = card.getByRole('button', { name: /^Watch this pin/ });
    const before = Number((await watch.innerText()).trim());
    await watch.click();

    await expect(page).toHaveURL(/\/login\?redirect=/);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page).toHaveURL(pinUrl);
    const back = cards.filter({ hasText: title }).first();
    const watched = back.getByRole('button', { name: `Stop watching (${before + 1} watching)` });
    await expect(watched).toBeVisible();
    await expectInView(page, back);

    // Leave the seed pin as it was found.
    await watched.click();
    await expect(back.getByRole('button', { name: /^Watch this pin/ })).toBeVisible();
  });

  test('a follow clicked signed out happens, back in view, after logging in', async ({ page }) => {
    await page.goto('/');
    await page.locator('[role="listitem"][id^="pin-"] h2 a').first().click();
    await page.waitForURL(/\/pin\/\d+\//);
    const pinUrl = page.url();
    // The author sits well below the pin itself, so logging in used to come
    // back above it as well as losing the click.
    const follow = page.locator('button[title^="Follow "]').first();
    await follow.scrollIntoViewIfNeeded();
    await follow.click();

    await expect(page).toHaveURL(/\/login\?redirect=/);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page).toHaveURL(pinUrl);
    const following = page.getByRole('button', { name: 'Following' }).first();
    await expect(following).toBeVisible();
    await expectInView(page, following);

    // Leave the seed author as they were found.
    await following.click();
    await expect(page.locator('button[title^="Follow "]').first()).toBeVisible();
  });

  test('a company follow clicked signed out happens after logging in', async ({ page }) => {
    // The panel a `company:` search opens with, which is the only place a
    // company can be followed from.
    const search = '/search?q=company%3ANintendo';
    await page.goto(search);
    const follow = page.getByRole('button', { name: 'Follow', exact: true }).first();
    await expect(follow).toBeVisible();
    await follow.click();

    await expect(page).toHaveURL(/\/login\?redirect=/);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page).toHaveURL(new RegExp(`${search.replace('?', '\\?')}$`));
    // Exact: the panel's info button, "What following does", comes first and
    // would match a loose name.
    const following = page.getByRole('button', { name: 'Following', exact: true }).first();
    await expect(following).toBeVisible();
    await expectInView(page, following);

    // Leave the seed company as it was found.
    await following.click();
    await expect(page.getByRole('button', { name: 'Follow', exact: true }).first()).toBeVisible();
  });

  test('a comment started signed out comes back to the comment box after logging in', async ({ page }) => {
    await page.goto('/');
    await page.locator('[role="listitem"][id^="pin-"] h2 a').first().click();
    await page.waitForURL(/\/pin\/\d+\//);
    const pinUrl = page.url();
    const comments = page.locator('section[aria-labelledby="comments-heading"]');
    await comments.getByRole('link', { name: 'Log in' }).click();

    await expect(page).toHaveURL(/\/login\?redirect=/);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page).toHaveURL(pinUrl);
    // Back at the box, ready to type, rather than at the top of the pin.
    const box = comments.getByRole('textbox');
    await expect(box).toBeFocused();
    await expectInView(page, box);
  });

  for (const way of WAYS) {
    test(`${way.name} comes back to the card scrolled to`, async ({ page }) => {
      if (way.signedIn) await signIn(page);
      const before = await scrollFarFromToday(page);
      await way.leave(page);
      await expectBackAt(page, before);
    });

    // Search has no ?pin= to open on, so its results page toward the card.
    for (const sort of ['date', 'relevance']) {
      test(`${way.name} from a search by ${sort} comes back to the card scrolled to`, async ({ page, baseURL }) => {
        if (way.signedIn) await signIn(page);
        const path = `/search?q=category%3AAnime&posted=all${sort === 'relevance' ? '&sort=relevance' : ''}`;
        // Most anime has aired: by date, the pages are behind today.
        const before = await scrollFarFromToday(page, path, sort === 'date' ? -1 : 1);
        const url = page.url();
        await way.leave(page);
        await expectBackAt(page, before, url);
        expect(new URL(url, baseURL).search).toBe(new URL(page.url()).search);
      });
    }

    test(`${way.name} from the map comes back to the same view`, async ({ page }) => {
      if (way.signedIn) await signIn(page);
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
      const before = await page.evaluate(() => {
        const visible = [...document.querySelectorAll<HTMLElement>('.leaflet-marker-icon')]
          .map((el) => ({ title: el.title, rect: el.getBoundingClientRect() }))
          .filter(({ rect }) => rect.top > 60 && rect.bottom < window.innerHeight && rect.left > 0 && rect.right < window.innerWidth);
        return visible.map(({ title, rect }) => ({ title, x: Math.round(rect.x), y: Math.round(rect.y) }));
      });
      expect(before.length).toBeGreaterThan(0);
      const url = page.url();
      await way.leave(page);
      await expect(page).toHaveURL(url);
      const marker = markers.and(page.locator(`[title="${before[0].title.replace(/"/g, '\\"')}"]`)).first();
      await expect(marker).toBeVisible();
      await expect.poll(async () => {
        const at = (await marker.boundingBox())!;
        return Math.abs(at.x - before[0].x) + Math.abs(at.y - before[0].y);
      }).toBeLessThanOrEqual(2);
    });
  }
});
