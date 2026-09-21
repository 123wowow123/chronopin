import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

// Paging the search results, both ways and by both sorts. These are not the
// timeline's cursors (tests/e2e/timelinePaging.spec.ts): a date page walks
// ("utcStartDateTime", "id") as a row comparison either way from one that
// straddles now, while a relevance page walks score down and carries the
// score it left off at in after_score, so a run of pins that scored the same
// is broken by the same row comparison. Three things have to hold of every
// walk - it reaches every pin the search matches, hands out none of them
// twice, and stops.
//
// Search can be asked for its whole answer at once, which the timeline
// cannot: GET /api/pins/search with no sort returns every matching pin in
// date order, the set the map plots. That is the oracle below - page all the
// way out in both directions and what the pages held has to be exactly that
// set, in exactly that order when the walk was by date.

// A search with pins well on both sides of today, so each direction has
// pages to hand out. It names a category, so it also stands up without the
// search service: only free text is sent to FAISS.
const FILTERED = 'category:"Infrastructure & Transportation"';
// And one of free text, which is sent - the pins FAISS matched, ranked.
const TEXT = 'iphone';
// Free text naming a place, which matches two ways at once: the pins FAISS
// ranked, each by its own score, and every pin whose address says Chicago,
// all of them scored the same. So one walk down the ranking crosses both a
// run of equal scores and the distinct ones around it.
const PLACE_TEXT = 'chicago';

type Result = { id: number; utcStartDateTime: string; searchScore: number | null };

function cursors(header: string | undefined) {
  const read = (rel: string) => new RegExp(`<[^>]*(\\?[^>]*)>;\\s*rel="${rel}"`).exec(header || '')?.[1];
  return { previous: read('previous'), next: read('next') };
}

async function search(request: APIRequestContext, baseURL: string | undefined, query: string) {
  const res = await request.get(`${baseURL}/api/pins/search${query}`);
  expect(res.ok(), `GET /api/pins/search${query} answered ${res.status()}`).toBeTruthy();
  const { pins } = (await res.json()) as { pins: Result[] };
  return { pins, ...cursors(res.headers().link) };
}

// Every page of a search, in the order a reader would meet them: out to the
// first pin it matches, then out to the last. The guard is a safety net on a
// cursor that fails to advance - it would page for ever otherwise.
async function walk(request: APIRequestContext, baseURL: string | undefined, q: string, sort: 'date' | 'relevance') {
  const first = await search(request, baseURL, `?${new URLSearchParams({ q, sort })}`);
  const pages = [first.pins];
  for (const direction of ['previous', 'next'] as const) {
    let page = first;
    for (let i = 0; page[direction]; i++) {
      expect(i, `the ${direction} cursor of "${q}" never ran out`).toBeLessThan(50);
      page = await search(request, baseURL, page[direction]!);
      // A page with no pins should not have been linked to at all.
      expect(page.pins.length, `a ${direction} page of "${q}" is empty`).toBeGreaterThan(0);
      if (direction === 'previous') pages.unshift(page.pins);
      else pages.push(page.pins);
    }
  }
  return pages.flat();
}

// Every pin the search matches, in date order, in one answer.
async function everything(request: APIRequestContext, baseURL: string | undefined, q: string) {
  const { pins } = await search(request, baseURL, `?${new URLSearchParams({ q })}`);
  expect(pins.length, `"${q}" matches nothing, so it cannot test paging`).toBeGreaterThan(24);
  return pins;
}

test('paging a search by date reaches every pin it matches, once each', async ({ request, baseURL }) => {
  const all = await everything(request, baseURL, FILTERED);
  const walked = await walk(request, baseURL, FILTERED, 'date');

  const ids = walked.map((pin) => pin.id);
  expect(new Set(ids).size, 'a pin was sent on two pages').toBe(ids.length);
  // Same pins, same date order: a gap between two pages loses pins the reader
  // can never scroll to, and a page that starts before the one before it
  // ended repeats ground.
  expect(ids).toEqual(all.map((pin) => pin.id));
});

