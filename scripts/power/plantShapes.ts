// Draws solar, nuclear and hydro power-plant pins' outlines on their maps
// (PinSiteShape, 0203) from OpenStreetMap: power=plant boundaries as 'site' and
// power=generator areas as 'power'. A pin is matched only to a plant whose
// generator:source agrees with its tag and whose outline contains the pin or lies
// within MATCH_M of it. OSM data is ODbL, so the source is credited as
// OpenStreetMap with the element's own URL. Pins that already have a shape stay.
//
//   npx tsx scripts/power/plantShapes.ts --dry                 matching only
//   npx tsx scripts/power/plantShapes.ts --tags Solar,Nuclear  local database
//   npx tsx scripts/power/plantShapes.ts --restore             saved copies back into the database
//
// Each saved shape is also kept as .scrape/plant-shapes/<pinId>.json (git-ignored),
// so rows lost from the table can be restored without asking Overpass again.

import '../env';
import fs from 'node:fs';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { roundCoords, type PinSiteShapeJson, type SiteFeature } from '@/lib/siteShape';
import { saveSiteShape } from '@/server/model/pinSiteShape';

const { values: flags } = parseArgs({ options: { dry: { type: 'boolean', default: false }, tags: { type: 'string', default: 'Solar,Nuclear,Hydropower' }, limit: { type: 'string' }, restore: { type: 'boolean', default: false } } });
const MATCH_M = 1000;
const CONCURRENCY = 1;
const SERVER = 'https://overpass-api.de/api/interpreter';
const KEEP = '.scrape/plant-shapes/';
const SOURCE_OF: Record<string, string[]> = { Solar: ['solar'], Nuclear: ['nuclear'], Hydropower: ['hydro'] };
type Pt = [number, number];
type Ring = Pt[];
type El = { type: 'way' | 'relation'; id: number; tags?: Record<string, string>; geometry?: { lat: number; lon: number }[]; members?: { role: string; geometry?: { lat: number; lon: number }[] }[] };

const words = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
const GENERIC = new Set(['power', 'plant', 'station', 'solar', 'farm', 'park', 'nuclear', 'generating', 'generation', 'hydro', 'hydroelectric', 'dam', 'energy', 'project', 'the', 'of', 'and', 'unit', 'units', 'phase', 'facility', 'center', 'centre', 'llc', 'inc', 'csg', 'lp']);

// Whether an OSM plant is the pin's own: it shares a distinctive name word with the
// pin's title, and carries no one-character designator ("B", "2") the title lacks
// - Sizewell B is not Sizewell C, and an unnamed "Unit 1" is nobody's.
function sameName(title: string, name: string | undefined) {
  if (!name) return false;
  const t = new Set(words(title));
  const w = words(name).filter((x) => !GENERIC.has(x));
  if (!w.length || w.filter((x) => t.has(x)).length / w.length < 0.6) return false;
  return w.filter((x) => x.length === 1 || /^\d+$/.test(x)).every((x) => t.has(x));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const closed = (r: Ring) => r.length >= 4 && r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1];

function rings(el: El): Ring[] {
  const out: Ring[] = [];
  if (el.type === 'way' && el.geometry) out.push(el.geometry.map((p): Pt => [p.lon, p.lat]));
  for (const m of el.members ?? []) if (m.role === 'outer' && m.geometry) out.push(m.geometry.map((p): Pt => [p.lon, p.lat]));
  return out.filter(closed);
}

const inRing = (x: number, y: number, r: Ring) => {
  let inside = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) if (r[i][1] > y !== r[j][1] > y && x < ((r[j][0] - r[i][0]) * (y - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0]) inside = !inside;
  return inside;
};
// Metres from the point to the nearest vertex (0 when inside): a plant outline's vertices are close together.
function distM(lat: number, lon: number, rs: Ring[]) {
  if (rs.some((r) => inRing(lon, lat, r))) return 0;
  let best = Infinity;
  for (const r of rs) for (const [x, y] of r) best = Math.min(best, Math.hypot((x - lon) * 111320 * Math.cos((lat * Math.PI) / 180), (y - lat) * 111320));
  return best;
}

