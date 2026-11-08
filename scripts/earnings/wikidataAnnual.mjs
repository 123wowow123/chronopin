// Builds src/server/data/earningsAnnual.json: annual revenue and net profit for the
// companies of earnings pins that Nasdaq cannot chart (non-US listings and ADRs with no
// income statement). Source: Wikidata (revenue P2139, net profit P2295, point in time
// P585), each claim sourced there from the company's own report. Annual only, in the
// currency the company reports; a company with no figures from the last three years is
// left out rather than shown stale.
//
//   node scripts/earnings/wikidataAnnual.mjs            # reads the local DB, writes the file
//
// Re-run after new earnings companies appear; review the diff.
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const root = path.resolve(import.meta.dirname, '../..');
const url = fs.readFileSync(path.join(root, '.env.local'), 'utf8').match(/^DATABASE_URL=(.*)$/m)[1].replace(/"/g, '');
const UA = 'Chronopin/1.0 (earnings widget build; https://www.chronopin.com)';
const out = path.join(root, 'src/server/data/earningsAnnual.json');
const get = async (u) => {
  for (let i = 0; i < 3; i++) {
    const r = await fetch(u, { headers: { 'user-agent': UA } });
    if (r.status === 429) { await new Promise((s) => setTimeout(s, 3000 * (i + 1))); continue; }
    if (!r.ok) throw new Error(`${r.status} ${u}`);
    return r.json();
  }
  throw new Error(`rate limited ${u}`);
};

const client = new pg.Client({ connectionString: url });
await client.connect();
const { rows } = await client.query(`
  SELECT DISTINCT co.name, co."wikiUrl"
  FROM "PinTag" t JOIN "Pin" p ON p.id = t."pinId" JOIN "Company" co ON co.id = p."companyId"
  WHERE t.name = 'Earnings' AND co."wikiUrl" IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM "PinTicker" k WHERE k."pinId" = p.id AND k."utcRemovedDateTime" IS NULL AND k."assetClass" = 'stocks' AND k.relation = 'company'
                    AND k.symbol NOT IN ('TSM','SNY','BUD','DEO','NIO','XPEV','BCS','UBS','PHI','SKHY','BRK.B'))
    AND (NOT EXISTS (SELECT 1 FROM "PinTicker" k WHERE k."pinId" = p.id AND k."utcRemovedDateTime" IS NULL AND k."assetClass" = 'stocks' AND k.relation = 'company')
         OR EXISTS (SELECT 1 FROM "PinTicker" k WHERE k."pinId" = p.id AND k."utcRemovedDateTime" IS NULL AND k.relation = 'company'
                    AND k.symbol IN ('TSM','SNY','BUD','DEO','NIO','XPEV','BCS','UBS','PHI','SKHY','BRK.B')))
  ORDER BY co.name`);
await client.end();

const currencies = new Map();
async function currencyOf(unitUrl) {
  const id = unitUrl.split('/').pop();
  if (!currencies.has(id)) {
    const e = (await get(`https://www.wikidata.org/wiki/Special:EntityData/${id}.json`)).entities[id];
    currencies.set(id, e.claims?.P498?.[0]?.mainsnak?.datavalue?.value ?? null);
  }
  return currencies.get(id);
}

function series(claims, unitSeen) {
  const byYear = new Map();
  for (const c of claims ?? []) {
    if (c.rank === 'deprecated') continue;
    const v = c.mainsnak?.datavalue?.value;
    const time = c.qualifiers?.P585?.[0]?.datavalue?.value?.time;
    if (!v || !time) continue;
    const m = /^\+(\d{4})-(\d\d)-(\d\d)/.exec(time);
    if (!m) continue;
    const year = Number(m[1]);
    const amount = Number(v.amount);
    if (!Number.isFinite(amount)) continue;
    const prev = byYear.get(year);
    if (!prev || (c.rank === 'preferred' && prev.rank !== 'preferred')) byYear.set(year, { year, amount, unit: v.unit, rank: c.rank });
    unitSeen.add(v.unit);
  }
  return byYear;
}

// Entries added by hand (source 'manual', each with a url to the company's report) stand: a run never replaces them.
const previous = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : {};
const result = Object.fromEntries(Object.entries(previous).filter(([, v]) => v.source === 'manual'));
const skipped = [];
for (const { name, wikiUrl } of rows) {
  if (result[name]) continue;
  try {
    const title = decodeURIComponent(wikiUrl.split('/wiki/')[1]);
    const pp = await get(`https://en.wikipedia.org/w/api.php?action=query&prop=pageprops&ppprop=wikibase_item&redirects=1&titles=${encodeURIComponent(title)}&format=json`);
    const qid = Object.values(pp.query.pages)[0]?.pageprops?.wikibase_item;
    if (!qid) { skipped.push(`${name}: no Wikidata item`); continue; }
    const e = (await get(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`)).entities[qid];
    const units = new Set();
    const rev = series(e.claims.P2139, units);
    const net = series(e.claims.P2295, units);
    const years = [...rev.keys()].sort((a, b) => a - b);
    const latest = years[years.length - 1];
    if (!latest || latest < new Date().getUTCFullYear() - 3) { skipped.push(`${name}: newest revenue ${latest ?? 'none'}`); continue; }
    // Last four years, all in the newest year's unit (a change of reporting currency is not mixed).
    const unit = rev.get(latest).unit;
    const currency = await currencyOf(unit);
    if (!currency) { skipped.push(`${name}: unknown currency`); continue; }
    const periods = years.slice(-4).filter((y) => rev.get(y).unit === unit).map((y) => ({
      year: y,
      revenue: rev.get(y).amount,
      earnings: net.get(y) && net.get(y).unit === unit ? net.get(y).amount : null,
    }));
    // One or two stray data points are not a trend; Wikidata's sparse items stay out.
    if (periods.length < 3 || periods.some((p) => p.revenue < 1e6)) { skipped.push(`${name}: only ${periods.length} usable years`); continue; }
    result[name] = { source: 'wikidata', qid, currency, periods };
    console.log(name, qid, currency, periods.map((p) => `${p.year}:${(p.revenue / 1e9).toFixed(1)}B/${p.earnings == null ? '-' : (p.earnings / 1e9).toFixed(1)}B`).join(' '));
  } catch (err) {
    skipped.push(`${name}: ${err.message}`);
  }
  await new Promise((s) => setTimeout(s, 400));
}
fs.writeFileSync(out, JSON.stringify(result, null, 1) + '\n');
console.log(`\nwrote ${Object.keys(result).length} companies to ${path.relative(root, out)}`);
if (skipped.length) console.log('skipped:\n' + skipped.map((s) => '  ' + s).join('\n'));
