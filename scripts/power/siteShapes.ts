// Traces each data-centre pin's site outline and parts (PinSiteShape, 0203) from
//   - Data Center Tracker (trackdatacenters.com): campus boundary polygons
//   - Epoch AI (epoch.ai/data/data-centers): satellite-annotated buildings,
//     cooling plant, backup generators, substations and power generation
// in .scrape/datacenter-stats-2026-10-21/. Pins are matched 1-to-1 to records by
// nearest distance (within MATCH_KM), after Epoch pins are matched exactly by
// the handle in their source URL or note.
//
//   npx tsx scripts/power/siteShapes.ts            local database
//   npx tsx scripts/power/siteShapes.ts --dry      matching only, nothing written
//   npx tsx scripts/power/siteShapes.ts --prod     send the local rows to production

import '../env';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { epochKind, roundCoords, type PinSiteShapeJson, type SiteFeature } from '@/lib/siteShape';
import { saveSiteShape } from '@/server/model/pinSiteShape';

const { values: flags } = parseArgs({ options: { dry: { type: 'boolean', default: false }, prod: { type: 'boolean', default: false }, base: { type: 'string' } } });
const DIR = '.scrape/datacenter-stats-2026-10-21/';
const MATCH_KM = 3;
const EPOCH_URL = 'https://epoch.ai/data/data-centers';
const tdcUrl = (state: unknown) => `https://trackdatacenters.com/usa/${slugify(String(state || ''))}`.replace(/\/usa\/$/, '/usa');

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lon2 - lon1) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
}

type PinRow = { id: number; title: string; sourceUrl: string | null; note: string | null; lat: number; lon: number };
type Parts = { source: string; sourceUrl: string; features: SiteFeature[] };

const feature = (kind: SiteFeature['properties']['kind'], g: any): SiteFeature | null =>
  g && ['Polygon', 'MultiPolygon', 'LineString'].includes(g.type) && Array.isArray(g.coordinates)
    ? { type: 'Feature', geometry: { type: g.type, coordinates: roundCoords(g.coordinates) }, properties: { kind } }
    : null;

const words = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter((w) => w.length > 1 || /\d/.test(w));
const STOP = new Set(['data', 'center', 'centre', 'campus', 'the', 'and', 'of', 'in']);

// Whether a record named `name`, `km` from a pin, is plausibly the pin's own site:
// right on top of it, or the same operator (first word, when `operator`) and at
// least half of the record's other words in the pin's title - and no other
// number where the record has one ("Richmond 2" is not "Richmond 1").
function plausible(pinTitle: string, name: string, km: number, operator: boolean) {
  if (km <= 0.5) return true;
  const title = new Set(words(pinTitle));
  const ws = words(name).filter((w) => !STOP.has(w));
  if (!ws.length) return false;
  if (operator && !title.has(ws[0])) return false;
  const nums = ws.filter((w) => /^\d+$/.test(w));
  if (nums.some((n) => !title.has(n)) && [...title].some((w) => /^\d+$/.test(w) && !nums.includes(w))) return false;
  return ws.filter((w) => title.has(w)).length / ws.length >= 0.5;
}

// Greedy nearest-first 1-to-1 assignment of pins to records.
function assign<R>(pins: PinRow[], records: { rec: R; name: string; lat: number; lon: number }[], operator: boolean, taken = new Set<number>()) {
  const pairs: { pin: PinRow; rec: R; km: number }[] = [];
  for (const pin of pins) {
    if (taken.has(pin.id)) continue;
    for (const r of records) {
      const km = haversineKm(pin.lat, pin.lon, r.lat, r.lon);
      if (km <= MATCH_KM && plausible(pin.title, r.name, km, operator)) pairs.push({ pin, rec: r.rec, km });
    }
  }
  pairs.sort((a, b) => a.km - b.km);
  const usedRec = new Set<R>();
  const out = new Map<number, R>();
  for (const p of pairs) {
    if (out.has(p.pin.id) || usedRec.has(p.rec)) continue;
    out.set(p.pin.id, p.rec);
    usedRec.add(p.rec);
  }
  return out;
}

