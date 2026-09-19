// The pin an anime pin follows on from, so a later season is posted as a
// response to the season before it and a show's seasons read as one thread,
// in order (Season 1 <- Season 2 <- Season 3).
//
// Works are told apart by their MyAnimeList id, which every anime pin carries:
// its source URL (a MAL scrape) or its MyAnimeList rating's link (any other
// page, via src/server/scrape/screen.ts). AniList gives each work's prequels
// and sequels by that id, keylessly. Prequels are walked back one step at a
// time until one is pinned, so a missing Season 2 leaves Season 3 answering
// Season 1; when Season 2 is pinned later, Season 3 moves under it
// (reslotSequels). An earlier pin about the same work (its announcement)
// comes first of all.
//
// Used by the scrape (GET /api/scrape answers respondTo), by POST /api/pins
// (a new pin that does not say what it responds to is threaded here, and its
// later seasons re-slotted) and by the backfill, scripts/threads/prequels.ts.

import { siteUrl } from '@/lib/appConfig';
import * as db from '../db';
import log from '../util/log';
import { isScreenCategory } from './screen';

const MAL_ANIME = /myanimelist\.net\/anime\/(\d+)/i;

// A MyAnimeList anime id out of a link to its page.
export function malIdOf(url: string | null | undefined): number | undefined {
  return Number(url?.match(MAL_ANIME)?.[1]) || undefined;
}

// A pin's MyAnimeList id: its source URL's, else its MyAnimeList rating's.
export function pinMalId(pin: { sourceUrl?: string | null; ratings?: { source?: string | null; url?: string | null }[] }) {
  return malIdOf(pin.sourceUrl) ?? malIdOf(pin.ratings?.find((r) => r.source === 'MyAnimeList')?.url);
}

export type PinnedWork = {
  id: number;
  title: string;
  malId: number;
  parentId: number | null;
  utcStartDateTime: Date;
};

// The MyAnimeList id of each live pin: its source URL's, else its rating's.
const PIN_WORK_SQL = `
    SELECT "Pin"."id", "Pin"."title", "Pin"."parentId", "Pin"."utcStartDateTime",
      coalesce(
        substring("Pin"."sourceUrl" FROM 'myanimelist\\.net/anime/(\\d+)'),
        (SELECT substring("url" FROM 'myanimelist\\.net/anime/(\\d+)') FROM "PinRating"
         WHERE "pinId" = "Pin"."id" AND "source" = 'MyAnimeList')
      )::integer AS "malId"
    FROM "Pin"
    WHERE "Pin"."utcDeletedDateTime" IS NULL`;

// Live pins about any of these works.
export async function pinsByMalId(malIds: number[]): Promise<PinnedWork[]> {
  if (!malIds.length) return [];
  return db.query<PinnedWork>(`SELECT * FROM (${PIN_WORK_SQL}) AS "work" WHERE "malId" = ANY($1::integer[])`, [malIds]);
}

// Every live pin about an anime work, oldest first (the backfill's list).
export async function animePins(): Promise<PinnedWork[]> {
  return db.query<PinnedWork>(`SELECT * FROM (${PIN_WORK_SQL}) AS "work" WHERE "malId" IS NOT NULL ORDER BY "utcStartDateTime", "id"`);
}

// A pin's replies, and theirs: never its parent, or the thread would loop.
export async function descendantIds(pinId: number): Promise<number[]> {
  const rows = await db.query<{ id: number }>(
    `
    WITH RECURSIVE "below" ("id") AS (
        SELECT "id" FROM "Pin" WHERE "parentId" = $1
      UNION
        SELECT "Pin"."id" FROM "Pin" JOIN "below" ON "Pin"."parentId" = "below"."id"
    )
    SELECT "id" FROM "below"`,
    [pinId],
  );
  return rows.map((r) => r.id);
}

// Each work's prequels and sequels (anime only), by MAL id. Filled in batches
// from AniList and kept, so a backfill over hundreds of pins asks once per work.
export type Relations = { prequels: number[]; sequels: number[] };
export type RelationCache = Map<number, Relations>;

const PAGE_SIZE = 50;
// Steps through prequels or sequels before giving up: a long show's seasons,
// OVAs and films between them.
const MAX_STEPS = 12;
const REQUEST_TIMEOUT_MS = 10000;
const USER_AGENT = `ChronopinBot/1.0 (+${siteUrl})`;

const RELATIONS_QUERY = `query ($ids: [Int], $page: Int) {
  Page(page: $page, perPage: ${PAGE_SIZE}) {
    media(idMal_in: $ids, type: ANIME) {
      idMal
      relations { edges { relationType node { idMal type } } }
    }
  }
}`;

