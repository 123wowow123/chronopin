// The world's upcoming launch schedule as pins, each with an estimated flight
// path. The schedule is Launch Library 2 (thespacedevs.com, free, no key); a
// launch becomes a pin at its launch pad, and the pin page draws the path from
// there (src/lib/groundTrack.ts) with a link to the launch's Flight Club
// simulation. Flight Club's own trajectory data needs a login, so the path is
// estimated.
//
// Only a launch with a day-or-better NET is pinned, which is most of SpaceX's
// manifest and a minority of everyone else's: the rest of the world's launches
// sit at month or quarter precision until close to the day, so a nightly run
// picks each one up as its date firms.
//
// New pins go through the running app's POST /api/pins so the live feed,
// search and duplicate checks see them; an already-pinned launch only has its
// path refreshed. Each provider's launches form their own response thread,
// each answering the one after it by launch time, so the latest launch heads
// the thread (a single linear chain per provider, as a series is). Log in as a
// curator:
//
//   CURATOR_EMAIL=... CURATOR_PASSWORD=... npm run launches:upcoming
//   npm run launches:upcoming -- --dry-run         list what would happen
//   npm run launches:upcoming -- --limit 10        the next 10 launches
//   npm run launches:upcoming -- --provider SpaceX,Rocket\ Lab
//   npm run spacex:launches                        SpaceX alone, as before
//   npm run launches:upcoming -- --base http://localhost:3000

import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { groundTrack } from '@/lib/groundTrack';
import { launchOrbit } from '@/lib/launchOrbit';
import { saveFlightPath } from '@/server/services/pinFlightPath';

const { values: flags } = parseArgs({
  options: {
    'dry-run': { type: 'boolean', default: false },
    // Comma-separated launch-service-provider names exactly as Launch Library
    // spells them ("Rocket Lab", "Arianespace"); empty means every provider.
    provider: { type: 'string', default: '' },
    limit: { type: 'string', default: '30' },
    base: { type: 'string', default: 'http://localhost:3000' },
  },
});

const LL2 = 'https://ll.thespacedevs.com/2.3.0/launches/upcoming/?mode=detailed&ordering=net';
// LL2's net_precision ids: 0-3 are a second up to a day; coarser ones are a
// month, quarter or year, which the timeline cannot place.
const DAY_PRECISION = 3;
const DAY_MS = 86_400_000;

type Launch = {
  id: string;
  name: string;
  net: string;
  window_end: string | null;
  net_precision: { id: number } | null;
  image: { image_url: string } | null;
  flightclub_url: string | null;
  info_urls: { url: string }[];
  mission: { name: string; description: string | null; orbit: { name: string } | null } | null;
  launch_service_provider: { name: string } | null;
  pad: { name: string; latitude: string | number; longitude: string | number; location: { name: string } };
  rocket: { configuration: { name: string }; launcher_stage?: { landing?: { landing_location?: { name: string } | null } | null }[] };
};

async function fetchLaunches(limit: number, providers: string[]): Promise<Launch[]> {
  // One provider filters server-side; several are filtered here, because LL2
  // takes only a single lsp__name and its ~15 calls an hour are worth saving.
  const filter = providers.length === 1 ? `&lsp__name=${encodeURIComponent(providers[0])}` : '';
  const response = await fetch(`${LL2}${filter}&limit=${limit}`, { headers: { 'User-Agent': 'chronopin (launch schedule)' } });
  if (!response.ok) throw new Error(`Launch Library ${response.status}: ${(await response.text()).slice(0, 200)}`);
  const results = ((await response.json()) as { results: Launch[] }).results;
  if (providers.length < 2) return results;
  const wanted = new Set(providers.map((p) => p.toLowerCase()));
  return results.filter((l) => wanted.has(providerOf(l).toLowerCase()));
}

const providerOf = (l: Launch) => l.launch_service_provider?.name ?? 'Unknown';

// Launch Library carries a dated slot long before the payload is announced,
// especially for Chinese launches, and files it as "Unknown Payload" with a
// "Details TBD" description. That is a real launch but not yet a story, and a
// nightly run would keep re-offering it, so it waits until it has a name.
const named = (l: Launch) => !/^\s*(unknown|tbd|classified|undisclosed)\b/i.test(l.mission?.name ?? l.name.split('|').pop() ?? '');

