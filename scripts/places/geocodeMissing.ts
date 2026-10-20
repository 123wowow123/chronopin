// Gives coordinates to pins that have an address but no location, by forward
// geocoding the address with Nominatim (OpenStreetMap): at most a request a
// second, a User-Agent that says who is asking. The Japanese restaurant pins
// carry a street address ending in the city and no country, so each address is
// tried whole, then as its ward and city ("Chuo-ku, Sapporo, Japan"); a pin
// neither finds is left without a location rather than put at its city's
// centre. Results are written to docs/ so production, whose pin ids differ,
// can apply them by address.
//
//   npx tsx scripts/places/geocodeMissing.ts                 geocode, write the json, change nothing
//   npx tsx scripts/places/geocodeMissing.ts --apply         also set the locations in this database
//   npx tsx scripts/places/geocodeMissing.ts --cities Kyoto,Osaka,Tokyo --country jp --suffix Japan
//   npx tsx scripts/places/geocodeMissing.ts --cities all     every pin whose address names a city (not a bare country)

import '../env';
import { parseArgs } from 'node:util';
import { writeFileSync } from 'node:fs';
import * as db from '@/server/db';
import { cityOf } from '@/lib/city';

const { values: flags } = parseArgs({
  options: { apply: { type: 'boolean' }, cities: { type: 'string', default: 'Nagoya,Fukuoka,Sapporo' }, country: { type: 'string', default: 'jp' }, suffix: { type: 'string', default: 'Japan' } },
});
const ALL = flags.cities === 'all';
const CITIES = new Set(flags.cities!.split(',').map((c) => c.trim().toLowerCase()));
const tail = flags.suffix ? `, ${flags.suffix}` : '';
const HEADERS = { 'User-Agent': 'chronopin (pin location backfill; contact via chronopin.app)' };

let last = 0;
async function search(q: string): Promise<{ lat: number; lon: number } | null> {
  const wait = 1100 - (Date.now() - last);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1${flags.country ? `&countrycodes=${flags.country}` : ''}&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`nominatim ${res.status}`);
  const [hit] = (await res.json()) as { lat: string; lon: string }[];
  return hit ? { lat: Number(hit.lat), lon: Number(hit.lon) } : null;
}

// The address as queries, most particular first: whole, without the floor and
// building, then the last two parts (ward, city).
function queries(address: string): string[] {
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  const street = parts.filter((p) => !/^(\d+F|B\d+F|north|south|east|west)\b/i.test(p));
  const out = [`${address}${tail}`, `${street.join(', ')}${tail}`, `${parts.slice(-2).join(', ')}${tail}`];
  return [...new Set(out)];
}

(async () => {
  const rows = await db.query<{ id: number; address: string }>(
    `SELECT "id", "address" FROM "Pin" WHERE "utcDeletedDateTime" IS NULL AND "location" IS NULL AND "address" IS NOT NULL AND "address" <> ''`,
  );
  const todo = rows.filter((r) => {
    const city = cityOf(r.address);
    return city && (ALL || CITIES.has(city.toLowerCase()));
  });
  const addresses = [...new Set(todo.map((r) => r.address))];
  console.log(`${todo.length} pins, ${addresses.length} addresses`);
  const found: Record<string, { lat: number; lon: number; query: string }> = {};
  const missed: string[] = [];
  for (const address of addresses) {
    let hit = null;
    let used = '';
    for (const q of queries(address).slice(0, 3)) {
      try {
        hit = await search(q);
      } catch (err) {
        console.warn(q, (err as Error).message);
      }
      if (hit) {
        used = q;
        break;
      }
    }
    if (hit) found[address] = { ...hit, query: used };
    else missed.push(address);
  }
  const file = `docs/pin-locations-${ALL ? 'all' : flags.cities!.toLowerCase().replace(/[^a-z,]/g, '').replace(/,/g, '-')}.json`;
  writeFileSync(file, JSON.stringify({ found, missed }, null, 2));
  console.log(`located ${Object.keys(found).length}, missed ${missed.length}; wrote ${file}`);
  if (flags.apply) {
    let n = 0;
    for (const r of todo) {
      const at = found[r.address];
      if (!at) continue;
      await db.query(`UPDATE "Pin" SET "location" = ST_SetSRID(ST_MakePoint($2::double precision, $3::double precision), 4326)::geography WHERE "id" = $1 AND "location" IS NULL`, [r.id, at.lon, at.lat]);
      n++;
    }
    console.log(`set ${n} pins' locations`);
  }
  process.exit(0);
})();
