// Explicitly reviewed pin-to-boundary matches; no proximity/name guessing.
// npx tsx scripts/boundaries/import.ts --manifest path.json --dry
// npx tsx scripts/boundaries/import.ts --manifest path.json --base http://localhost:3000 --token-file .scrape/admin-local.token
import '../env';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { boundaryShape, mergeBoundary, type BoundaryInput } from '@/lib/boundaryShape';
import type { PinSiteShapeJson } from '@/lib/siteShape';

const { values: flags } = parseArgs({ options: {
  manifest: { type: 'string' }, base: { type: 'string', default: 'http://localhost:3000' },
  'token-file': { type: 'string' }, dry: { type: 'boolean', default: false },
} });

type Entry = BoundaryInput & {
  pinId: number;
  // An exact title guards against local/production ID differences.
  pinTitle: string;
  file?: string;
  url?: string;
  // Select the specific incident/district from a larger collection, if needed.
  match?: { field: string; value: string | number };
};

async function main() {
  if (!flags.manifest) throw new Error('--manifest is required');
  const entries = JSON.parse(readFileSync(flags.manifest, 'utf8')) as Entry[];
  if (!Array.isArray(entries) || !entries.length) throw new Error('Manifest must be a nonempty array');
  const base = new URL(flags.base!);
  if (base.protocol !== 'https:' && !(base.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname))) throw new Error('Use HTTPS outside localhost');
  if (!flags.dry && !flags['token-file']) throw new Error('--token-file is required for saving');
  const token = flags['token-file'] ? readFileSync(flags['token-file'], 'utf8').trim() : '';
  async function call(route: string, body?: unknown): Promise<{ rows: Record<string, unknown>[] }> {
    const response = await fetch(new URL(route, base), {
      method: body === undefined ? 'GET' : 'POST', redirect: 'error',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`Admin API ${response.status} at ${route}`);
    return response.json();
  }
  // Prepare all geometries and pin matches before the first write.
  const prepared: { entry: Entry; shape: PinSiteShapeJson }[] = [];
  const targets = new Set<string>();
  for (const entry of entries) {
    if (!Number.isSafeInteger(entry.pinId) || entry.pinId < 1 || !entry.pinTitle?.trim()) throw new Error('Each entry needs pinId and exact pinTitle');
    const target = `${entry.pinId}-${entry.kind}`;
    if (targets.has(target)) throw new Error(`Duplicate boundary target ${target}; combine its polygons in one entry`);
    targets.add(target);
    if (!!entry.file === !!entry.url) throw new Error('Choose exactly one of file or url');
    let data: unknown;
    if (entry.file) data = JSON.parse(readFileSync(entry.file, 'utf8'));
    else {
      if (new URL(entry.url!).protocol !== 'https:') throw new Error('Boundary download must use HTTPS');
      const response = await fetch(entry.url!, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`Boundary download ${response.status}`);
      data = await response.json();
    }
    if (entry.match) {
      const collection = data as { type?: string; features?: { properties?: Record<string, unknown> }[]; exceededTransferLimit?: boolean };
      if (collection.type !== 'FeatureCollection' || !Array.isArray(collection.features)) throw new Error('match requires a FeatureCollection');
      data = { ...collection, features: collection.features.filter((f) => f.properties?.[entry.match!.field] === entry.match!.value) };
    }
    const shape = boundaryShape(data, entry);
    if (!flags.dry || token) {
      const pins = await call(`/api/admin/db/Pin?id=${entry.pinId}&utcDeletedDateTime.null=true&limit=2`);
      if (pins.rows.length !== 1 || pins.rows[0].title !== entry.pinTitle) throw new Error(`Pin ${entry.pinId}: missing or title mismatch; check this environment's pin ID`);
    }
    prepared.push({ entry, shape });
    console.log(`${flags.dry ? 'DRY ' : ''}${entry.pinId}: ${entry.pinTitle} — ${shape.geojson.features.length} ${entry.kind} polygons`);
  }
  if (flags.dry) return;
  for (const { entry, shape } of prepared) {
    const route = `/api/admin/db/PinSiteShape?pinId=${entry.pinId}&limit=1`;
    const old = (await call(route)).rows[0] as (PinSiteShapeJson & { checkedAt?: string }) | undefined;
    const merged = mergeBoundary(old ?? null, shape);
    mkdirSync('.scrape/boundary-shapes', { recursive: true });
    // Keep the pre-write row for rollback, including existing kinds/credits.
    writeFileSync(`.scrape/boundary-shapes/${entry.pinId}-${entry.kind}-before.json`, JSON.stringify(old ?? null));
    await call('/api/admin/db/PinSiteShape?upsert=1', { pinId: entry.pinId, ...merged, checkedAt: new Date().toISOString() });
    const saved = (await call(route)).rows[0];
    if (!saved || JSON.stringify(saved.geojson) !== JSON.stringify(merged.geojson)) {
      // PostgreSQL jsonb reorders object keys; compare parsed values canonically.
      const { isDeepStrictEqual } = await import('node:util');
      if (!saved || !isDeepStrictEqual(saved.geojson, merged.geojson)) throw new Error(`Pin ${entry.pinId}: saved geometry verification failed`);
    }
    if (saved.source !== merged.source || saved.sourceUrl !== merged.sourceUrl) throw new Error(`Pin ${entry.pinId}: saved source verification failed`);
    writeFileSync(`.scrape/boundary-shapes/${entry.pinId}-${entry.kind}.json`, JSON.stringify({ entry, shape: merged }));
    console.log(`Verified ${entry.pinId}`);
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
