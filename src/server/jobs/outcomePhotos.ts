// The outcomePhotos task (docs/okf/scraping/daily-jobs.md#outcomephotos): keeps
// the thumbnail panel under a market pin's odds bars (PinOutcomePhoto, 0268)
// filled. Looks at open Kalshi / Polymarket markets on pins and lists the
// outcomes that have no picture yet, so contestants and candidates added to a
// market later get one on the next run.

import * as db from '../db';
import { pinMarketRefs } from '@/lib/predictionMarkets';
import { oddsFor } from '../predictionMarkets';
import { outcomeKey, outcomePhotosForPin } from '../model/pinOutcomePhoto';

// How many leaders per market need a picture: the box shows six rows, and the
// order moves a little between runs.
const WANTED = 10;
// A label that cannot be a person: a date, a threshold, a rate move, a side.
const NOT_A_PERSON = /\d|[$%↑↓<>]|^(before|after|above|below|under|over|hike|cut|yes|no|tie|other|none|any|field)\b/i;

export type PhotoGap = {
  pinId: number;
  title: string;
  market: string;
  marketUrl: string;
  // Photos the pin already has: a pin with some is a contest whose entrants change.
  have: number;
  // The leading outcomes with no picture, most likely first. `hint` is the
  // Wikipedia lead image of an article with exactly that title, when one exists:
  // a lead, not proof - confirm the article is the right person.
  missing: { label: string; chance: number | null; hint?: { imageSource: string; pageUrl: string } }[];
};

export async function wikipediaLeads(labels: string[]): Promise<Map<string, { imageSource: string; pageUrl: string }>> {
  const found = new Map<string, { imageSource: string; pageUrl: string }>();
  if (!labels.length) return found;
  try {
    const url = new URL('https://en.wikipedia.org/w/api.php');
    url.search = new URLSearchParams({ action: 'query', titles: labels.join('|'), prop: 'pageimages|info', piprop: 'original', inprop: 'url', redirects: '1', format: 'json' }).toString();
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000), headers: { 'User-Agent': 'chronopin-image-fetch/1.0' } });
    const data = (await res.json()) as { query?: { redirects?: { from: string; to: string }[]; normalized?: { from: string; to: string }[]; pages?: Record<string, { title: string; fullurl?: string; original?: { source: string } }> } };
    const pages = new Map(Object.values(data.query?.pages ?? {}).map((p) => [p.title, p]));
    for (const label of labels) {
      let title = label;
      for (const step of [data.query?.normalized, data.query?.redirects]) title = step?.find((s) => s.from === title)?.to ?? title;
      const page = pages.get(title);
      if (page?.original?.source && page.fullurl) found.set(label, { imageSource: page.original.source.split('?')[0], pageUrl: page.fullurl });
    }
  } catch {
    // No hints this time; the agent searches itself.
  }
  return found;
}

// Markets on pins with outcomes lacking a picture. Pins that already have
// pictures come first (new entrants), then the rest by dollar volume.
export async function photoGaps(limit = 5, skip: number[] = []): Promise<{ gaps: PhotoGap[]; remaining: number }> {
  const pins = await db.query<{ id: number; title: string; sourceUrl: string | null; refs: string[] | null; have: string }>(
    `SELECT p."id", p."title", p."sourceUrl",
       (SELECT json_agg(r."url") FROM "PinReference" r WHERE r."pinId" = p."id") AS "refs",
       (SELECT count(*) FROM "PinOutcomePhoto" o WHERE o."pinId" = p."id") AS "have"
     FROM "Pin" p
     WHERE p."utcDeletedDateTime" IS NULL
       AND (p."sourceUrl" ~ '(polymarket|kalshi)' OR EXISTS (SELECT 1 FROM "PinReference" r WHERE r."pinId" = p."id" AND r."url" ~ '(polymarket|kalshi)'))
     ORDER BY (SELECT count(*) FROM "PinOutcomePhoto" o WHERE o."pinId" = p."id") > 0 DESC, p."marketVolume" DESC NULLS LAST, p."id"`,
  );
  const gaps: PhotoGap[] = [];
  let remaining = 0;
  for (const pin of pins) {
    if (skip.includes(pin.id)) continue;
    const refs = pinMarketRefs({ sourceUrl: pin.sourceUrl, references: (pin.refs ?? []).map((url) => ({ url })) });
    if (!refs.length) continue;
    const photos = new Set((await outcomePhotosForPin(pin.id)).map((p) => outcomeKey(p.label)));
    for (const ref of refs) {
      const odds = await oddsFor(ref).catch(() => null);
      if (!odds || odds.closed || odds.outcomes.length < 3) continue;
      const leaders = odds.outcomes.slice(0, WANTED);
      const missing = leaders.filter((o) => !photos.has(outcomeKey(o.label)) && !NOT_A_PERSON.test(o.label));
      // A market of dates or thresholds has no people at all.
      if (!missing.length || leaders.filter((o) => NOT_A_PERSON.test(o.label)).length > leaders.length / 2) continue;
      if (gaps.length >= limit) {
        remaining++;
        continue;
      }
      const leads = await wikipediaLeads(missing.map((o) => o.label));
      gaps.push({
        pinId: pin.id,
        title: pin.title,
        market: odds.title,
        marketUrl: odds.url,
        have: Number(pin.have),
        missing: missing.map((o) => ({ label: o.label, chance: o.probability == null ? null : Math.round(o.probability * 1000) / 10, hint: leads.get(o.label) })),
      });
    }
  }
  return { gaps, remaining };
}
