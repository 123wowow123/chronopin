// Draws each sitting member of Congress's seat on their person page: the
// House district (Census TIGERweb, 119th Congress) or, for a senator, the
// state. The seat comes from Person.office ("United States Representative
// from Florida's 28th congressional district"); anyone whose office names no
// seat (a leader's title, a delegate) is skipped and listed.
//
//   npx tsx scripts/people/districts.ts --dry      what would be written
//   npx tsx scripts/people/districts.ts            write local PersonDistrict
//   npx tsx scripts/people/districts.ts --prod     send the local rows to prod
//                                                  (matched by Person slug)
//
// Geometry is simplified server-side by TIGERweb (--tol degrees, 4 decimals).

import '../env';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { seatOf, type PersonDistrictJson } from '@/lib/personDistrict';

const { values: flags } = parseArgs({
  options: { dry: { type: 'boolean', default: false }, prod: { type: 'boolean', default: false }, base: { type: 'string' }, tol: { type: 'string', default: '0.003' } },
});

const ROOT = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb';
const DISTRICTS = `${ROOT}/Legislative/MapServer/4`; // 119th Congressional Districts
const STATES = `${ROOT}/State_County/MapServer/0`;
const PAGE = 'https://www.census.gov/programs-surveys/decennial-census/about/rdo/congressional-districts.119th_Congress.html';

async function query(layer: string, where: string, fields: string, tol = Number(flags.tol)): Promise<{ properties: Record<string, string>; geometry: { type: string; coordinates: unknown } }[]> {
  const url = `${layer}/query?where=${encodeURIComponent(where)}&outFields=${fields}&outSR=4326&maxAllowableOffset=${tol}&geometryPrecision=4&f=geojson`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': 'chronopin (person districts)' } });
    if (res.ok) {
      const body = (await res.json()) as { features?: never[]; error?: unknown; exceededTransferLimit?: boolean };
      if (!body.error && !body.exceededTransferLimit) return body.features ?? [];
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error(`TIGERweb failed: ${where}`);
}

async function build(): Promise<{ slug: string; row: PersonDistrictJson }[]> {
  const people = await db.query<{ id: number; slug: string; name: string; office: string; jurisdiction: string | null; role: string }>(
    `SELECT "id", "slug", "name", "office", "jurisdiction", "role" FROM "Person" WHERE "leftOfficeDate" IS NULL AND "role" IN ('senator', 'representative') ORDER BY "name"`,
  );
  const states = new Map<string, { fips: string; geometry: { type: string; coordinates: unknown } }>();
  for (const f of await query(STATES, '1=1', 'STATE,NAME', 0.005)) states.set(f.properties.NAME, { fips: f.properties.STATE, geometry: f.geometry });
  const out: { slug: string; row: PersonDistrictJson }[] = [];
  const skipped: string[] = [];
  for (const p of people) {
    // A Senate leader's title names no state; the person's jurisdiction does. A House leader's names no district, so it is skipped.
    const seat = seatOf(p.office) ?? (p.role === 'senator' && p.jurisdiction && states.has(p.jurisdiction) && !/^Former/i.test(p.office) ? { state: p.jurisdiction, district: null, house: false } : null);
    const state = seat && states.get(seat.state);
    if (!seat || !state) { skipped.push(`${p.name}: ${p.office}`); continue; }
    if (!seat.house) {
      out.push({ slug: p.slug, row: { label: seat.state, vintage: 'Census TIGERweb states, current', source: 'U.S. Census Bureau TIGERweb', sourceUrl: STATES, geojson: { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { name: seat.state }, geometry: state.geometry }] } } });
      continue;
    }
    // At-large seats are district 00 in the Census data.
    const code = String(seat.district ?? 0).padStart(2, '0');
    const found = await query(DISTRICTS, `GEOID='${state.fips}${code}'`, 'GEOID,NAME');
    const hit = found;
    if (hit.length !== 1) { skipped.push(`${p.name}: ${found.length} districts for ${seat.state} ${code}`); continue; }
    const label = seat.district ? `${seat.state} ${seat.district}` : `${seat.state} at-large`;
    out.push({ slug: p.slug, row: { label, vintage: '119th Congress (2025-2027)', source: 'U.S. Census Bureau TIGERweb', sourceUrl: PAGE, geojson: { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { name: label, geoid: hit[0].properties.GEOID }, geometry: hit[0].geometry }] } } });
  }
  for (const s of skipped) console.log(`skipped ${s}`);
  return out;
}