// Looks up the works the cache has not seen. A work AniList does not know
// is kept as having no relations. False when AniList could not be asked, so
// a caller can tell "none" from "no answer". patient: wait out AniList's
// rate limit (a minute at a time) rather than give up, for a backfill; a
// scrape has no minute to spare.
export async function loadRelations(malIds: number[], cache: RelationCache, { patient = false } = {}): Promise<boolean> {
  const missing = [...new Set(malIds)].filter((id) => !cache.has(id));
  for (let i = 0; i < missing.length; i += PAGE_SIZE) {
    const ids = missing.slice(i, i + PAGE_SIZE);
    const media = await aniList(ids, patient ? MAX_WAITS : 0);
    if (!media) return false;
    ids.forEach((id) => cache.set(id, { prequels: [], sequels: [] }));
    for (const m of media) {
      const related = (type: string) => [
        ...new Set<number>(
          (m.relations?.edges ?? [])
            .filter((e: any) => e.relationType === type && e.node?.type === 'ANIME' && e.node.idMal)
            .map((e: any) => Number(e.node.idMal)),
        ),
      ];
      cache.set(Number(m.idMal), { prequels: related('PREQUEL'), sequels: related('SEQUEL') });
    }
  }
  return true;
}

// Every work MAX_STEPS steps back (or forward) from these, loading as it
// goes: a batch of requests per step for any number of works. undefined when
// AniList could not be asked.
export async function relatedWorks(
  malIds: number[],
  direction: keyof Relations,
  cache: RelationCache,
  options = { patient: false },
): Promise<Set<number> | undefined> {
  const seen = new Set(malIds);
  let frontier = [...seen];
  for (let step = 0; step < MAX_STEPS && frontier.length; step++) {
    if (!(await loadRelations(frontier, cache, options))) return undefined;
    frontier = [...new Set(frontier.flatMap((id) => cache.get(id)?.[direction] ?? []))].filter((id) => !seen.has(id));
    frontier.forEach((id) => seen.add(id));
  }
  malIds.forEach((id) => seen.delete(id));
  return seen;
}

const MAX_WAITS = 5;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function aniList(ids: number[], waits: number): Promise<any[] | undefined> {
  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': USER_AGENT },
      body: JSON.stringify({ query: RELATIONS_QUERY, variables: { ids, page: 1 } }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (res.status === 429 && waits > 0) {
      await sleep((Number(res.headers.get('Retry-After')) || 60) * 1000 + 1000);
      return aniList(ids, waits - 1);
    }
    if (!res.ok) {
      log.warn('AniList relations', res.status);
      return undefined;
    }
    const json = await res.json();
    return json?.data?.Page?.media ?? undefined;
  } catch (err) {
    log.warn('AniList relations failed', (err as Error).message);
    return undefined;
  }
}

const time = (value: Date | string) => new Date(value).getTime();

const latest = (pins: PinnedWork[]) => pins.sort((a, b) => time(b.utcStartDateTime) - time(a.utcStartDateTime) || b.id - a.id)[0];

// The pin a pin about work malId, starting at `start`, should answer: the
// latest earlier pin about the same work, else the latest pin about its
// nearest prequel pinned no later than it. exclude: the pin itself and any
// pin that must not be its parent (its replies, which would make a loop).
export async function findPrequelPin(
  { malId, start, exclude = [] }: { malId: number; start: Date | string; exclude?: number[] },
  cache: RelationCache = new Map(),
): Promise<PinnedWork | undefined> {
  const skip = new Set(exclude.map(Number));
  const same = (await pinsByMalId([malId])).filter((p) => !skip.has(p.id) && time(p.utcStartDateTime) < time(start));
  if (same.length) return latest(same);

  const seen = new Set([malId]);
  let frontier = [malId];
  for (let step = 0; step < MAX_STEPS && frontier.length; step++) {
    if (!(await loadRelations(frontier, cache))) return undefined;
    frontier = frontier.flatMap((id) => cache.get(id)?.prequels ?? []).filter((id) => !seen.has(id));
    frontier.forEach((id) => seen.add(id));
    // In release order: AniList's prequel is the story's, and a story's
    // prequel can come out later (Attack on Titan's No Regrets OVA).
    const pinned = (await pinsByMalId(frontier)).filter((p) => !skip.has(p.id) && time(p.utcStartDateTime) <= time(start));
    if (pinned.length) return latest(pinned);
  }
  return undefined;
}