async function overpass(lat: number, lon: number): Promise<El[]> {
  const src = '["plant:source"~"solar|nuclear|hydro"]';
  const gen = '["generator:source"~"solar|nuclear|hydro"]';
  const q = `[out:json][timeout:60];(way[power=plant]${src}(around:${MATCH_M},${lat},${lon});relation[power=plant]${src}(around:${MATCH_M},${lat},${lon});way[power=generator]${gen}(around:${MATCH_M},${lat},${lon}););out geom;`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(SERVER, { method: 'POST', headers: { 'User-Agent': 'chronopin-plants/1.0', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ data: q }), signal: AbortSignal.timeout(70000) });
      if (res.ok) return (await res.json()).elements ?? [];
    } catch {
      // timed out: try again
    }
    await sleep(5000 * attempt);
  }
  throw new Error('Overpass failed');
}

async function restore() {
  let n = 0;
  for (const f of fs.existsSync(KEEP) ? fs.readdirSync(KEEP).filter((x) => x.endsWith('.json')) : []) {
    const id = Number(f.replace('.json', ''));
    const [pin] = await db.query(`SELECT 1 FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [id]);
    if (!pin) continue;
    await saveSiteShape(id, JSON.parse(fs.readFileSync(KEEP + f, 'utf8')));
    n++;
  }
  console.log(`restored ${n} shapes`);
}

async function main() {
  if (flags.restore) return restore();
  const tags = flags.tags!.split(',').map((t) => t.trim()).filter((t) => SOURCE_OF[t]);
  const pins = await db.query<{ id: number; title: string; tag: string; lat: number; lon: number }>(
    `SELECT DISTINCT ON (p."id") p."id", p."title", t."name"::text AS "tag", ST_Y(p."location"::geometry) AS "lat", ST_X(p."location"::geometry) AS "lon"
     FROM "Pin" p JOIN "PinTag" t ON t."pinId" = p."id" AND t."name" = ANY($1::citext[])
     WHERE p."utcDeletedDateTime" IS NULL AND p."location" IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM "PinSiteShape" s WHERE s."pinId" = p."id")
     ORDER BY p."id"`, [tags]);
  const todo = flags.limit ? pins.slice(0, Number(flags.limit)) : pins;
  console.log(`${todo.length} candidate pins (${tags.join(', ')})`);
  let matched = 0;
  const handle = async (pin: (typeof todo)[number]) => {
    const wanted = SOURCE_OF[pin.tag.replace(/^./, (c) => c.toUpperCase())] ?? SOURCE_OF[pin.tag];
    let els: El[];
    try {
      els = await overpass(pin.lat, pin.lon);
    } catch (e: any) {
      console.log(pin.id, 'overpass error', e.message);
      return;
    }
    const cands = els
      .map((el) => ({ el, rs: rings(el) }))
      .filter(({ el, rs }) => rs.length && wanted.some((w) => (el.tags?.['plant:source'] ?? el.tags?.['generator:source'] ?? '').split(';').includes(w)) && distM(pin.lat, pin.lon, rs) <= MATCH_M && sameName(pin.title, el.tags?.name));
    const plant = cands.filter((c) => c.el.tags?.power === 'plant').sort((a, b) => distM(pin.lat, pin.lon, a.rs) - distM(pin.lat, pin.lon, b.rs))[0];
    const use = !plant ? [] : [plant, ...cands.filter((c) => c.el.tags?.power === 'generator' && c.rs.some((r) => r.some(([x, y]) => plant.rs.some((pr) => inRing(x, y, pr)))))];
    if (!use.length) return;
    const features: SiteFeature[] = use.map(({ el, rs }) => ({
      type: 'Feature',
      geometry: rs.length === 1 ? { type: 'Polygon', coordinates: roundCoords([rs[0]]) } : { type: 'MultiPolygon', coordinates: roundCoords(rs.map((r) => [r])) },
      properties: { kind: el.tags?.power === 'plant' ? 'site' : 'power' },
    }));
    const first = use[0].el;
    const shape: PinSiteShapeJson = { geojson: { type: 'FeatureCollection', features }, source: 'OpenStreetMap', sourceUrl: `https://www.openstreetmap.org/${first.type}/${first.id}` };
    matched++;
    console.log(pin.id, pin.title.slice(0, 60), '|', first.tags?.name ?? first.id, features.length);
    if (!flags.dry) {
      await saveSiteShape(pin.id, shape);
      fs.mkdirSync(KEEP, { recursive: true });
      fs.writeFileSync(`${KEEP}${pin.id}.json`, JSON.stringify(shape));
    }
    };
  for (let i = 0; i < todo.length; i += CONCURRENCY) await Promise.all(todo.slice(i, i + CONCURRENCY).map(handle));
  console.log(`${matched} of ${todo.length} pins ${flags.dry ? 'would get' : 'got'} outlines`);
}

main().then(() => process.exit(0), (e) => { console.error(e.message); process.exit(1); });
