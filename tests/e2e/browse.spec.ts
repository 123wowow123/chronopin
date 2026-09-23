import { expect, test } from '@playwright/test';

test('the timeline opens on today and loads earlier pins when scrolled up', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#today-marker, [id^="day-"]').first()).toBeVisible();
  const before = await page.locator('article').count();
  expect(before).toBeGreaterThan(0);

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(async () => page.locator('article').count(), { timeout: 15_000 }).toBeGreaterThan(before);
});

test('a wide screen keeps the still on a card by default', async ({ page }) => {
  // Cards load no video player on any screen until an admin turns them on
  // (Admin > Pins); the pin's own page still plays.
  await page.goto('/search?q=category:Anime', { waitUntil: 'networkidle' });
  await expect(page.locator('article').first()).toBeVisible();
  await expect(page.locator('article img').first()).toBeVisible();
  await expect(page.locator('iframe[src*="youtube.com"]')).toHaveCount(0);
});

test('a pin card opens its page, and a label searches for its company', async ({ page }) => {
  await page.goto('/search?q=company:Apple');
  const card = page.locator('article').first();
  await expect(card).toBeVisible();
  const title = await card.locator('h2').innerText();
  await card.locator('h2 a').click();
  await expect(page).toHaveURL(/\/pin\/\d+\//);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(title);
});

test('a company search lists its major products, each opening its own graph', async ({ page }) => {
  // A wide screen: the company's panels sit beside the results.
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/search?q=company:Microsoft');
  const products = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Major products' }) });
  await expect(products).toBeVisible();
  const first = products.locator('li > button').first();
  await expect(first).toHaveAttribute('aria-expanded', 'false');
  await first.click();
  await expect(first).toHaveAttribute('aria-expanded', 'true');
  await expect(products.getByRole('img')).toBeVisible();
});

test('search results page in as they are scrolled, by date and by relevance', async ({ page }) => {
  // Every pin a curator account posted: several pages' worth in the seed data,
  // most of them before today.
  await page.goto('/search?q=user:@GameDesk');
  const dateCards = page.locator('[class*="lg:before:left"] article');
  await expect(dateCards.first()).toBeVisible();
  const firstPage = await dateCards.count();

  // Each scroll to the top brings in an earlier page.
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => dateCards.count(), { timeout: 15_000 }).toBeGreaterThan(firstPage);
  const secondPage = await dateCards.count();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => dateCards.count(), { timeout: 15_000 }).toBeGreaterThan(secondPage);

  await page.getByRole('button', { name: 'relevance' }).first().click();
  await expect(page).toHaveURL(/sort=relevance/);
  const ranked = page.locator('ul:visible > li > article');
  await expect(ranked).toHaveCount(24);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => ranked.count(), { timeout: 15_000 }).toBeGreaterThan(24);

  const hrefs = await ranked.locator('h2 a').evaluateAll((links) => links.map((a) => a.getAttribute('href')));
  expect(new Set(hrefs).size).toBe(hrefs.length);
});

// The timeline and the results share one loading boundary, so a pick keeps the
// pins it was made over on screen until the search is in.
// Categories are the tag cloud's top group, and a pick is a tag: term. With
// the tag list off (the default, src/lib/tagList.ts) the Tags row in the
// Filters panel opens the big cloud, and the pick is made there.
test('picking a category searches without blanking the page', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('article').first()).toBeVisible();
  const filters = page.getByRole('button', { name: /^Filters:/ });
  if ((await filters.getAttribute('aria-expanded')) === 'false') await filters.click();
  await page.getByRole('button', { name: /^Tags:/ }).click();
  // The cloud's words, which stay up across the search they start.
  const pills = page.getByRole('dialog').getByRole('group', { name: 'Filter by tag' }).getByRole('button');
  await expect(pills.first()).toBeVisible();

  // Every frame from the click to the results: a page of its own for the
  // search would put an empty one between them for as long as it took.
  await page.evaluate(() => {
    const counter = Object.assign(window, { blankFrames: 0 });
    const tick = () => {
      const card = document.querySelector('article');
      if (!card || !card.getClientRects().length) counter.blankFrames += 1;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  await pills.first().click();
  await expect(page).toHaveURL(/\/search\?q=tag/);
  await expect(pills.first()).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { blankFrames: number }).blankFrames)).toBe(0);
});

// Enter can land while suggestions are still being asked for; their answer
// must not open the list again over the results.
test('searching with Enter closes the suggestions for good', async ({ page }) => {
  await page.goto('/');
  // By name: the navbar's language picker is a combobox too.
  const box = page.getByRole('combobox', { name: 'Search' });
  await box.fill('apple');
  await box.press('Enter');
  await expect(page).toHaveURL(/\/search\?q=apple/);
  // Long enough for the pause and the answer it was waiting on.
  await page.waitForTimeout(1_000);
  await expect(page.getByRole('listbox')).toBeHidden();

  // And with the list already open.
  await box.click();
  await box.fill('apple');
  await expect(page.getByRole('listbox')).toBeVisible();
  await box.press('Enter');
  await expect(page.getByRole('listbox')).toBeHidden();
});

