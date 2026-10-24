// Draws a pin's pipeline or power line on its map (PinSiteShape, 0203, kind
// 'pipeline' or 'powerline') from OpenStreetMap ways and relations named by id.
// The geometry is simplified (Douglas-Peucker, --tol degrees) so a line thousands
// of kilometres long stays small. OSM data is ODbL, so the source is credited as
// OpenStreetMap with the first element's URL. A pin that already has a shape gets the
// line added to it, not replaced.
//
//   npx tsx scripts/routes/osmLine.ts --kind pipeline --relation 123 --way 456,789 --pins 2472
//   npx tsx scripts/routes/osmLine.ts --kind powerline --relation 123 --pins 4947 --dry

import '../env';
import fs from 'node:fs';
import { parseArgs } from 'node:util';
import { roundCoords, type PinSiteShapeJson, type SiteFeature } from '@/lib/siteShape';
import { saveSiteShape, siteShapeForPin } from '@/server/model/pinSiteShape';

const { values: flags } = parseArgs({
  options: { kind: { type: 'string' }, relation: { type: 'string' }, way: { type: 'string' }, pins: { type: 'string' }, tol: { type: 'string', default: '0.0005' }, dry: { type: 'boolean', default: false } },
});
type Pt = [number, number];
type Geom = { lat: number; lon: number }[];
type El = { type: 'way' | 'relation'; id: number; tags?: Record<string, string>; geometry?: Geom; members?: { type: string; geometry?: Geom }[] };

const ids = (s?: string) => (s ?? '').split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0);

// Douglas-Peucker on [lon, lat], iterative so a 100,000-point line cannot overflow the stack.
function simplify(pts: Pt[], tol: number): Pt[] {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    let worst = 0;
    let at = -1;
    const [x1, y1] = pts[a];
    const [x2, y2] = pts[b];
    const len = Math.hypot(x2 - x1, y2 - y1) || 1e-12;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((x2 - x1) * (y1 - pts[i][1]) - (x1 - pts[i][0]) * (y2 - y1)) / len;
      if (d > worst) {
        worst = d;
        at = i;
      }
    }
    if (at > 0 && worst > tol) {
      keep[at] = 1;
      stack.push([a, at], [at, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

async function fetchElements(query: string): Promise<El[]> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'User-Agent': 'chronopin-lines/1.0', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ data: `[out:json][timeout:180];${query}out geom;` }),
        signal: AbortSignal.timeout(200000),
      });
      if (res.ok) return (await res.json()).elements ?? [];
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 5000 * attempt));
  }
  throw new Error('Overpass failed');
}

async function main() {
  const kind = flags.kind;
  if (kind !== 'pipeline' && kind !== 'powerline') throw new Error('--kind pipeline|powerline is required');
  const rel = ids(flags.relation);
  const way = ids(flags.way);
  const pinIds = ids(flags.pins);
  if (!pinIds.length || !(rel.length || way.length)) throw new Error('--pins and --relation and/or --way are required');
  const els = await fetchElements(`(${rel.map((i) => `relation(${i});`).join('')}${way.map((i) => `way(${i});`).join('')});`);
  const lines: Pt[][] = [];
  for (const el of els) {
    if (el.type === 'way' && el.geometry) lines.push(el.geometry.map((p): Pt => [p.lon, p.lat]));
    for (const m of el.members ?? []) if (m.type === 'way' && m.geometry?.length) lines.push(m.geometry.map((p): Pt => [p.lon, p.lat]));
  }
  if (!lines.length) throw new Error('no geometry found for those ids');
  const tol = Number(flags.tol);
  const slim = lines.map((l) => simplify(l, tol)).filter((l) => l.length >= 2);
  const before = lines.reduce((n, l) => n + l.length, 0);
  const after = slim.reduce((n, l) => n + l.length, 0);
  const first = els[0];
  console.log(`${els.length > 4 ? `${els.length} elements (${first.tags?.name ?? first.id}...)` : els.map((e) => `${e.type}/${e.id} ${e.tags?.name ?? ''}`).join('; ')}: ${lines.length} ways, ${before} -> ${after} points (${Math.round(JSON.stringify(slim).length / 1024)} KB)`);
  const feature: SiteFeature = {
    type: 'Feature',
    geometry: slim.length === 1 ? { type: 'LineString', coordinates: roundCoords(slim[0]) } : { type: 'MultiLineString', coordinates: roundCoords(slim) },
    properties: { kind },
  };
  if (flags.dry) return;
  for (const pinId of pinIds) {
    const old = await siteShapeForPin(pinId);
    const keep = old ? old.geojson.features.filter((f) => f.properties.kind !== kind) : [];
    const shape: PinSiteShapeJson = {
      geojson: { type: 'FeatureCollection', features: [...keep, feature] },
      source: old && old.source !== 'OpenStreetMap' ? `${old.source} + OpenStreetMap` : 'OpenStreetMap',
      sourceUrl: old?.sourceUrl && old.source !== 'OpenStreetMap' ? old.sourceUrl : `https://www.openstreetmap.org/${first.type}/${first.id}`,
    };
    await saveSiteShape(pinId, shape);
    fs.mkdirSync('.scrape/line-shapes', { recursive: true });
    fs.writeFileSync(`.scrape/line-shapes/${pinId}-${kind}.json`, JSON.stringify(shape));
  }
  console.log(`saved for pins ${pinIds.join(', ')}`);
}

main().then(() => process.exit(0), (e) => { console.error(e.message); process.exit(1); });
