// Replay sourced factory profiles through the same API locally or after deployment.
// npx tsx scripts/factories/capability.ts [--apply] [--base https://www.chronopin.com]
import '../env';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { parseArgs, isDeepStrictEqual } from 'node:util';
import { factoryProblem } from '@/server/model/pinFactory';
import type { FactoryProfile } from '@/lib/pinFactory';

const { values } = parseArgs({ options: { apply: { type: 'boolean', default: false }, base: { type: 'string', default: 'http://127.0.0.1:3000' } } });
const base = values.base!.replace(/\/$/, '');
const environment = base === 'https://www.chronopin.com' ? 'production' : 'local';
if (!['http://127.0.0.1:3000', 'http://localhost:3000', 'https://www.chronopin.com'].includes(base)) throw Error('Use the known local or production API; credentials are never sent to another host.');
type Entry = { key: string; pinIds: { local: number; production: number }; title: string; sourceUrl: string; profile: FactoryProfile };
const entries: Entry[] = JSON.parse(readFileSync(new URL('./capability.json', import.meta.url), 'utf8'));
let token: string | undefined;
async function call(method: string, path: string, body?: unknown) {
  const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), redirect: 'error', signal: AbortSignal.timeout(180_000) });
  const text = await r.text();
  if (!r.ok) throw Error(`${method} ${path}: ${r.status}${r.status === 404 ? ' — factory API may require deployment; no production migration or deploy is performed by this script.' : ''}`);
  return text ? JSON.parse(text) : null;
}
const results: Record<string, unknown>[] = [];
async function run() {
  for (const e of entries) {
    const profile = factoryProblem(e.profile);
    if (typeof profile === 'string') throw Error(`${e.key}: ${profile}`);
    const id = e.pinIds[environment];
    const pin = await call('GET', `/api/pins/${id}`);
    if (pin.title !== e.title || pin.sourceUrl !== e.sourceUrl) throw Error(`${e.key}: pin identity changed; refusing write.`);
    const cited = new Set([pin.sourceUrl, ...pin.references.map((r: { url: string }) => r.url)]);
    for (const source of [...Object.values(profile.axes).flatMap(a => [...a.sources, ...(a.benchmark?.sources ?? [])]), ...profile.metrics.map(m => m.source)]) {
      if (!cited.has(source.url)) throw Error(`${e.key}: scoring source must first be added to the pin references/wiki: ${source.url}`);
    }
    const before = await call('GET', `/api/pins/${id}/factory`);
    if (before?.source === 'hand') {
      results.push({ key: e.key, pinId: id, status: 'kept-hand' });
      console.log(`${id}: kept hand-entered profile`);
      continue;
    }
    if (!values.apply) { console.log(`${id}: validated ${e.key} (dry run)`); continue; }
    if (!token) {
      if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_EMAIL) throw Error('ADMIN_EMAIL and ADMIN_PASSWORD are required for --apply.');
      ({ token } = await call('POST', '/auth/local', { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }));
    }
    await call('PUT', `/api/pins/${id}/factory`, profile);
    const saved = await call('GET', `/api/pins/${id}/factory`);
    const { checkedAt, ...stored } = saved;
    if (!checkedAt || !isDeepStrictEqual(stored, profile)) throw Error(`${e.key}: saved profile does not match.`);
    const after = await call('GET', `/api/pins/${id}`);
    for (const k of ['title', 'description', 'sourceUrl', 'longFormSummary', 'utcStartDateTime', 'utcEndDateTime', 'price', 'priceCurrency', 'user', 'media', 'references']) {
      if (!isDeepStrictEqual(pin[k], after[k])) throw Error(`${e.key}: unrelated pin field changed: ${k}`);
    }
    results.push({ key: e.key, pinId: id, status: 'verified', checkedAt });
    mkdirSync('.tmp/factory-capability', { recursive: true });
    writeFileSync(`.tmp/factory-capability/${environment}-results.json`, JSON.stringify(results, null, 2));
    console.log(`${id}: ${e.key} saved and verified (${environment})`);
  }
}
run().catch(err => { console.error(err.message); process.exitCode = 1; });
