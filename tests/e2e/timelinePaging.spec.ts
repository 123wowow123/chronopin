import { expect, test, type Page } from '@playwright/test';

// Paging the timeline, both ways. Two bugs lived here for years and survived
// the rewrite: the backward walk started a day before its cursor, so a day's
// pins fell between two pages and could not be reached at all, and a page
// whose first and last pin shared an instant - a day of all-day pins, which
// all start at midnight UTC - reported its two ends the wrong way round, so
// the page after it walked back over pins it had just shown.
//
// Both show up in the cursors rather than on screen: Timeline merges each
// page into a Map keyed by pin id, so a pin the server sends twice is drawn
// once either way, and a pin it never sends is simply absent with nothing to
// compare against. The walk below is what guards them; the scrolling test
// covers the other half of the question - that the timeline pages in at all,
// in both directions, and that the merge keeps drawing each pin once.

const pinIds = (page: Page) =>
  page
    .locator('article h2 a')
    .evaluateAll((links) =>
      links
        .map((a) => /\/pin\/(\d+)/.exec(a.getAttribute('href') || '')?.[1])
        .filter((id): id is string => !!id)
        .map(Number),
    );

// Scrolls to an edge and waits for the page it brings in, false if none comes
// (the end of the timeline that way).
async function loadMore(page: Page, to: 'top' | 'bottom', had: number) {
  await page.evaluate((edge) => window.scrollTo(0, edge === 'top' ? 0 : document.documentElement.scrollHeight), to);
  try {
    await expect.poll(async () => (await pinIds(page)).length, { timeout: 10_000 }).toBeGreaterThan(had);
    return true;
  } catch {
    return false;
  }
}

test('the timeline pages in both upward and downward, drawing each pin once', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('article').first()).toBeVisible();
  expect((await pinIds(page)).length).toBeGreaterThan(0);

  for (const edge of ['top', 'bottom'] as const) {
    const before = (await pinIds(page)).length;
    // The first scroll each way has to bring pins in: that is the cursor for
    // that direction working at all.
    expect(await loadMore(page, edge, before), `scrolling to the ${edge} brought in no more pins`).toBe(true);

    // Then a couple more, which may legitimately run out.
    for (let i = 0; i < 2; i++) {
      const had = (await pinIds(page)).length;
      if (!(await loadMore(page, edge, had))) break;
    }

    const ids = await pinIds(page);
    expect(new Set(ids).size, `a pin is drawn twice after scrolling ${edge}`).toBe(ids.length);
  }
});

// The cursors themselves, without the browser's merge in the way. Walking a
// page back and then forward again has to land exactly where it started: the
// day-step overshot, leaving pins on neither page, and the swapped ends sent
// the walk back over ground it had covered.
test('walking the timeline back and forward again lands on the same pin', async ({ request, baseURL }) => {
  const read = async (query: string) => {
    const res = await request.get(`${baseURL}/api/main${query}`);
    expect(res.ok()).toBeTruthy();
    const { pins } = (await res.json()) as { pins: { id: number; utcStartDateTime: string }[] };
    const link = res.headers().link || '';
    const cursor = (rel: string) => new RegExp(`<[^>]*(\\?[^>]*)>;\\s*rel="${rel}"`).exec(link)?.[1];
    return { pins, previous: cursor('previous'), next: cursor('next') };
  };

  let page = await read('');
  expect(page.pins.length).toBeGreaterThan(0);

  // Several boundaries, not just the first: the pages that trip this are the
  // ones that begin and end on the same instant.
  const seen = new Set<number>(page.pins.map((p) => p.id));
  for (let i = 0; i < 5 && page.previous; i++) {
    const oldest = page.pins[0];
    const back = await read(page.previous);
    if (!back.pins.length) break;

    // No pin belongs to both pages.
    const repeated = back.pins.filter((p) => seen.has(p.id)).map((p) => p.id);
    expect(repeated, `page ${i + 2} repeats pins already sent`).toEqual([]);
    back.pins.forEach((p) => seen.add(p.id));

    // And nothing sits between them: forward from the earlier page comes back
    // to the pin the later one began with.
    expect(back.next).toBeTruthy();
    const forward = await read(back.next!);
    expect(forward.pins[0]?.id, `pins were skipped between pages ${i + 1} and ${i + 2}`).toBe(oldest.id);

    page = back;
  }
  expect(seen.size).toBeGreaterThan(0);
});
