// Pushes the local Epoch pins' PinPerf charts/tables to prod, matching pins by sourceUrl.
//   npx tsx scripts/power/epochTimelinesProd.ts [--dry]
import '../env';
import { readFileSync } from 'node:fs';
import * as db from '@/server/db';

const BASE = 'https://www.chronopin.com';
const DRY = process.argv.includes('--dry');
const token = readFileSync('.scrape/admin.token', 'utf8').trim();
const call = async (method: string, route: string, body?: unknown) => {
  const res = await fetch(BASE + route, { method, headers: { 'Content-Type': 'application/json', 'User-Agent': 'chronopin-datacenter/1.0', Authorization: `Bearer ${token}` }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let data: any = text; try { data = JSON.parse(text); } catch {}
  return { status: res.status, data };
};

async function main() {
  const rows = await db.query<{ sourceUrl: string; charts: unknown; tables: unknown }>(
    `SELECT p."sourceUrl", f."charts", f."tables" FROM "PinPerf" f JOIN "Pin" p ON p."id" = f."pinId"
     WHERE p."utcDeletedDateTime" IS NULL AND p."sourceUrl" LIKE 'https://epoch.ai/data/data-centers#%'`);
  let ok = 0; const bad: string[] = [];
  for (const r of rows) {
    const found = await call('GET', `/api/admin/db/Pin?sourceUrl=${encodeURIComponent(r.sourceUrl)}&utcDeletedDateTime.null=true&limit=3`);
    const m = found.data?.rows ?? [];
    if (m.length !== 1) { bad.push(`${r.sourceUrl}: ${m.length} prod pins`); continue; }
    if (DRY) { ok++; continue; }
    const put = await call('PUT', `/api/pins/${m[0].id}/performance`, { charts: r.charts, tables: r.tables });
    if (put.status >= 300) bad.push(`${r.sourceUrl}: ${put.status} ${JSON.stringify(put.data).slice(0, 150)}`); else ok++;
  }
  console.log(`${DRY ? 'would push' : 'pushed'} ${ok}/${rows.length}`); bad.forEach((b) => console.log('problem:', b));
}
main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
