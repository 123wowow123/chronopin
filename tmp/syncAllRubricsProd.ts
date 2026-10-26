import '../scripts/env';
import { readFileSync } from 'node:fs';
import * as db from '@/server/db';

const BASE = 'https://www.chronopin.com';
const token = readFileSync('.scrape/admin.token', 'utf8').trim();
const TABLES = ['PinTaste', 'PinCarPerf', 'PinGasCarPerf', 'PinAircraftPerf', 'PinLlmPerf', 'PinVideoPerf', 'PinHotel', 'PinDining'];

async function call(method: string, route: string, body?: unknown) {
  const res = await fetch(BASE + route, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data: any = text;
  try { data = text ? JSON.parse(text) : null; } catch {}
  return { status: res.status, data };
}

(async()=>{
  let totalPatched = 0;
  for (const t of TABLES) {
    const rows:any[] = await db.query(`
      select r."pinId", p.title, p."sourceUrl", r.reviews
      from "${t}" r join "Pin" p on p.id = r."pinId"
      where p."utcDeletedDateTime" is null and jsonb_array_length(r.reviews) > 0
    `);
    let tablePatched = 0;
    for (const row of rows) {
      if (!row.sourceUrl) continue;
      const found = await call('GET', `/api/admin/db/Pin?sourceUrl=${encodeURIComponent(row.sourceUrl)}&utcDeletedDateTime.null=true&limit=5`);
      const matches = found.data?.rows ?? [];
      if (matches.length !== 1) continue;
      const id = matches[0].id;
      const there = await call('GET', `/api/admin/db/${t}?pinId=${id}&limit=1`);
      const remote = there.data?.rows?.[0];
      if (!remote) continue;
      const rvs:any[] = typeof remote.reviews === 'string' ? JSON.parse(remote.reviews) : (remote.reviews || []);
      const m = new Map(rvs.map(x=>[x.url, x]));
      let changed = false;
      const localRvs = typeof row.reviews === 'string' ? JSON.parse(row.reviews) : row.reviews;
      for (const loc of localRvs) {
        if (!m.has(loc.url)) {
          m.set(loc.url, loc);
          changed = true;
        } else {
          // Check if local has sentiment or publishedDate that remote lacks
          const rem = m.get(loc.url);
          if (loc.sentiment != null && rem.sentiment == null) {
            rem.sentiment = loc.sentiment;
            changed = true;
          }
          if (loc.publishedDate && !rem.publishedDate) {
            rem.publishedDate = loc.publishedDate;
            changed = true;
          }
        }
      }
      if (!changed) continue;
      const merged = [...m.values()].slice(0, 6);
      const patch = await call('PATCH', `/api/admin/db/${t}?pinId=${id}`, { reviews: merged });
      if (patch.status === 200) {
        tablePatched++;
        totalPatched++;
        console.log(`${t} ${row.pinId} -> ${id}: synced successfully`);
      } else {
        console.log(`${t} ${row.pinId} -> ${id}: failed ${patch.status}`);
      }
    }
    console.log(`Table ${t}: ${tablePatched} rows updated.`);
  }
  console.log(`Finished full sync: ${totalPatched} total rubric rows updated.`);
  process.exit(0);
})();