async function local() {
  const pins = await db.query<PinRow>(`
    SELECT p."id", p."title", p."sourceUrl", dc."note", ST_Y(p."location"::geometry) AS "lat", ST_X(p."location"::geometry) AS "lon"
    FROM "Pin" p JOIN "PinDatacenter" dc ON dc."pinId" = p."id"
    WHERE p."utcDeletedDateTime" IS NULL AND p."location" IS NOT NULL`);
  console.log(`${pins.length} data-centre pins with a location`);

  const epoch: any[] = JSON.parse(fs.readFileSync(DIR + 'epoch_map_unwrapped.json', 'utf8')).dataCenters.filter((e: any) => e.shapes?.features?.length && Array.isArray(e.lngLat));
  const tdc: any[] = JSON.parse(fs.readFileSync(DIR + 'trackdatacenters.json', 'utf8')).filter((t: any) => t.geojson || t.sites?.some((s: any) => s.geojson));

  // Epoch: exact by the handle, then by distance.
  const epochById = new Map<number, any>();
  const epochTaken = new Set<any>();
  for (const pin of pins) {
    const e = epoch.find((x) => !epochTaken.has(x) && (pin.sourceUrl === `${EPOCH_URL}#${slugify(String(x.id))}` || pin.note?.includes(`(${x.id})`) || pin.note?.endsWith(`: ${x.id}`)));
    if (e) {
      epochById.set(pin.id, e);
      epochTaken.add(e);
    }
  }
  const nearEpoch = assign(pins, epoch.filter((e) => !epochTaken.has(e)).map((e) => ({ rec: e, name: String(e.title ?? e.id), lat: e.lngLat[1], lon: e.lngLat[0] })), true, new Set(epochById.keys()));
  for (const [id, e] of nearEpoch) epochById.set(id, e);

  // Data Center Tracker: the pin's own record by number (#id in the note), then by distance.
  const tdcById = new Map<number, any>();
  const tdcTaken = new Set<any>();
  for (const pin of pins) {
    const m = pin.note?.match(/Tracker #(\d+)/);
    const t = m && tdc.find((x) => !tdcTaken.has(x) && String(x.id) === m[1]);
    if (t) {
      tdcById.set(pin.id, t);
      tdcTaken.add(t);
    }
  }
  const nearTdc = assign(pins, tdc.filter((t) => !tdcTaken.has(t)).map((t) => ({ rec: t, name: String(t.name ?? ''), lat: Number(t.lat), lon: Number(t.lon) })), false, new Set(tdcById.keys()));
  for (const [id, t] of nearTdc) tdcById.set(id, t);

  const result = new Map<number, PinSiteShapeJson>();
  for (const pin of pins) {
    const features: SiteFeature[] = [];
    const sources: string[] = [];
    let sourceUrl: string | null = null;
    const t = tdcById.get(pin.id);
    if (t) {
      const geoms = t.sites?.filter((s: any) => s.geojson).map((s: any) => s.geojson) ?? [];
      for (const g of geoms.length ? geoms : [t.geojson]) {
        const f = feature('site', g);
        if (f) features.push(f);
      }
      if (features.length) {
        sources.push('Data Center Tracker');
        sourceUrl = tdcUrl(t.state);
      }
    }
    const e = epochById.get(pin.id);
    if (e) {
      let added = 0;
      for (const x of e.shapes.features) {
        const kind = epochKind(x.properties?.type);
        const f = kind && feature(kind, x.geometry);
        if (f) {
          features.push(f);
          added++;
        }
      }
      if (added) {
        sources.push('Epoch AI');
        sourceUrl = sources.length === 1 ? `${EPOCH_URL}` : sourceUrl;
      }
    }
    if (features.length) result.set(pin.id, { geojson: { type: 'FeatureCollection', features }, source: sources.join(' + '), sourceUrl });
  }
  return { pins, result, epochCount: epochById.size, tdcCount: tdcById.size };
}

async function main() {
  const { pins, result, epochCount, tdcCount } = await local();
  const kinds: Record<string, number> = {};
  for (const r of result.values()) for (const f of r.geojson.features) kinds[f.properties.kind] = (kinds[f.properties.kind] ?? 0) + 1;
  console.log(`matched ${epochCount} Epoch AI and ${tdcCount} Data Center Tracker records; ${result.size} pins get outlines`, kinds);
  if (flags.dry) {
    for (const [id, r] of [...result].slice(0, 8)) console.log(id, pins.find((p) => p.id === id)!.title.slice(0, 70), '|', r.source, r.geojson.features.length);
    return;
  }
  if (!flags.prod) {
    await db.query(`DELETE FROM "PinSiteShape"`);
    for (const [id, shape] of result) await saveSiteShape(id, shape);
    console.log(`saved ${result.size} PinSiteShape rows locally`);
    return;
  }
  await prod(pins, result);
}

// Production: pins are found there by sourceUrl, as the other prod scripts do.
async function prod(pins: PinRow[], result: Map<number, PinSiteShapeJson>) {
  const base = (flags.base ?? 'https://www.chronopin.com').replace(/\/$/, '');
  const call = async (method: string, route: string, token: string, body?: unknown) => {
    const res = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', 'User-Agent': 'chronopin-siteshape/1.0', Authorization: `Bearer ${token}` }, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text();
    let data: any = text;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // not JSON
    }
    return { status: res.status, data };
  };
  const tokenFile = path.resolve('.scrape/admin.token');
  const token = fs.existsSync(tokenFile) ? fs.readFileSync(tokenFile, 'utf8').trim() : '';
  if (!token || !(await call('GET', '/api/users/me', token)).data?.id) throw new Error('No valid saved admin token: run scripts/power/datacenterProd.ts once to sign in.');
  const check = await call('GET', '/api/admin/db/PinSiteShape?limit=1', token);
  if (check.status !== 200) throw new Error(`PinSiteShape is not on the server yet (${check.status}): deploy migration 0203 first.`);

  const rows: any[] = [];
  const problems: string[] = [];
  const CONCURRENCY = 12;
  const entries = [...result];
  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    await Promise.all(
      entries.slice(i, i + CONCURRENCY).map(async ([id, shape]) => {
        const pin = pins.find((p) => p.id === id)!;
        const found = pin.sourceUrl ? await call('GET', `/api/admin/db/Pin?sourceUrl=${encodeURIComponent(pin.sourceUrl)}&utcDeletedDateTime.null=true&limit=5`, token) : null;
        const matches: { id: number }[] = found?.data?.rows ?? [];
        if (matches.length !== 1) return void problems.push(`${pin.title.slice(0, 60)}: ${matches.length} pins on the server with that sourceUrl, skipped`);
        rows.push({ pinId: matches[0].id, geojson: shape.geojson, source: shape.source, sourceUrl: shape.sourceUrl });
      }),
    );
  }
  for (let i = 0; i < rows.length; i += 25) {
    const res = await call('POST', '/api/admin/db/PinSiteShape?upsert=1', token, rows.slice(i, i + 25));
    if (res.status !== 201) problems.push(`upsert batch ${i}: ${res.status} ${JSON.stringify(res.data).slice(0, 200)}`);
  }
  const after = await call('GET', '/api/admin/db/PinSiteShape?limit=1', token);
  for (const p of problems) console.log(`problem: ${p}`);
  console.log(`sent ${rows.length} rows (server PinSiteShape total now ${after.data?.total}), ${problems.length} problems`);
  process.exitCode = problems.length ? 1 : 0;
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
  });