// The router keeps the page behind, hidden, so that going back restores it -
// a playing video with it, out of sight and still talking.
test('leaving a pin page pauses its video', async ({ page }) => {
  // A stand-in for the player, so the test turns on what the page sends it
  // rather than on YouTube loading. It answers the handshake as a playing
  // video does.
  await page.route('https://www.youtube.com/embed/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: `<!doctype html><html><body><script>
        window.sent = [];
        addEventListener('message', (e) => {
          window.sent.push(e.data);
          try {
            if (JSON.parse(e.data).event === 'listening') e.source.postMessage(JSON.stringify({ event: 'onStateChange', info: 1 }), '*');
          } catch {}
        });
      </script></body></html>`,
    }),
  );

  // The first anime pin with a trailer on it.
  await page.goto('/search?q=category:Anime');
  const links = page.locator('article h2 a');
  await expect(links.first()).toBeVisible();
  const hrefs = (await links.evaluateAll((all) => all.map((a) => a.getAttribute('href')))).slice(0, 6);
  let found = false;
  for (const href of hrefs) {
    await page.goto(href!);
    found = (await page.locator('iframe[src*="youtube.com/embed"]').count()) > 0;
    if (found) break;
  }
  expect(found, 'no anime pin among the first few has a video').toBe(true);
  const sent = () => page.frames().find((f) => f.url().includes('youtube.com/embed'))?.evaluate(() => (window as unknown as { sent: string[] }).sent);
  await expect.poll(sent).toContain('{"event":"listening"}');

  await page.getByRole('combobox', { name: 'Search' }).fill('gollum');
  await page.getByRole('combobox', { name: 'Search' }).press('Enter');
  await expect(page).toHaveURL(/\/search\?q=gollum/);
  await expect.poll(sent).toContain('{"event":"command","func":"pauseVideo","args":[]}');
});

test('the map plots pins', async ({ page }) => {
  await page.goto('/map');
  await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible({ timeout: 20_000 });
});

// A card's distance is worked out in the browser, from the run's time zone
// (Los Angeles), so the link is there for every card with a place.
test('a distance opens the map and draws the line it measured', async ({ page }) => {
  await page.goto('/');
  const distance = page.locator('a[href*="from=me"]').first();
  await expect(distance).toBeVisible({ timeout: 20_000 });
  const away = (await distance.textContent())!;
  await distance.click();
  await expect(page).toHaveURL(/\/map\?pin=\d+&from=me/);
  // The line, labelled with the same distance the card gave, measured from
  // the city the time zone names.
  const label = page.locator('.from-line-label');
  await expect(label).toBeVisible({ timeout: 20_000 });
  await expect(label).toHaveText(new RegExp(away.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(' away', '')));
  await expect(label).toContainText('Los Angeles');
});


// The sliders in the floating controls fold away behind a row saying what they
// are set to, as the tag panel does, so the ring's thumb only exists once that
// row is pressed - and a reload folds it away again.
async function openRing(page: import('@playwright/test').Page) {
  const panel = page.locator('div.floating').filter({ has: page.getByRole('button', { name: /^Distance within:/ }) });
  await expect(panel).toBeVisible({ timeout: 20_000 });
  const thumb = page.locator('[data-thumb="radius"]');
  if (!(await thumb.isVisible())) await panel.getByRole('button', { name: /^Distance within:/ }).click();
  await expect(thumb).toBeVisible();
  return panel;
}

// The ring is measured from the browser's own idea of where the viewer is,
// which for this run is the city of its time zone (Los Angeles), so the
// slider is there and every card it leaves has a place near it.
test('the distance slider narrows the timeline to pins near the viewer', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('article').first()).toBeVisible();

  const slider = await openRing(page);
  const thumb = page.locator('[data-thumb="radius"]');
  await expect(slider).toContainText('from Los Angeles');

  // Home is the tightest ring on offer; End is no ring at all.
  await thumb.press('Home');
  await expect(slider).toContainText('Distance within 5 mi');
  await expect(page).toHaveURL(/within=5mi/);

  // Polled as one: the cards on screen are the ones the ring was set over
  // until the page it asked for lands, so counting either on its own catches
  // them mid-swap. Everything left is near enough to say so on its own card,
  // and every card says it - a pin with no place is nowhere near anybody.
  await expect
    .poll(
      async () => {
        const drawn = await page.locator('article').count();
        const away = await page.locator('article a[href*="from=me"]').allInnerTexts();
        return drawn > 0 && away.length === drawn && away.every((text) => parseFloat(text) <= 5);
      },
      { timeout: 20_000 },
    )
    .toBe(true);

  // Narrowed, every day drawn has a card on it: the days between the pins
  // that are left carry nothing but their own holidays, and a page of those
  // empty blocks would bury the few pins that survived the ring.
  const emptyDays = await page.locator('[id^="day-"]').evaluateAll((days) => days.filter((day) => !day.querySelector('article')).map((day) => day.id));
  expect(emptyDays, 'a day with no pins is drawn under a filter').toEqual([]);

  // Opened again on the same link, the timeline comes back on the same ring.
  await page.reload();
  await expect(await openRing(page)).toContainText('Distance within 5 mi');

  // Pins still page in as they do on the whole timeline: the ring rides the
  // pagination links, so scrolling keeps reaching further out.
  await page.locator('[data-thumb="radius"]').press('End');
  await expect(page).not.toHaveURL(/within=/);
});

test('a ring keeps paging pins in as the timeline is scrolled', async ({ page }) => {
  await page.goto('/?within=25mi');
  await expect(await openRing(page)).toContainText('Distance within 25 mi');

  const cards = () => page.locator('article').count();
  const before = await cards();
  expect(before).toBeGreaterThan(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(cards, { timeout: 20_000 }).toBeGreaterThan(before);
});
