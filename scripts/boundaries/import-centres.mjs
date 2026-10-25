// Fill reviewed missing map coordinates. Never replace an existing location.
import fs from 'node:fs';
import { parseArgs, isDeepStrictEqual } from 'node:util';
const { values: flags } = parseArgs({ options: { manifest: { type: 'string' }, base: { type: 'string', default: 'http://localhost:3000' }, 'token-file': { type: 'string' }, dry: { type: 'boolean', default: false } } });
if (!flags.manifest || !flags['token-file']) throw new Error('--manifest and --token-file are required');
const base = new URL(flags.base);
if (base.protocol !== 'https:' && !(base.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(base.hostname))) throw new Error('HTTPS required');
const token = fs.readFileSync(flags['token-file'], 'utf8').trim();
const entries = JSON.parse(fs.readFileSync(flags.manifest, 'utf8'));
const fields = ['userId', 'title', 'address', 'description', 'longFormSummary', 'utcStartDateTime', 'utcEndDateTime', 'sourceUrl', 'parentId'];
async function call(route, body) {
  const r = await fetch(new URL(route, base), { method: body === undefined ? 'GET' : 'PATCH', redirect: 'error', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`Admin API ${r.status}`);
  return r.json();
}
const prepared = [];
for (const e of entries) {
  if (!Number.isSafeInteger(e.pinId) || !Number.isFinite(e.latitude) || !Number.isFinite(e.longitude) || Math.abs(e.latitude) > 90 || Math.abs(e.longitude) > 180 || new URL(e.sourceUrl).protocol !== 'https:') throw new Error('Invalid reviewed coordinate');
  const p = (await call(`/api/admin/db/Pin?id=${e.pinId}&limit=1`)).rows[0];
  if (!p || p.title !== e.pinTitle || p.address !== e.address) throw new Error('Pin match changed ' + e.pinId);
  const location = `SRID=4326;POINT(${e.longitude} ${e.latitude})`;
  if (p.location !== null && p.location !== location) throw new Error('Existing location must be preserved ' + e.pinId);
  prepared.push({ e, p, location });
}
for (const { e, p, location } of prepared) {
  if (p.location === location) { console.log(`Already set ${e.pinId}`); continue; }
  if (flags.dry) { console.log(`DRY missing coordinate ${e.pinId}`); continue; }
  fs.mkdirSync('.scrape/boundary-centres', { recursive: true });
  fs.writeFileSync(`.scrape/boundary-centres/${e.pinId}-before.json`, JSON.stringify(p));
  const q = new URLSearchParams({ id: String(e.pinId), title: e.pinTitle, address: e.address, 'location.null': 'true' });
  const rows = (await call('/api/admin/db/Pin?' + q, { location })).rows;
  if (rows.length !== 1 || rows[0].location !== location || fields.some(field => !isDeepStrictEqual(p[field], rows[0][field]))) throw new Error('Coordinate save verification failed ' + e.pinId);
  console.log(`Verified missing coordinate ${e.pinId}`);
}
