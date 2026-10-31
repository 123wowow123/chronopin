// Seeds the Epoch AI frontier data centers that have no campus pin yet, then
// saves each Epoch pin's capacity timeline (IT power, H100-equivalents, capital
// cost, construction notes) as PinPerf charts and a table. Inputs are the live
// CSVs from epoch.ai/data/data-centers (EPOCH_DIR) plus the map JSON for coordinates.
//
//   EPOCH_DIR=<dir with data_centers.csv, data_center_timelines.csv> npx tsx scripts/power/epochTimelines.ts [--dry]

import '../env';
import fs from 'node:fs';
import path from 'node:path';
import * as db from '@/server/db';
import { perfProblem, type PerfChart, type PerfTable } from '@/lib/pinPerf';
import { savePerf } from '@/server/model/pinPerf';
import { estimateWaterGallonsPerDayFromMw } from '@/lib/datacenter';
import { saveDatacenter } from '@/server/model/pinDatacenter';

const DIR = process.env.EPOCH_DIR!;
const MAP = '.scrape/datacenter-stats-2026-10-21/epoch_map_unwrapped.json';
const SOURCE = 'https://epoch.ai/data/data-centers';
const TODAY = '2026-10-31';
const DRY = process.argv.includes('--dry');
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function parse(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); cell = ''; if (row.length > 1 || row[0]) rows.push(row); row = []; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const head = rows[0];
  return rows.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}
const num = (x: string | undefined) => (x === undefined || x === '' || !Number.isFinite(Number(x)) ? null : Number(x));

type Pt = { date: string; mw: number | null; h100e: number | null; cost: number | null; status: string };

function pick(points: Pt[], key: 'mw' | 'h100e' | 'cost') {
  const vals = points.filter((p) => p[key] !== null);
  const kept: Pt[] = [];
  for (const p of vals) if (!kept.length || kept[kept.length - 1][key] !== p[key]) kept.push(p);
  const last = vals[vals.length - 1];
  if (last && kept[kept.length - 1] !== last && last[key] !== kept[kept.length - 1][key]) kept.push(last);
  if (!kept.some((p) => (p[key] ?? 0) > 0)) return null;
  let sel = kept;
  if (sel.length > 12) {
    const idx = new Set<number>();
    for (let i = 0; i < 12; i++) idx.add(Math.round((i * (sel.length - 1)) / 11));
    sel = [...idx].sort((a, b) => a - b).map((i) => sel[i]);
  }
  return sel.length >= 2 ? sel : null;
}

function charts(points: Pt[]): PerfChart[] {
  const defs = [
    { key: 'mw' as const, title: 'IT power over time', unit: 'MW', round: 1 },
    { key: 'h100e' as const, title: 'AI compute over time', unit: 'H100e', round: 0 },
    { key: 'cost' as const, title: 'Capital cost over time', unit: '2025 USD bn', round: 2 },
  ];
  const out: PerfChart[] = [];
  for (const d of defs) {
    const sel = pick(points, d.key);
    if (!sel) continue;
    const current = [...sel].reverse().find((p) => p.date <= TODAY);
    out.push({
      title: d.title,
      unit: d.unit,
      higherIsBetter: true,
      note: "Epoch AI's modelled estimates from satellite imagery, permits and company statements; dates after today are Epoch's projections.",
      sourceUrl: SOURCE,
      bars: sel.map((p) => ({
        label: p.date > TODAY ? `${p.date} (proj.)` : p.date,
        value: Math.round((p[d.key] as number) * 10 ** d.round) / 10 ** d.round,
        ...(p === current ? { highlight: true } : {}),
      })),
    });
  }
  return out;
}

function table(points: Pt[]): PerfTable | null {
  const rows = points.filter((p) => p.status.trim()).map((p) => [p.date, p.status.trim().slice(0, 200)]);
  if (!rows.length) return null;
  return { title: 'Construction timeline (Epoch AI)', columns: ['Date', 'Observed status'], rows: rows.slice(0, 40), note: 'Epoch AI satellite-imagery notes, in date order.', sourceUrl: SOURCE };
}

