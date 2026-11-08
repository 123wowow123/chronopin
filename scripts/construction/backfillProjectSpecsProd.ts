// Prod variant of backfillProjectSpecs.ts, through the admin API (token from .scrape/admin.token).
//   npx tsx scripts/construction/backfillProjectSpecsProd.ts [--apply]   (dry run by default)
import { readFileSync } from 'node:fs';
import { projectFromTitle } from '../../src/lib/projectSpecs';

const BASE = 'https://www.chronopin.com';
const T = readFileSync('.scrape/admin.token', 'utf8').trim();
const H = { Authorization: `Bearer ${T}`, 'Content-Type': 'application/json' };
const BUILD_TAGS = ['Proposed', 'In Progress', 'Completed', 'Housing', 'Apartments', 'Property', 'Real Estate', 'Hotels', 'Hotel', 'Stadium', 'Arena', 'Architecture', 'Construction', 'Redevelopment'];
const apply = process.argv.includes('--apply');
const get = async (p: string) => (await fetch(BASE + p, { headers: H })).json() as Promise<{ rows: any[] }>;

async function main() {
  const seen = new Map<number, string>();
  for (const pat of ['%-unit%', '% units%', '%homes%', '%apartments%', '%-seat%', '%-room %', '%-key %', '%-story%', '%-floor%', '% beds%', '%condos%', '%townhomes%']) {
    for (let off = 0; ; off += 1000) {
      const { rows } = await get(`/api/admin/db/Pin?title.ilike=${encodeURIComponent(pat)}&utcDeletedDateTime.null=true&limit=1000&offset=${off}&order=id`);
      for (const r of rows) seen.set(r.id, r.title);
      if (rows.length < 1000) break;
    }
  }
  console.log(`${seen.size} candidate titles`);
  const ids = [...seen.keys()].filter((id) => Object.keys(projectFromTitle(seen.get(id)!)).length);
  const tagged = new Set<number>();
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const { rows } = await get(`/api/admin/db/PinTag?pinId.in=${chunk.join(',')}&name.in=${encodeURIComponent(BUILD_TAGS.join(','))}&limit=1000`);
    rows.forEach((r) => tagged.add(r.pinId));
  }
  let n = 0;
  for (const id of ids) {
    if (!tagged.has(id)) continue;
    const f: Record<string, number> = projectFromTitle(seen.get(id)!);
    if (f.seats < 500) delete f.seats;
    if (f.beds < 10) delete f.beds;
    if (f.stories < 2) delete f.stories;
    if (!Object.keys(f).length) continue;
    const existing = await fetch(`${BASE}/api/pins/${id}/project`);
    if (existing.status !== 204) continue; // already has a row (hand or title): leave it
    n++;
    console.log(id, JSON.stringify(f), '|', seen.get(id));
    if (apply) {
      const r = await fetch(`${BASE}/api/pins/${id}/project`, { method: 'PUT', headers: H, body: JSON.stringify({ ...f, basis: 'reported', note: 'Read from the pin title.' }) });
      if (!r.ok) console.log('  FAILED', r.status);
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  console.log(`${n} pins ${apply ? 'written' : 'would be written (dry run)'}`);
}
main();
