// Significant earthquakes as pins. USGS publishes every event as GeoJSON; its
// "significant" feed (magnitude, felt reports, alert level and tsunami flag
// combined into one score) keeps the list to quakes worth a pin, a handful a
// week. Each becomes a confirmed pin at its epicentre, sourced to its USGS
// event page (unique per quake, and the already-pinned key). A quake already
// pinned is skipped. New pins go through the running app's POST /api/pins:
//
//   CURATOR_EMAIL=... CURATOR_PASSWORD=... npm run earthquakes
//   npm run earthquakes -- --dry-run              list what would happen
//   npm run earthquakes -- --feed significant_month --min-mag 6
//   npm run earthquakes -- --base http://localhost:3000
//   npm run earthquakes -- --media                add ShakeMaps to quake pins that lack them
//   npm run earthquakes -- --base <url> --head 3199 --parent 21448 --prev-head 3185
//                                                 remote run: this year's head and chain tail, last year's head
//
// Quakes thread per calendar year: a year's first quake is its head and responds to the
// previous year's head (the annual main line); its second quake is a subthread off the head,
// and later quakes chain on from there (the year's leaf chain).
//
// Each pin carries up to three of USGS's ShakeMap pictures (shaking intensity,
// peak ground acceleration and velocity), US-government works credited to USGS.
// The thumbs are made by the app and stored in Azure Blob, not in git.

import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';

const { values: flags } = parseArgs({
  options: {
    'dry-run': { type: 'boolean', default: false },
    // USGS summary feeds: significant_hour, _day, _week or _month.
    feed: { type: 'string', default: 'significant_week' },
    media: { type: 'boolean', default: false },
    'min-mag': { type: 'string', default: '5.5' },
    base: { type: 'string', default: 'http://localhost:3000' },
    // Tail pin of the current year's chain on a server whose database this script cannot read.
    parent: { type: 'string' },
    head: { type: 'string' },
    'prev-head': { type: 'string' },
  },
});

type Quake = {
  id: string;
  properties_detail?: never;
  geometry: { coordinates: [number, number, number] };
  properties: { mag: number; place: string; time: number; url: string; felt: number | null; detail: string; alert: string | null; tsunami: number; sig: number; magType: string; type: string };
};

const ALERTS: Record<string, string> = { green: 'green', yellow: 'yellow', orange: 'orange', red: 'red' };

async function fetchQuakes(): Promise<Quake[]> {
  const response = await fetch(`https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/${flags.feed}.geojson`, { headers: { 'User-Agent': 'chronopin (earthquakes)' } });
  if (!response.ok) throw new Error(`USGS ${response.status}: ${(await response.text()).slice(0, 200)}`);
  const quakes = ((await response.json()) as { features: Quake[] }).features;
  const min = Number(flags['min-mag']);
  return quakes.filter((q) => q.properties.type === 'earthquake' && q.properties.mag >= min);
}

// The ShakeMap pictures USGS has made for the quake, if it has made any.
const SHAKEMAPS = ['intensity', 'pga', 'pgv'];
async function shakeMaps(q: Quake) {
  try {
    const response = await fetch(q.properties.detail, { headers: { 'User-Agent': 'chronopin (earthquakes)' } });
    if (!response.ok) return [];
    const contents = ((await response.json()) as { properties: { products: { shakemap?: { contents: Record<string, { url: string }> }[] } } }).properties.products.shakemap?.[0]?.contents ?? {};
    return SHAKEMAPS.map((name) => contents[`download/${name}.jpg`]?.url).filter((url): url is string => !!url).map((originalUrl) => ({ type: 1, originalUrl }));
  } catch {
    return [];
  }
}

function pinBody(q: Quake) {
  const p = q.properties;
  const [longitude, latitude, depth] = q.geometry.coordinates;
  const when = new Date(p.time);
  const title = `M ${p.mag.toFixed(1)} earthquake strikes ${p.place.replace(/^\d+\s*km\s+\w+\s+of\s+/i, 'near ')}`;
  return {
    title,
    description: [
      `USGS recorded a magnitude ${p.mag.toFixed(1)} (${p.magType}) earthquake ${p.place} at ${when.toISOString().slice(0, 16).replace('T', ' ')} UTC, at a depth of ${depth.toFixed(0)} km.`,
      p.alert ? `USGS's PAGER impact alert level is ${ALERTS[p.alert] ?? p.alert}.` : null,
      p.felt ? `${p.felt.toLocaleString('en-US')} people reported feeling it.` : null,
      p.tsunami ? 'A tsunami alert was associated with the event.' : null,
    ]
      .filter(Boolean)
      .join(' '),
    sourceUrl: p.url,
    address: p.place,
    latitude,
    longitude,
    allDay: false,
    utcStartDateTime: when.toISOString(),
    utcEndDateTime: null,
    dateConfidence: 'confirmed',
    dateConfidenceReasoning: 'The origin time is USGS\'s own reading of the seismic network; it may be revised slightly as the event is reviewed.',
    categories: ['Disaster'],
    media: [] as { type: number; originalUrl: string }[],
  };
}