async function main() {
  const read = (f: string) => parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  const centers = read('data_centers.csv');
  const tl = read('data_center_timelines.csv');
  const map = JSON.parse(fs.readFileSync(MAP, 'utf8')).dataCenters as any[];
  const points = new Map<string, Pt[]>();
  for (const r of tl) {
    const list = points.get(r['Data center']) ?? [];
    list.push({ date: r['Date'], mw: num(r['IT power (MW)']), h100e: num(r['H100 equivalents']), cost: num(r['Total capital cost (2025 USD billions)']), status: r['Construction status'] ?? '' });
    points.set(r['Data center'], list);
  }
  for (const l of points.values()) l.sort((a, b) => a.date.localeCompare(b.date));

  const pins = await db.query<{ id: number; sourceUrl: string }>(`SELECT "id","sourceUrl" FROM "Pin" WHERE "utcDeletedDateTime" IS NULL AND "sourceUrl" LIKE 'https://epoch.ai/data/data-centers#%'`);
  const bySlug = new Map(pins.map((p) => [p.sourceUrl.split('#')[1], p.id]));

  bySlug.set('meta-los-lunas', 7301); // existing operator-sourced campus pin

  // 1. Seed the centers with no pin.
  const [desk] = await db.query<{ id: number }>(`SELECT "id" FROM "User" WHERE "userName" = '@TechDesk' LIMIT 1`);
  for (const c of centers) {
    const name = c['Name'];
    const slug = slugify(name);
    if (bySlug.has(slug)) continue;
    const pts = points.get(name) ?? [];
    const m = map.find((x) => slugify(x.id) === slug);
    const [lon, lat] = m?.lngLat ?? [null, null];
    const owner = c['Owner'].replace(/\s*#\w+/g, '').split(',')[0].trim() || name;
    const now = [...pts].reverse().find((p) => p.date <= TODAY && (p.mw ?? 0) > 0);
    const mw = num(c['Current power (MW)']) ?? now?.mw ?? null;
    const h100e = num(c['Current H100 equivalents']);
    const price = num(c['Current total capital cost (2025 USD billions)']);
    const addr = c['Address'] || c['Country'];
    if (lat === null && !c['Address']) { console.log(`SKIP ${name}: no coordinates`); continue; }
    console.log(`${DRY ? '[DRY] ' : ''}seed ${name} ${mw} MW`);
    if (DRY) continue;
    const spec = [mw ? `${Math.round(mw).toLocaleString('en-US')} MW` : null, h100e ? `${Math.round(h100e / 1000).toLocaleString('en-US')}K H100e` : null].filter(Boolean).join(' / ');
    const title = `${name}: ${spec ? spec + ' ' : ''}Frontier AI Data Center Cluster in ${addr.split(',').slice(-2).join(',').trim() || c['Country']}`;
    const url = `${SOURCE}#${slug}`;
    const desc = `${name} (${addr}) is a frontier AI data center campus owned by ${owner}${mw ? `, modelled by Epoch AI at ${Math.round(mw).toLocaleString('en-US')} MW of IT power` : ''}${h100e ? ` and ${Math.round(h100e).toLocaleString('en-US')} H100-equivalents` : ''}.`;
    const [co] = await db.query<{ id: number }>(`INSERT INTO "Company" ("name") VALUES ($1) ON CONFLICT ("name") DO UPDATE SET "name" = "Company"."name" RETURNING "id"`, [owner]);
    const when = (now ?? pts[pts.length - 1])?.date ?? TODAY;
    const loc = 'CASE WHEN $6::float8 IS NULL THEN NULL ELSE ST_SetSRID(ST_MakePoint($7::float8,$6::float8),4326)::geography END';
    const [ins] = await db.query<{ id: number }>(
      `INSERT INTO "Pin" ("title","description","sourceUrl","longFormSummary","address","location","companyId","price","priceCurrency","dateConfidence","dateConfidenceReasoning","utcStartDateTime","allDay","userId")
       VALUES ($1,$2,$3,$4,$5,${loc},$8,$9,$10,'estimated',$11,$12,true,$13) RETURNING "id"`,
      [title, `<p>${esc(desc)}</p>`, url, `<ul><li><strong>Scale:</strong> ${esc(spec || 'capacity not yet modelled')} per Epoch AI.<cite data-ref="${url}"></cite></li></ul>`, addr, lat, lon, co.id, price !== null ? Math.round(price * 1e9) : null, price !== null ? 'USD' : null, `Dated to Epoch AI timeline milestone ${when}.`, `${when}T00:00:00Z`, desk?.id ?? 276],
    );
    const tags = ['Data Centers', 'AI Data Centers', 'Frontier AI', 'Hyperscale', 'AI', 'Infrastructure', 'Energy'];
    const cats = ['AI', 'Infrastructure', 'Energy'];
    await db.query(`INSERT INTO "PinTag" ("pinId","name","kind","source") SELECT $1,name,CASE WHEN name=ANY($3::text[]) THEN 'category' ELSE 'topic' END,'user' FROM unnest($2::citext[]) AS name ON CONFLICT DO NOTHING`, [ins.id, tags, cats]);
    await db.query(`INSERT INTO "PinReference" ("pinId","url","title","confidence","reasoning") VALUES ($1,$2,$3,90,'Epoch AI Frontier Data Centers dataset')`, [ins.id, url, title]);
    if (mw) await db.query(`INSERT INTO "PinPower" ("pinId","megawatts","kind","source","sourceUrl","note") VALUES ($1,$2,'usage','hand',$3,'IT power modelled by Epoch AI') ON CONFLICT ("pinId") DO NOTHING`, [ins.id, mw, url]);
    await saveDatacenter(ins.id, { waterGallonsPerDay: mw ? estimateWaterGallonsPerDayFromMw(mw) : null, waterBasis: mw ? 'estimated' : null, chips: null, chipModel: h100e ? 'H100-equivalents (Epoch AI)' : null, h100Equivalents: h100e ? Math.round(h100e) : null, buildings: null, generators: null, cooling: null, powerSource: null, sourceUrl: url, note: `Epoch AI Frontier Data Center (${name})` } as any);
    bySlug.set(slug, ins.id);
  }

  // 2. Timeline charts on every Epoch pin.
  let saved = 0;
  const unmatched: string[] = [];
  for (const [name, pts] of points) {
    const id = bySlug.get(slugify(name)) ?? bySlug.get(slugify(map.find((m) => slugify(m.id).endsWith(slugify(name)) || slugify(name).endsWith(slugify(m.id)))?.id ?? '~'));
    if (!id) { unmatched.push(name); continue; }
    const cs = charts(pts);
    const t = table(pts);
    if (!cs.length && !t) continue;
    const parsed = perfProblem({ charts: cs, tables: t ? [t] : [] });
    if (typeof parsed === 'string') { console.log(`${name}: ${parsed}`); continue; }
    if (!DRY) await savePerf(id, parsed.charts, parsed.tables);
    saved++;
  }
  console.log(`saved ${saved} pins; unmatched timelines: ${unmatched.join(' | ') || 'none'}`);
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
