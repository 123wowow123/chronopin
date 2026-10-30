// Named tropical cyclones as pins, with the storm's track drawn on the map.
// NASA EONET publishes each storm from the warning agencies (JTWC, NOAA NHC)
// with a dated position and wind speed every six hours. A storm that reached
// hurricane/typhoon strength (--min-kts, default 64) becomes one confirmed
// 'Disaster' pin at its first reported position, sourced to its EONET event
// record (unique per storm, and the already-pinned key), carrying the track as
// a flight path. Weaker storms, floods (GDACS stubs) and wildfires (hundreds of
// small ones) are left out as too thin to stand as pins.
//
//   npx tsx scripts/events/storms.ts --dry                 list what would happen
//   npx tsx scripts/events/storms.ts --days 60             window (default 30)
//   npx tsx scripts/events/storms.ts --base https://www.chronopin.com
//
// Posts through POST /api/admin/db/Pin (an admin token, as @QuakeDesk); a storm
// already pinned is refused by the route's duplicate-sourceUrl check. A storm
// still open when pinned keeps the track it had that day (no update flag yet).

import '../env';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

const { values: flags } = parseArgs({
  options: {
    dry: { type: 'boolean', default: false },
    days: { type: 'string', default: '30' },
    'min-kts': { type: 'string', default: '64' },
    base: { type: 'string', default: 'https://www.chronopin.com' },
    desk: { type: 'string', default: 'QuakeDesk' },
  },
});
const BASE = flags.base!.replace(/\/$/, '');

type Geometry = { magnitudeValue: number | null; magnitudeUnit: string | null; date: string; type: string; coordinates: [number, number] };
type EonetEvent = { id: string; title: string; link: string; closed: string | null; sources: { id: string; url: string }[]; geometry: Geometry[] };

const AGENCIES: Record<string, string> = { JTWC: 'the Joint Typhoon Warning Center', NOAA_NHC: "NOAA's National Hurricane Center", EO: 'NASA Earth Observatory' };

async function fetchStorms(): Promise<EonetEvent[]> {
  const res = await fetch(`https://eonet.gsfc.nasa.gov/api/v3/events?status=all&days=${flags.days}&category=severeStorms&limit=200`, { headers: { 'User-Agent': 'chronopin (storms)' } });
  if (!res.ok) throw new Error(`EONET ${res.status}`);
  const min = Number(flags['min-kts']);
  return ((await res.json()) as { events: EonetEvent[] }).events.filter((e) => /cyclone|hurricane|typhoon|storm/i.test(e.title) && e.geometry.length >= 3 && Math.max(...e.geometry.map((g) => g.magnitudeValue ?? 0)) >= min);
}

function pinBody(e: EonetEvent) {
  const track = [...e.geometry].sort((a, b) => a.date.localeCompare(b.date));
  const first = track[0];
  const last = track[track.length - 1];
  const peak = track.reduce((a, g) => ((g.magnitudeValue ?? 0) > (a.magnitudeValue ?? 0) ? g : a));
  const kts = peak.magnitudeValue ?? 0;
  const mph = Math.round(kts * 1.15078);
  const kph = Math.round(kts * 1.852);
  const agencies = e.sources.map((s) => AGENCIES[s.id]).filter(Boolean);
  const day = (iso: string) => iso.slice(0, 10);
  return {
    title: `${e.title} peaks at ${kts} knots`,
    description: [
      `${e.title} was tracked from ${day(first.date)} to ${day(last.date)} (${track.length} six-hourly positions), reaching maximum sustained winds of ${kts} knots (${mph} mph, ${kph} km/h) on ${day(peak.date)}.`,
      agencies.length ? `The positions and wind speeds are ${agencies.join(' and ')}'s own warnings, compiled by NASA's Earth Observatory Natural Event Tracker (EONET).` : "The positions and wind speeds are compiled by NASA's Earth Observatory Natural Event Tracker (EONET).",
      e.closed ? `The storm was listed as ended on ${day(e.closed)}.` : 'The storm was still listed as active at the time of the last update.',
    ].join(' '),
    sourceUrl: e.link,
    address: `${first.coordinates[1].toFixed(1)}, ${first.coordinates[0].toFixed(1)}`,
    latitude: first.coordinates[1],
    longitude: first.coordinates[0],
    allDay: false,
    utcStartDateTime: first.date,
    utcEndDateTime: e.closed ?? null,
    dateConfidence: 'confirmed',
    dateConfidenceReasoning: "The start is the storm's first dated position in the warning agencies' track; the track and end date are updated while the storm is active.",
    categories: ['Disaster'],
    media: [] as { type: number; originalUrl: string }[],
    flightPath: { label: `${e.title} track`, sourceUrl: e.link, estimated: false, points: track.map((g) => [g.coordinates[1], g.coordinates[0]] as [number, number]) },
    userName: flags.desk,
  };
}

async function token(): Promise<string> {
  const host = new URL(BASE).host;
  const file = path.resolve(host === 'www.chronopin.com' ? '.scrape/admin.token' : `.scrape/admin-${host.replace(/\W+/g, '_')}.token`);
  if (!existsSync(file)) throw new Error(`No admin token at ${file}; sign in with an admin script first.`);
  return readFileSync(file, 'utf8').trim();
}

async function main() {
  const storms = await fetchStorms();
  console.log(`${storms.length} storms of ${flags['min-kts']}+ knots in the last ${flags.days} days`);
  const bodies = storms.map(pinBody).sort((a, b) => a.utcStartDateTime.localeCompare(b.utcStartDateTime));
  for (const b of bodies) console.log(`${b.utcStartDateTime.slice(0, 10)} ${b.title} (${b.flightPath.points.length} points)`);
  if (flags.dry) return;
  const t = await token();
  const res = await fetch(`${BASE}/api/admin/db/Pin`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify(bodies) });
  const data = (await res.json()) as { results?: { index: number; id?: number; error?: string }[] };
  for (const r of data.results ?? []) console.log(r.id ? `pin ${r.id} <- ${bodies[r.index].title}` : `failed ${bodies[r.index].title}: ${String(r.error).slice(0, 160)}`);
  console.log(`status ${res.status}`);
}

main().then(() => process.exit(0), (e) => { console.error(e.message); process.exit(1); });