// The launch's own page when it has one; else its Launch Library record.
// Only patterns known to be one-page-per-launch are trusted, because the
// sourceUrl is the already-pinned key and the route rejects a duplicate: a
// provider that points every launch at one press release or a listing page
// would make the second pin fail. Everything else falls back to the LL2
// record, which is unique per launch by construction.
const LAUNCH_PAGES = [/spacex\.com\/launches\//, /rocketlabcorp\.com\/missions\/launches\//];
const sourceUrlOf = (l: Launch) =>
  l.info_urls.find((u) => LAUNCH_PAGES.some((p) => p.test(u.url)))?.url ?? `https://ll.thespacedevs.com/2.3.0/launches/${l.id}/`;

function pinBody(l: Launch) {
  const vehicle = l.rocket.configuration.name;
  const mission = l.mission?.name ?? l.name.split('|').pop()!.trim();
  const orbit = l.mission?.orbit?.name;
  const landing = l.rocket.launcher_stage?.map((s) => s.landing?.landing_location?.name).find(Boolean);
  const dayOnly = (l.net_precision?.id ?? 0) >= DAY_PRECISION;
  const start = new Date(l.net);
  const windowEnd = l.window_end ? new Date(l.window_end) : null;
  const day = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  return {
    title: `${vehicle} launches ${mission}`,
    description: [
      l.mission?.description?.trim(),
      `Lifts off from ${l.pad.name}, ${l.pad.location.name}${orbit ? ` to ${orbit}` : ''}.`,
      landing ? `The booster is due to land at ${landing}.` : null,
    ]
      .filter(Boolean)
      .join(' '),
    sourceUrl: sourceUrlOf(l),
    address: `${l.pad.name}, ${l.pad.location.name}`,
    latitude: Number(l.pad.latitude),
    longitude: Number(l.pad.longitude),
    allDay: dayOnly,
    utcStartDateTime: (dayOnly ? day : start).toISOString(),
    utcEndDateTime: dayOnly ? new Date(day.getTime() + DAY_MS).toISOString() : windowEnd && windowEnd > start ? windowEnd.toISOString() : null,
    dateConfidence: 'scheduled',
    dateConfidenceReasoning: 'Launch Library 2 lists this as the no-earlier-than launch time; launches slip.',
    company: providerOf(l),
    categories: ['Space & Astronomy'],
    media: l.image?.image_url ? [{ type: 1, originalUrl: l.image.image_url }] : [],
  };
}

function pathFor(l: Launch) {
  const orbit = launchOrbit({ mission: l.mission?.name ?? l.name, orbit: l.mission?.orbit?.name, padLatitude: Number(l.pad.latitude) });
  if (!orbit) return null;
  const points = groundTrack({ latitude: Number(l.pad.latitude), longitude: Number(l.pad.longitude), ...orbit });
  return { label: `${orbit.inclination}° orbit, first revolution`, sourceUrl: l.flightclub_url, estimated: true, points };
}

async function login(base: string): Promise<string> {
  const { CURATOR_EMAIL: email, CURATOR_PASSWORD: password } = process.env;
  if (!email || !password) throw new Error('Set CURATOR_EMAIL and CURATOR_PASSWORD (a curator account on the running app).');
  const response = await fetch(`${base}/auth/local`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  if (!response.ok) throw new Error(`Login failed: ${response.status}`);
  return ((await response.json()) as { token: string }).token;
}

// Every launch pin answers the one launched just after it *by the same
// provider*, so each provider reads as its own thread, newest first: the
// latest launch is the thread's first entry and the oldest the highest number.
// One chain across providers would interleave Electron and Falcon 9 into a
// story neither of them is telling. Each move is a PUT of the whole pin with its new
// parent, so the live feed, search and the pages' caches hear about it (a
// direct UPDATE left the head of the chain showing no thread). Done from the
// latest back, so a pin is never moved under one of its own replies. Returns
// how many moved.
async function chainLaunches(sourceUrls: string[], token: string): Promise<number> {
  const pins = await db.query<{ id: number; parentId: number | null }>(
    `SELECT "id", "parentId" FROM "Pin" WHERE "sourceUrl" = ANY($1::text[]) AND "utcDeletedDateTime" IS NULL ORDER BY "utcStartDateTime", "id"`,
    [sourceUrls],
  );
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  let moved = 0;
  for (let i = pins.length - 1; i >= 0; i--) {
    const parentId = pins[i + 1]?.id ?? null;
    if (pins[i].parentId === parentId) continue;
    const pin = await (await fetch(`${flags.base}/api/pins/${pins[i].id}`, { headers })).json();
    const response = await fetch(`${flags.base}/api/pins/${pins[i].id}`, { method: 'PUT', headers, body: JSON.stringify({ ...pin, parentId }) });
    if (!response.ok) {
      console.error(`  re-threading ${pins[i].id}: ${response.status} ${(await response.text()).slice(0, 200)}`);
      continue;
    }
    moved++;
  }
  return moved;
}

async function run() {
  const providers = flags
    .provider!.split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const all = await fetchLaunches(Number(flags.limit), providers);
  const launches = all.filter((l) => (l.net_precision?.id ?? 9) <= DAY_PRECISION && Number(l.pad.latitude) && named(l));
  const who = providers.length ? providers.join(', ') : 'every provider';
  console.log(`${launches.length} of ${all.length} upcoming launch(es) from Launch Library are dated to the day or better (${who})`);
  const token = flags['dry-run'] ? '' : await login(flags.base!);
  let created = 0;
  let refreshed = 0;
  for (const l of launches) {
    const body = pinBody(l);
    const path = pathFor(l);
    const [existing] = await db.query<{ id: number }>(`SELECT "id" FROM "Pin" WHERE "sourceUrl" = $1 AND "utcDeletedDateTime" IS NULL LIMIT 1`, [body.sourceUrl]);
    console.log(`${body.utcStartDateTime.slice(0, 16)} ${body.title}${existing ? ` [pin ${existing.id}]` : ''} ${path ? `path ${path.label}` : 'no path'}`);
    if (flags['dry-run']) continue;
    if (existing) {
      if (path) await saveFlightPath(existing.id, path);
      refreshed++;
      continue;
    }
    const response = await fetch(`${flags.base}/api/pins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...body, flightPath: path ?? undefined }),
    });
    if (!response.ok) {
      console.error(`  ${response.status}: ${(await response.text()).slice(0, 200)}`);
      continue;
    }
    created++;
  }
  let moved = 0;
  if (!flags['dry-run']) {
    const byProvider = new Map<string, Launch[]>();
    for (const l of launches) byProvider.set(providerOf(l), (byProvider.get(providerOf(l)) ?? []).concat(l));
    for (const group of byProvider.values()) moved += await chainLaunches(group.map(sourceUrlOf), token);
  }
  console.log(`${moved} re-threaded`);
  console.log(`${created} created, ${refreshed} refreshed${flags['dry-run'] ? ' (dry run)' : ''}`);
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