// Where an anime pin belongs in its show's thread, when that is not where it
// is: the parent findPrequelPin picks, for a pin with no parent or one whose
// parent is an earlier pin of the same show (its own announcement or an
// earlier season). A response to anything else was the author's choice and
// stays. undefined: leave it.
export async function betterParent(pin: PinnedWork, cache: RelationCache = new Map()): Promise<PinnedWork | undefined> {
  const best = await findPrequelPin({ malId: pin.malId, start: pin.utcStartDateTime, exclude: [pin.id, ...(await descendantIds(pin.id))] }, cache);
  if (!best || best.id === pin.parentId) return undefined;
  if (pin.parentId == null) return best;
  const [parent] = await db.query<PinnedWork>(`SELECT * FROM (${PIN_WORK_SQL}) AS "work" WHERE "id" = $1`, [pin.parentId]);
  if (!parent?.malId) return undefined;
  if (parent.malId === pin.malId) return best;
  return (await relatedWorks([pin.malId], 'prequels', cache))?.has(parent.malId) ? best : undefined;
}

export async function setParent(pinId: number, parentId: number) {
  await db.query(`UPDATE "Pin" SET "parentId" = $2 WHERE "id" = $1`, [pinId, parentId]);
}

// After a pin is saved: the pins of its show's later seasons (and later pins
// of the same work) that should now answer it, or a pin between them, rather
// than an earlier season - e.g. Season 3 answering Season 1 until Season 2 is
// pinned. Moves them and answers what moved, from -> to.
export async function reslotSequels(
  pin: { id: number; sourceUrl?: string | null; category?: string | null; ratings?: PinLike['ratings'] },
  cache: RelationCache = new Map(),
): Promise<{ id: number; from: number | null; to: number }[]> {
  const malId = malIdOf(pin.sourceUrl) ?? (isScreenCategory(pin.category) ? pinMalId(pin) : undefined);
  if (!malId) return [];
  const sequels = await relatedWorks([malId], 'sequels', cache);
  if (!sequels) return [];
  const later = (await pinsByMalId([malId, ...sequels])).filter((p) => p.id !== pin.id);
  const moved: { id: number; from: number | null; to: number }[] = [];
  // Oldest first, so each finds the ones before it already in place.
  for (const candidate of later.sort((a, b) => time(a.utcStartDateTime) - time(b.utcStartDateTime) || a.id - b.id)) {
    const parent = await betterParent(candidate, cache);
    if (!parent) continue;
    await setParent(candidate.id, parent.id);
    moved.push({ id: candidate.id, from: candidate.parentId, to: parent.id });
  }
  return moved;
}

type PinLike = {
  category?: string | null;
  sourceUrl?: string | null;
  utcStartDateTime?: Date | string | null;
  ratings?: { source?: string | null; url?: string | null }[];
};

// The pin a new pin should respond to, if it is an anime with an earlier
// season (or announcement) pinned. A MyAnimeList page is an anime whatever
// category it was given; with no start date yet, any earlier pin will do.
// pageUrl: the page being scraped, when the pin does not carry it yet.
export async function prequelPinFor(pin: PinLike, pageUrl?: string): Promise<{ id: number; title: string } | undefined> {
  const malId = malIdOf(pageUrl) ?? malIdOf(pin.sourceUrl) ?? (isScreenCategory(pin.category) ? pinMalId(pin) : undefined);
  if (!malId) return undefined;
  try {
    const found = await findPrequelPin({ malId, start: pin.utcStartDateTime || new Date() });
    return found && { id: found.id, title: found.title };
  } catch (err) {
    log.warn('prequel lookup failed:', (err as Error).message);
    return undefined;
  }
}

// Where the show's thread would put an anime pin whose author placed it
// themselves - a response to another pin, or on its own - which the app never
// moves: offered to the author and admins on the pin page instead
// (GET /api/pins/:id/thread-suggestion). undefined: it is where it belongs.
export async function suggestedParent(pinId: number): Promise<{ pin: PinnedWork; parent: PinnedWork } | undefined> {
  const [pin] = await db.query<PinnedWork>(`SELECT * FROM (${PIN_WORK_SQL}) AS "work" WHERE "id" = $1`, [pinId]);
  if (!pin?.malId) return undefined;
  const parent = await findPrequelPin({ malId: pin.malId, start: pin.utcStartDateTime, exclude: [pin.id, ...(await descendantIds(pin.id))] });
  return parent && parent.id !== pin.parentId ? { pin, parent } : undefined;
}
