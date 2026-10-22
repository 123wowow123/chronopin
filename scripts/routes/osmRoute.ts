// Draws a pin's course on its map (PinSiteShape, 0203, kind 'route') from an
// OpenStreetMap route relation: the relation's ways are joined end to end into
// a line (a MultiLineString where the relation has gaps). OSM data is ODbL, so
// the source is credited as OpenStreetMap with the relation's own URL.
//
//   npx tsx scripts/routes/osmRoute.ts --relation 2086183 --pins 5026,5028
//   npx tsx scripts/routes/osmRoute.ts --relation 2086183 --pins 5026 --dry
//
// Marathon courses are rarely mapped as relations (a search of the 12 pin cities
// found only London's, 2026-10-22), so each relation is named by hand.

import '../env';
import { parseArgs } from 'node:util';
import { roundCoords, type PinSiteShapeJson, type SiteFeature } from '@/lib/siteShape';
import { saveSiteShape } from '@/server/model/pinSiteShape';

const { values: flags } = parseArgs({
  options: { relation: { type: 'string' }, pins: { type: 'string' }, dry: { type: 'boolean', default: false } },
});
type Pt = [number, number];
type Member = { type: string; role?: string; geometry?: { lat: number; lon: number }[] };

const same = (a: Pt, b: Pt) => a[0] === b[0] && a[1] === b[1];

// Joins ways that meet at an end into lines, flipping one where needed. A relation
// lists its ways in course order only loosely, so every pair of lines is tried
// until none meets another; what is left is a gap in the mapping.
export function chainWays(ways: Pt[][]): Pt[][] {
  const lines = ways.map((w) => [...w]);
  for (let joined = true; joined; ) {
    joined = false;
    for (let i = 0; i < lines.length && !joined; i++) {
      for (let j = 0; j < lines.length && !joined; j++) {
        if (i === j) continue;
        const a = lines[i];
        const b = lines[j];
        let next: Pt[] | null = null;
        const aEnd = a[a.length - 1];
        const aStart = a[0];
        if (same(aEnd, b[0])) next = [...a, ...b.slice(1)];
        else if (same(aEnd, b[b.length - 1])) next = [...a, ...[...b].reverse().slice(1)];
        else if (same(aStart, b[b.length - 1])) next = [...b, ...a.slice(1)];
        else if (same(aStart, b[0])) next = [...[...b].reverse(), ...a.slice(1)];
        if (!next) continue;
        lines[i] = next;
        lines.splice(j, 1);
        joined = true;
      }
    }
  }
  return lines;
}

async function main() {
  const id = Number(flags.relation);
  const pinIds = (flags.pins ?? '').split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0);
  if (!id || !pinIds.length) throw new Error('--relation <id> and --pins <id,id> are required');
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'User-Agent': 'chronopin-routes/1.0', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ data: `[out:json][timeout:90];relation(${id});out geom;` }),
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}`);
  const rel = (await res.json()).elements?.[0] as { tags?: Record<string, string>; members?: Member[] } | undefined;
  if (!rel?.members) throw new Error(`relation ${id} not found`);
  const ways = rel.members.filter((m) => m.type === 'way' && m.geometry?.length).map((m) => m.geometry!.map((p): Pt => [p.lon, p.lat]));
  const lines = chainWays(ways);
  const geometry: SiteFeature['geometry'] = lines.length === 1 ? { type: 'LineString', coordinates: roundCoords(lines[0]) } : { type: 'MultiLineString', coordinates: roundCoords(lines) };
  const km = rel.tags?.distance ? ` (${rel.tags.distance} km)` : '';
  console.log(`${rel.tags?.name ?? id}${km}: ${ways.length} ways -> ${lines.length} line(s), ${lines.reduce((n, l) => n + l.length, 0)} points`);
  const shape: PinSiteShapeJson = {
    geojson: { type: 'FeatureCollection', features: [{ type: 'Feature', geometry, properties: { kind: 'route' } }] },
    source: 'OpenStreetMap',
    sourceUrl: `https://www.openstreetmap.org/relation/${id}`,
  };
  if (flags.dry) return;
  for (const pinId of pinIds) await saveSiteShape(pinId, shape);
  console.log(`saved for pins ${pinIds.join(', ')}`);
}

main().then(() => process.exit(0), (e) => { console.error(e.message); process.exit(1); });
