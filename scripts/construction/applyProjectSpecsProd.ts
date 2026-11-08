// Apply reviewed project-spec rows (JSON array of {id, units, ... , basis, sourceUrl, note}) to prod through
// PUT /api/pins/:id/project. Dry run by default. Skips pins that already have a row and any id in --hold.
//   npx tsx scripts/construction/applyProjectSpecsProd.ts <rows.json> [--hold 1,2,3] [--apply]
import { readFileSync } from 'node:fs';
const [file] = process.argv.slice(2).filter((a) => !a.startsWith('--') && !/^[\d,]+$/.test(a));
const hold = new Set((process.argv.includes('--hold') ? process.argv[process.argv.indexOf('--hold') + 1].split(',') : []).map(Number));
const apply = process.argv.includes('--apply');
const BASE = 'https://www.chronopin.com';
const H = { Authorization: `Bearer ${readFileSync('.scrape/admin.token', 'utf8').trim()}`, 'Content-Type': 'application/json' };
const Q = ['units', 'affordableUnits', 'rooms', 'seats', 'beds', 'stories', 'sqft', 'acres', 'parking'] as const;
const rows: any[] = JSON.parse(readFileSync(file, 'utf8'));
let ok = 0, bad = 0, held = 0, had = 0, failed = 0;
const seen = new Set<number>();
for (const r of rows) {
  if (hold.has(r.id)) { held++; continue; }
  const errs: string[] = [];
  if (seen.has(r.id)) errs.push('duplicate id'); seen.add(r.id);
  const q = Q.filter((k) => r[k] != null);
  if (!q.length) errs.push('no quantity');
  for (const k of q) if (!(Number(r[k]) > 0)) errs.push(`${k} not positive`);
  if (r.units != null && r.affordableUnits != null && r.affordableUnits > r.units) errs.push('affordable > units');
  if (!['published', 'planned', 'reported'].includes(r.basis)) errs.push('basis');
  if (!/^https:\/\/\S+$/.test(r.sourceUrl ?? '')) errs.push('sourceUrl');
  if (errs.length) { bad++; console.log('INVALID', r.id, errs.join(', ')); continue; }
  if ((await fetch(`${BASE}/api/pins/${r.id}/project`)).status !== 204) { had++; continue; }
  ok++;
  if (!apply) continue;
  const body = Object.fromEntries([...Q, 'basis', 'sourceUrl', 'note'].map((k) => [k, r[k] ?? null]));
  const res = await fetch(`${BASE}/api/pins/${r.id}/project`, { method: 'PUT', headers: H, body: JSON.stringify(body) });
  if (!res.ok) { failed++; console.log('FAILED', r.id, res.status, (await res.text()).slice(0, 120)); }
  await new Promise((x) => setTimeout(x, 300));
}
console.log(`${apply ? 'written' : 'would write'} ${ok}; held ${held}; already have a row ${had}; invalid ${bad}; failed ${failed}`);