// --- prod ---
const BASE = (flags.base ?? 'https://www.chronopin.com').replace(/\/$/, '');
async function call(method: string, route: string, token?: string, body?: unknown) {
  const res = await fetch(BASE + route, { method, headers: { 'Content-Type': 'application/json', 'User-Agent': 'chronopin-person-districts/1.0', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let data: any = text;
  try { data = text ? JSON.parse(text) : null; } catch {}
  return { status: res.status, data };
}
async function signIn(): Promise<string> {
  const { host } = new URL(BASE);
  const tokenFile = path.resolve(host === 'www.chronopin.com' ? '.scrape/admin.token' : `.scrape/admin-${host.replace(/\W+/g, '_')}.token`);
  const kept = existsSync(tokenFile) ? readFileSync(tokenFile, 'utf8').trim() : '';
  if (kept && (await call('GET', '/api/users/me', kept)).data?.id) return kept;
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error('No valid saved admin token and no ADMIN_PASSWORD in .env.local.');
  const login = await call('POST', '/auth/local', undefined, { email: 'flynni2008@gmail.com', password });
  if (login.status !== 200 || !login.data?.token) throw new Error(`sign-in failed: ${login.status}`);
  mkdirSync(path.dirname(tokenFile), { recursive: true });
  writeFileSync(tokenFile, login.data.token, { mode: 0o600 });
  return login.data.token as string;
}

async function main() {
  if (flags.prod) {
    const token = await signIn();
    const check = await call('GET', '/api/admin/db/PersonDistrict?limit=1', token);
    if (check.status !== 200) throw new Error(`PersonDistrict is not on the server yet (${check.status}): deploy migration 0231 first.`);
    const local = await db.query<{ slug: string } & PersonDistrictJson>(
      `SELECT "p"."slug", "d"."label", "d"."geojson", "d"."vintage", "d"."source", "d"."sourceUrl" FROM "PersonDistrict" "d" JOIN "Person" "p" ON "p"."id" = "d"."personId"`,
    );
    const prod = new Map<string, number>();
    for (let offset = 0; ; offset += 500) {
      const page = await call('GET', `/api/admin/db/Person?limit=500&offset=${offset}&order=id`, token);
      for (const r of page.data?.rows ?? []) prod.set(r.slug, r.id);
      if (!page.data?.rows?.length || offset + 500 >= page.data.total) break;
    }
    const rows = local.filter((l) => prod.has(l.slug)).map((l) => ({ personId: prod.get(l.slug), label: l.label, geojson: l.geojson, vintage: l.vintage, source: l.source, sourceUrl: l.sourceUrl }));
    console.log(`${rows.length} of ${local.length} local seats match a prod person by slug`);
    if (flags.dry) return;
    for (let i = 0; i < rows.length; i += 25) {
      const res = await call('POST', '/api/admin/db/PersonDistrict?upsert=1', token, rows.slice(i, i + 25));
      if (res.status !== 201) throw new Error(`upsert ${i}: ${res.status} ${JSON.stringify(res.data).slice(0, 200)}`);
    }
    console.log(`sent ${rows.length}; server total ${(await call('GET', '/api/admin/db/PersonDistrict?limit=1', token)).data?.total}`);
    return;
  }
  const built = await build();
  console.log(`${built.length} seats built`);
  if (flags.dry) return;
  for (const { slug, row } of built) {
    await db.query(
      `INSERT INTO "PersonDistrict" ("personId", "label", "geojson", "vintage", "source", "sourceUrl", "checkedAt")
       SELECT "id", $2, $3::jsonb, $4, $5, $6, now() FROM "Person" WHERE "slug" = $1
       ON CONFLICT ("personId") DO UPDATE SET "label" = $2, "geojson" = $3::jsonb, "vintage" = $4, "source" = $5, "sourceUrl" = $6, "checkedAt" = now()`,
      [slug, row.label, JSON.stringify(row.geojson), row.vintage, row.source, row.sourceUrl],
    );
  }
  console.log('written');
}

main().then(() => process.exit(0), (e) => { console.error(e.message); process.exit(1); });
