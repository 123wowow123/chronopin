// Draws a pin's course from a file of [lon, lat] points (a JSON array) as its map
// route (PinSiteShape, 0203, kind 'route'). The line is credited to the race's
// own course page, which is where a reader finds the course as the organiser
// publishes it; the file can come from anywhere that traced it, and where it came
// from is kept in docs/okf/scraping/routes.md, not on the pin.
//
//   npx tsx scripts/routes/courseLine.ts --file ~/Downloads/x.json --pins 5027,6217 \
//     --url https://www.chicagomarathon.com/event-info/participant-information/course/ \
//     --source "Chicago Marathon course" [--profile elevation.json]
//
// --profile is a JSON array of [km along the course, metres] points, drawn as an
// elevation chart under the map; the line's length is stored with it.

import '../env';
import fs from 'node:fs';
import { parseArgs } from 'node:util';
import { roundCoords, type PinSiteShapeJson } from '@/lib/siteShape';
import { saveSiteShape } from '@/server/model/pinSiteShape';

const { values: flags } = parseArgs({
  options: { file: { type: 'string' }, pins: { type: 'string' }, url: { type: 'string' }, source: { type: 'string' }, profile: { type: 'string' }, dry: { type: 'boolean', default: false } },
});

function main() {
  const pinIds = (flags.pins ?? '').split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0);
  if (!flags.file || !pinIds.length || !flags.source) throw new Error('--file, --pins and --source are required');
  const coordinates = JSON.parse(fs.readFileSync(flags.file, 'utf8')) as [number, number][];
  if (!Array.isArray(coordinates) || coordinates.length < 2 || coordinates.some((p) => p.length !== 2 || Math.abs(p[0]) > 180 || Math.abs(p[1]) > 90)) throw new Error('the file must be an array of [lon, lat] points');
  const profile = flags.profile ? (JSON.parse(fs.readFileSync(flags.profile, 'utf8')) as [number, number][]) : undefined;
  const km = coordinates.reduce((n, p, i) => (i ? n + Math.hypot((p[0] - coordinates[i - 1][0]) * 111.32 * Math.cos((p[1] * Math.PI) / 180), (p[1] - coordinates[i - 1][1]) * 111.32) : 0), 0);
  console.log(`${coordinates.length} points, about ${km.toFixed(1)} km`);
  if (flags.dry) return;
  const shape: PinSiteShapeJson = {
    geojson: { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: roundCoords(coordinates) }, properties: { kind: 'route', lengthM: Math.round((profile ? profile[profile.length - 1][0] : km) * 1000), ...(profile ? { profile } : {}) } }] },
    source: flags.source,
    sourceUrl: flags.url ?? null,
  };
  return Promise.all(pinIds.map((id) => saveSiteShape(id, shape))).then(() => console.log(`saved for pins ${pinIds.join(', ')}`));
}

Promise.resolve(main()).then(() => process.exit(0), (e) => { console.error(e.message); process.exit(1); });
