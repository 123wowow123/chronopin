// Adds NASA satellite pictures to the storm pins made by scripts/events/storms.ts.
// Each pin gets up to three NASA Worldview snapshots (VIIRS true colour, a
// public-domain NASA product): the day the storm first appeared, the day of its
// peak winds and its last tracked day, each a 20-degree box centred on the
// storm's position that day. The app fetches each URL and stores the thumb in
// Azure Blob. A pin that already has media is left alone.
//
//   npx tsx scripts/events/stormImagery.ts --dry
//   npx tsx scripts/events/stormImagery.ts --days 60
//
// Uses an admin token and PUT /api/pins/:id (the whole pin plus media).

import '../env';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

const { values: flags } = parseArgs({
  options: { dry: { type: 'boolean', default: false }, days: { type: 'string', default: '45' }, base: { type: 'string', default: 'https://www.chronopin.com' }, 'min-kts': { type: 'string', default: '64' }, pin: { type: 'string' } },
});
const BASE = flags.base!.replace(/\/$/, '');

type Geometry = { magnitudeValue: number | null; date: string; coordinates: [number, number] };
type EonetEvent = { id: string; title: string; link: string; geometry: Geometry[] };

const snapshot = (day: string, [lon, lat]: [number, number]) => {
  const half = 10;
  const bbox = [Math.max(-90, lat - half), lon - half, Math.min(90, lat + half), lon + half].map((n) => n.toFixed(2)).join(',');
  return `https://wvs.earthdata.nasa.gov/api/v1/snapshot?REQUEST=GetSnapshot&LAYERS=VIIRS_SNPP_CorrectedReflectance_TrueColor&CRS=EPSG:4326&TIME=${day}&BBOX=${bbox}&FORMAT=image/jpeg&WIDTH=1024&HEIGHT=1024`;
};

function frames(e: EonetEvent) {
  const track = [...e.geometry].sort((a, b) => a.date.localeCompare(b.date));
  const peak = track.reduce((a, g) => ((g.magnitudeValue ?? 0) > (a.magnitudeValue ?? 0) ? g : a));
  const picks = [track[0], peak, track[track.length - 1]];
  const seen = new Set<string>();
  return picks.filter((g) => !seen.has(g.date.slice(0, 10)) && seen.add(g.date.slice(0, 10))).map((g) => ({ type: 1, originalUrl: snapshot(g.date.slice(0, 10), g.coordinates) }));
}

async function main() {
  const res = await fetch(`https://eonet.gsfc.nasa.gov/api/v3/events?status=all&days=${flags.days}&category=severeStorms&limit=200`, { headers: { 'User-Agent': 'chronopin (storms)' } });
  const min = Number(flags['min-kts']);
  const storms = ((await res.json()) as { events: EonetEvent[] }).events.filter((e) => e.geometry.length >= 3 && Math.max(...e.geometry.map((g) => g.magnitudeValue ?? 0)) >= min);
  const file = path.resolve('.scrape/admin.token');
  if (!existsSync(file)) throw new Error('No admin token');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${readFileSync(file, 'utf8').trim()}` };
  for (const e of storms) {
    const found = await (await fetch(`${BASE}/api/admin/db/Pin?sourceUrl=${encodeURIComponent(e.link)}&utcDeletedDateTime.null=true&limit=2`, { headers })).json();
    const rows: { id: number }[] = found.rows ?? [];
    if (rows.length !== 1) { console.log(`${e.title}: ${rows.length} pins, skipped`); continue; }
    const pinId = rows[0].id;
    if (flags.pin && Number(flags.pin) !== pinId) continue;
    const full = (await (await fetch(`${BASE}/api/pins/${pinId}`, { headers })).json()) as { media?: unknown[] };
    if (full.media?.length) { console.log(`${e.title}: pin ${pinId} already has media`); continue; }
    const media = frames(e);
    if (flags.dry) { console.log(`${e.title}: pin ${pinId} would get ${media.length}`); continue; }
    const put = await fetch(`${BASE}/api/pins/${pinId}`, { method: 'PUT', headers, body: JSON.stringify({ ...full, media }) });
    console.log(put.ok ? `${e.title}: pin ${pinId} +${media.length}` : `${e.title}: pin ${pinId} failed ${put.status}: ${(await put.text()).slice(0, 200)}`);
  }
}

main().then(() => process.exit(0), (e) => { console.error(e.message); process.exit(1); });