test('paging a free-text search by relevance reaches every pin it matched, once each', async ({ request, baseURL }) => {
  const all = await everything(request, baseURL, TEXT);
  const walked = await walk(request, baseURL, TEXT, 'relevance');

  const ids = walked.map((pin) => pin.id);
  expect(new Set(ids).size, 'a pin was sent on two pages').toBe(ids.length);
  // Ranked rather than dated, so the order is its own; the pins are the same.
  expect(new Set(ids)).toEqual(new Set(all.map((pin) => pin.id)));

  // And they arrive best first, across the page boundaries as well as within
  // a page: the score the cursor carries is what holds that together.
  const scores = walked.map((pin) => pin.searchScore ?? 0);
  expect(scores, 'the ranking is not in order across pages').toEqual([...scores].sort((a, b) => b - a));
});

test('paging a search for a place reaches every pin there and every pin it matched', async ({ request, baseURL }) => {
  const all = await everything(request, baseURL, PLACE_TEXT);
  const walked = await walk(request, baseURL, PLACE_TEXT, 'relevance');

  const ids = walked.map((pin) => pin.id);
  expect(new Set(ids).size, 'a pin was sent on two pages').toBe(ids.length);
  expect(new Set(ids)).toEqual(new Set(all.map((pin) => pin.id)));

  const scores = walked.map((pin) => pin.searchScore ?? 0);
  expect(scores, 'the ranking is not in order across pages').toEqual([...scores].sort((a, b) => b - a));

  // The pins standing in the place are what someone typing it is after, so
  // they are not left below the whole semantic pool.
  expect(scores[0], 'a pin in the place searched for did not rank at the top').toBeGreaterThanOrEqual(0.7);
});

// A search of labels alone scores every pin it matches the same, so by
// relevance the whole walk rests on the ("utcStartDateTime", "id") half of
// the cursor - the half a run of equal scores is broken by, and the half a
// free-text walk down distinct scores never leans on.
test('paging a search of even scores by relevance reaches every pin, once each', async ({ request, baseURL }) => {
  const all = await everything(request, baseURL, FILTERED);
  const walked = await walk(request, baseURL, FILTERED, 'relevance');

  const ids = walked.map((pin) => pin.id);
  expect(new Set(ids).size, 'a pin was sent on two pages').toBe(ids.length);
  // Nothing to rank them by, so they keep date order.
  expect(ids).toEqual(all.map((pin) => pin.id));
});

// The same walk by date, but through the browser: the results page asks for
// the next page as the reader nears either end. Scores are moot here - the
// grid of ranked results and its end are browse.spec.ts's.
const shownIds = (page: Page) =>
  page
    .locator('article h2 a')
    .evaluateAll((links) =>
      links
        .map((a) => /\/pin\/(\d+)/.exec(a.getAttribute('href') || '')?.[1])
        .filter((id): id is string => !!id)
        .map(Number),
    );

async function scrollForMore(page: Page, to: 'top' | 'bottom', had: number) {
  await page.evaluate((edge) => window.scrollTo(0, edge === 'top' ? 0 : document.documentElement.scrollHeight), to);
  try {
    await expect.poll(async () => (await shownIds(page)).length, { timeout: 15_000 }).toBeGreaterThan(had);
    return true;
  } catch {
    return false;
  }
}

test('search results page in both upward and downward, drawing each pin once', async ({ page }) => {
  await page.goto(`/search?${new URLSearchParams({ q: FILTERED })}`);
  await expect(page.locator('article').first()).toBeVisible();
  // The results open on today, which is what tells the sentinels at the two
  // ends that a scroll from here is the reader's and not that jump.
  expect((await shownIds(page)).length).toBeGreaterThan(0);

  for (const edge of ['top', 'bottom'] as const) {
    const before = (await shownIds(page)).length;
    // The first scroll each way has to bring pins in: that is the cursor for
    // that direction working at all.
    expect(await scrollForMore(page, edge, before), `scrolling to the ${edge} brought in no more pins`).toBe(true);

    // Then one more, which may legitimately run out.
    await scrollForMore(page, edge, (await shownIds(page)).length);

    // The results merge each page in by pin id, so this is a guard on that
    // merge rather than on the cursors - what the server sends twice the API
    // tests above are the ones to catch.
    const ids = await shownIds(page);
    expect(new Set(ids).size, `a pin is drawn twice after scrolling ${edge}`).toBe(ids.length);
  }
});
