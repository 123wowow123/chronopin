// Refresh the dated public-source catalog, or merge it through the admin API.
// npx tsx scripts/people/holdings.ts --refresh
// npx tsx scripts/people/holdings.ts [--apply] [--base https://www.chronopin.com]
import '../env';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { readHoldings } from '@/server/holdingsInput';
import type { HoldingsSnapshot } from '@/lib/holdings';

const { values } = parseArgs({ options: { refresh: { type: 'boolean' }, apply: { type: 'boolean' }, base: { type: 'string', default: 'http://localhost:3000' }, file: { type: 'string', default: 'src/server/data/personHoldings.json' } } });
const file = values.file!;
if (!['src/server/data/personHoldings.json', 'src/server/data/personHoldingsPrimary.json', 'src/server/data/personHoldingsInsiders.json', 'src/server/data/personHoldingsReported.json'].includes(file)) throw new Error('Unsupported reviewed holdings catalog');
const base = values.base!.replace(/\/$/, '');
if (!['http://localhost:3000', 'https://www.chronopin.com'].includes(base)) throw new Error('Unsupported API host');
type Entry = { name: string; portfolios: HoldingsSnapshot[] };
type SourcePortfolio = {
  portfolioKey: number; name: string; holdings_as_of: string; as_of: string; start: string;
  holdings: { symbol: string; name: string; weight_pct: number }[];
  other_holdings_count: number; other_weight_pct: number;
  performance: { monthly: number | null; ytd: number | null; oneYear: number | null; allTime: number | null };
  performanceDisclosure: string;
};
async function main() {
  if (values.refresh) {
    if (file !== 'src/server/data/personHoldings.json') throw new Error('Use the corresponding primaryHoldings.py or personalInsiders.py refresh script for this source catalog');
    const people = JSON.parse(readFileSync('scripts/people/data/autopilot.json', 'utf8')).profiles as { name: string; profile: { contributions: { reference?: string; sourceUrl?: string }[] } }[];
    const urls = new Map<string, string>();
    for (const person of people) for (const c of person.profile.contributions) {
      if (/^autopilot-\d+$/.test(c.reference ?? '') && c.sourceUrl) {
        const url = new URL(c.sourceUrl);
        if (url.origin !== 'https://start.joinautopilot.com' || !/^\/strategies\/[a-z0-9-]+$/.test(url.pathname)) throw new Error('Unexpected source URL');
        urls.set(c.reference!, c.sourceUrl);
      }
    }
    const fetched = new Map<string, HoldingsSnapshot>();
    const all = [...urls];
    const checkedAt = new Date().toISOString().slice(0, 10);
    const audit: { url: string; sha256: string }[] = [];
    for (let at = 0; at < all.length; at += 4) {
      const batch = await Promise.allSettled(all.slice(at, at + 4).map(async ([key, url]) => {
        const response = await fetch(`${url}.json`, { signal: AbortSignal.timeout(60_000) });
        if (!response.ok || new URL(response.url).origin !== 'https://start.joinautopilot.com') throw new Error(`Source ${url}: HTTP ${response.status}`);
        const raw = await response.text();
        const p = JSON.parse(raw) as SourcePortfolio;
        if (key !== `autopilot-${p.portfolioKey}` || !Array.isArray(p.holdings) || !p.performance) throw new Error(`Incomplete source: ${url}`);
        const snapshot = readHoldings({ portfolios: [{
          key, name: p.name, scope: 'strategy', asOf: p.holdings_as_of, checkedAt, sourceUrl: url, sourceDataUrl: `${url}.json`,
          complete: p.other_holdings_count === 0 && p.other_weight_pct === 0,
          undisclosedCount: p.other_holdings_count ?? null, undisclosedWeightPercent: p.other_weight_pct ?? null,
          holdings: p.holdings.map(h => ({ symbol: h.symbol, name: h.name, weightPercent: h.weight_pct, side: 'long', currency: 'USD' })),
          performance: { asOf: p.as_of, startDate: p.start, monthly: p.performance.monthly, ytd: p.performance.ytd, oneYear: p.performance.oneYear, allTime: p.performance.allTime, disclosure: p.performanceDisclosure },
        }] })[0];
        return { key, snapshot, audit: { url: `${url}.json`, sha256: createHash('sha256').update(raw).digest('hex') } };
      }));
      for (const item of batch) {
        if (item.status === 'rejected') throw item.reason;
        fetched.set(item.value.key, item.value.snapshot); audit.push(item.value.audit);
      }
      console.log(`Opened and validated ${fetched.size}/${all.length} source portfolios`);
    }
    const profiles = people.map(p => ({ name: p.name, portfolios: p.profile.contributions.flatMap(c => fetched.has(c.reference ?? '') ? [fetched.get(c.reference!)!] : []) })).filter(p => p.portfolios.length);
    writeFileSync(file, JSON.stringify({ checkedAt, disclosure: 'Published Autopilot strategy holdings and client-strategy returns; not verified personal holdings or personal P&L. Public holdings may be partial.', sourceAudit: audit, profiles }, null, 2) + '\n');
    console.log(`Refreshed ${profiles.length} people from ${fetched.size} public strategy sources`);
    if (!values.apply) return;
  }
  const catalog = JSON.parse(readFileSync(file, 'utf8')) as { checkedAt: string; profiles: Entry[] };
  for (const p of catalog.profiles) readHoldings(p);
  let token = '';
  if (values.apply) {
    const { ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = process.env;
    if (!email || !password) throw new Error('Missing admin credentials');
    const response = await fetch(base + '/auth/local', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    if (!response.ok) throw new Error(`Login: HTTP ${response.status}`);
    token = (await response.json()).token;
    if (!token) throw new Error('No login token');
  }
  const indexResponse = await fetch(base + '/api/people');
  if (!indexResponse.ok) throw new Error('Cannot read People directory');
  const index = await indexResponse.json() as { id: number; name: string }[];
  const work = `.scrape/people-holdings-${file.endsWith('Primary.json') ? 'primary-' : file.endsWith('Insiders.json') ? 'insiders-' : file.endsWith('Reported.json') ? 'reported-' : ''}${catalog.checkedAt}/${base.includes('localhost') ? 'local' : 'prod'}`;
  mkdirSync(work, { recursive: true });
  const report = [];
  for (const person of catalog.profiles) {
    const matches = index.filter(p => p.name === person.name);
    if (matches.length !== 1) throw new Error(`Ambiguous or missing identity: ${person.name}`);
    const url = `${base}/api/people/${matches[0].id}/holdings`;
    // A proxy can suffix compressed response ETags (e.g. "...-gzip").
    // Request the identity representation so If-Match retains the API's hash.
    const response = await fetch(url, { headers: { 'Accept-Encoding': 'identity', 'Cache-Control': 'no-cache' } });
    if (!response.ok) throw new Error(`Holdings ${person.name}: HTTP ${response.status}`);
    const before = await response.json() as { portfolios: HoldingsSnapshot[] };
    const current = readHoldings(before);
    const additions = readHoldings(person);
    const changed = additions.some(p => JSON.stringify(current.find(c => c.key === p.key)) !== JSON.stringify(p));
    if (values.apply && changed) {
      writeFileSync(`${work}/before-${matches[0].id}-${Date.now()}.json`, JSON.stringify(before, null, 2) + '\n');
      const saved = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'If-Match': response.headers.get('etag') ?? '' }, body: JSON.stringify({ portfolios: additions }) });
      if (!saved.ok) throw new Error(`Save ${person.name}: HTTP ${saved.status}: ${await saved.text()}`);
      const afterResponse = await fetch(url, { headers: { 'Accept-Encoding': 'identity', 'Cache-Control': 'no-cache' } });
      if (!afterResponse.ok) throw new Error('Readback failed');
      const after = readHoldings(await afterResponse.json());
      if (additions.some(p => JSON.stringify(after.find(c => c.key === p.key)) !== JSON.stringify(p))) throw new Error(`Readback mismatch: ${person.name}`);
    }
    report.push({ name: person.name, id: matches[0].id, portfolios: additions.length, action: changed ? 'update' : 'unchanged' });
  }
  writeFileSync(`${work}/${values.apply ? 'applied' : 'dry-run'}.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ base, applied: !!values.apply, people: report.length, updated: report.filter(r => r.action === 'update').length }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