async function signIn(base: string): Promise<string> {
  const { CURATOR_EMAIL: email, CURATOR_PASSWORD: password } = process.env;
  if (!email || !password) throw new Error('Set CURATOR_EMAIL and CURATOR_PASSWORD (a curator account on the running app).');
  const response = await fetch(`${base}/auth/local`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  if (!response.ok) throw new Error(`sign-in failed: ${response.status}`);
  return ((await response.json()) as { token: string }).token;
}

// Adds ShakeMaps to quake pins that have no picture, found by their USGS event page.
async function addMedia(quakes: Quake[]) {
  const token = await signIn(flags.base);
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  let added = 0;
  for (const q of quakes) {
    const found = await fetch(`${flags.base}/api/pins/search?q=${encodeURIComponent(q.properties.url)}`, { headers });
    const hit = found.ok ? ((await found.json()) as { id: number; sourceUrl?: string }[] | { pins: { id: number; sourceUrl?: string }[] }) : [];
    const pin = (Array.isArray(hit) ? hit : hit.pins ?? []).find((p) => p.sourceUrl === q.properties.url);
    if (!pin) { console.log(`${q.id}: no pin here`); continue; }
    const full = (await (await fetch(`${flags.base}/api/pins/${pin.id}`, { headers })).json()) as { media?: unknown[] };
    if (full.media?.length) { console.log(`${q.id}: pin ${pin.id} already has media`); continue; }
    const media = await shakeMaps(q);
    if (!media.length) { console.log(`${q.id}: pin ${pin.id}: no ShakeMap`); continue; }
    const response = await fetch(`${flags.base}/api/pins/${pin.id}`, { method: 'PUT', headers, body: JSON.stringify({ ...full, media }) });
    if (response.ok) { added++; console.log(`${q.id}: pin ${pin.id} +${media.length} ShakeMaps`); }
    else console.error(`${q.id}: pin ${pin.id} failed ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }
  console.log(`${added} pins given ShakeMaps`);
}

async function main() {
  const quakes = await fetchQuakes();
  if (flags.media) return addMedia(quakes);
  console.log(`${quakes.length} earthquakes of M${flags['min-mag']}+ in ${flags.feed}`);
  const token = flags['dry-run'] ? '' : await signIn(flags.base);
  const local = /^https?:\/\/(localhost|127\.0\.0\.1)/.test(flags.base);
  let made = 0;
  // Year -> that year's head (its first quake pin) and tail (its latest); seeded from the local database or the flags.
  const years = new Map<number, { head?: number; tail?: number }>();
  const usgs = `"sourceUrl" LIKE 'https://earthquake.usgs.gov/%' AND "utcDeletedDateTime" IS NULL`;
  const yearOf = async (year: number) => {
    if (years.has(year)) return years.get(year)!;
    const state: { head?: number; tail?: number } = {};
    if (flags.head && year === new Date().getUTCFullYear()) { state.head = Number(flags.head); state.tail = Number(flags.parent ?? flags.head); }
    else if (local) {
      const [head] = await db.query<{ id: number }>(`SELECT "id" FROM "Pin" WHERE ${usgs} AND EXTRACT(YEAR FROM "utcStartDateTime" AT TIME ZONE 'UTC') = $1 ORDER BY "utcStartDateTime", "id" LIMIT 1`, [year]);
      const [tail] = await db.query<{ id: number }>(`SELECT "id" FROM "Pin" WHERE ${usgs} AND EXTRACT(YEAR FROM "utcStartDateTime" AT TIME ZONE 'UTC') = $1 ORDER BY "utcStartDateTime" DESC, "id" DESC LIMIT 1`, [year]);
      state.head = head?.id; state.tail = tail?.id;
    }
    years.set(year, state);
    return state;
  };
  // The newest earlier year's head: the main line the new year's head responds to.
  const previousHead = async (year: number): Promise<number | undefined> => {
    for (const [y, st] of years) if (y < year && st.head) return st.head;
    if (flags['prev-head']) return Number(flags['prev-head']);
    if (!local) return undefined;
    const [row] = await db.query<{ id: number }>(`SELECT "id" FROM "Pin" WHERE ${usgs} AND EXTRACT(YEAR FROM "utcStartDateTime" AT TIME ZONE 'UTC') < $1 ORDER BY "utcStartDateTime" DESC, "id" DESC LIMIT 1`, [year]);
    return row?.id;
  };
  for (const q of quakes.sort((a, b) => a.properties.time - b.properties.time)) {
    const body = { ...pinBody(q), media: await shakeMaps(q) };
    // The local database says nothing about another server's pins: there the route's duplicate-sourceUrl refusal does the skipping.
    const [existing] = local ? await db.query<{ id: number }>(`SELECT "id" FROM "Pin" WHERE "sourceUrl" = $1 AND "utcDeletedDateTime" IS NULL LIMIT 1`, [body.sourceUrl]) : [];
    const year = new Date(body.utcStartDateTime).getUTCFullYear();
    const state = await yearOf(year);
    if (existing) { state.head ??= existing.id; state.tail = existing.id; }
    // First quake of the year: main line, under the previous year's head. Second: a subthread off the head. Then a chain.
    const first = !state.head;
    const parentId = existing ? undefined : first ? await previousHead(year) : state.tail;
    const subthread = !existing && !first && state.tail === state.head;
    console.log(`${body.utcStartDateTime.slice(0, 16)} ${body.title}${existing ? ` [pin ${existing.id}]` : ''}${parentId ? ` -> ${subthread ? 'subthread of' : 'responds to'} ${parentId}` : ''}`);
    if (existing || flags['dry-run']) continue;
    const response = await fetch(`${flags.base}/api/pins`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(parentId ? { ...body, parentId } : body) });
    if (response.ok) {
      made++;
      const created = (await response.json().catch(() => null)) as { id?: number } | null;
      if (created?.id) {
        state.head ??= created.id;
        state.tail = created.id;
        if (subthread) {
          const mark = await fetch(`${flags.base}/api/pins/${created.id}/subthread`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ subthread: true }) });
          if (!mark.ok) console.error(`  subthread flag failed ${mark.status} for pin ${created.id}`);
        }
      }
    }
    else console.error(`  failed ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }
  console.log(`${made} pins created`);
}

main().then(() => process.exit(0), (e) => { console.error(e.message); process.exit(1); });
