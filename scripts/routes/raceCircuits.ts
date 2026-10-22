// Draws each Formula 1 pin's circuit on its map (PinSiteShape, 0203, kind
// 'route') from bacinger/f1-circuits, the circuit centrelines traced from
// OpenStreetMap (github.com/bacinger/f1-circuits, MIT; map data ODbL). A pin gets
// a circuit when it carries the Formula 1 or Grand Prix tag, its title is about a
// race (Grand Prix, F1, Sprint, Formula) and its place is on the circuit
// (within MATCH_KM of a point on the line). Pins that already have outlines
// are left alone.
//
//   npx tsx scripts/routes/raceCircuits.ts          local database
//   npx tsx scripts/routes/raceCircuits.ts --dry    matching only, nothing written
//   npx tsx scripts/routes/raceCircuits.ts --refresh  also redo the pins this script drew before
//
// Each circuit also carries its length, altitude and the years it opened and
// first held a Grand Prix (properties of the route feature, shown under the map).

import '../env';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { roundCoords, type PinSiteShapeJson } from '@/lib/siteShape';
import { saveSiteShape } from '@/server/model/pinSiteShape';

const { values: flags } = parseArgs({ options: { dry: { type: 'boolean', default: false }, refresh: { type: 'boolean', default: false } } });
const DATA_URL = 'https://raw.githubusercontent.com/bacinger/f1-circuits/master/f1-circuits.geojson';
const SOURCE_URL = 'https://github.com/bacinger/f1-circuits';
const FILE = path.resolve('.scrape/routes/f1-circuits.geojson');
const MATCH_KM = 1.5;

type Circuit = { properties: { id: string; Name: string; length?: number; altitude?: number; opened?: number; firstgp?: number }; geometry: { type: 'LineString'; coordinates: [number, number][] } };
type PinRow = { id: number; title: string; lat: number; lon: number };

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lon2 - lon1) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
}

async function circuits(): Promise<Circuit[]> {
  if (!fs.existsSync(FILE)) {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`${DATA_URL}: ${res.status}`);
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, await res.text());
  }
  return JSON.parse(fs.readFileSync(FILE, 'utf8')).features;
}

async function main() {
  const all = await circuits();
  const pins = await db.query<PinRow>(`
    SELECT DISTINCT p."id", p."title", ST_Y(p."location"::geometry) AS "lat", ST_X(p."location"::geometry) AS "lon"
    FROM "Pin" p JOIN "PinTag" t ON t."pinId" = p."id" AND t."name" IN ('Formula 1', 'Grand Prix')
    WHERE p."utcDeletedDateTime" IS NULL AND p."location" IS NOT NULL
      AND p."title" ~* '(grand prix|\\mf1\\M|formula|sprint)'
      AND NOT EXISTS (SELECT 1 FROM "PinSiteShape" s WHERE s."pinId" = p."id" AND (NOT $1::boolean OR s."source" <> 'f1-circuits (OpenStreetMap)'))
    ORDER BY p."id"`, [flags.refresh]);
  let saved = 0;
  const unmatched: string[] = [];
  for (const pin of pins) {
    let best: { c: Circuit; km: number } | null = null;
    for (const c of all) {
      const km = Math.min(...c.geometry.coordinates.map(([lon, lat]) => haversineKm(pin.lat, pin.lon, lat, lon)));
      if (km <= MATCH_KM && (!best || km < best.km)) best = { c, km };
    }
    if (!best) {
      unmatched.push(`${pin.id} ${pin.title.slice(0, 60)}`);
      continue;
    }
    console.log(pin.id, pin.title.slice(0, 55), '->', best.c.properties.Name, best.km.toFixed(2) + ' km');
    if (flags.dry) continue;
    const shape: PinSiteShapeJson = {
      geojson: {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: roundCoords(best.c.geometry.coordinates) }, properties: { kind: 'route', lengthM: best.c.properties.length, altitudeM: best.c.properties.altitude, opened: best.c.properties.opened, firstGp: best.c.properties.firstgp } }],
      },
      source: 'f1-circuits (OpenStreetMap)',
      sourceUrl: SOURCE_URL,
    };
    await saveSiteShape(pin.id, shape);
    saved++;
  }
  console.log(`${pins.length} race pins without outlines; ${flags.dry ? 'would save' : 'saved'} ${flags.dry ? pins.length - unmatched.length : saved}; ${unmatched.length} unmatched`);
  for (const u of unmatched) console.log('  unmatched:', u);
  process.exit(0);
}

main();
