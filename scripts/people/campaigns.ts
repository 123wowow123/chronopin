// Loads campaign finance for members of Congress from the FEC's bulk files
// (no key, no rate limit): weball (every candidate's totals per cycle, with
// the general-election vote share), pas2 (committee-to-candidate
// contributions) and cm (committee names).
//
//   npm run people:campaigns [-- --cycles 2022,2024,2026] [--dry-run]
//   --prod --token-file <admin token file>   POST to /api/admin/person-campaigns
//
// Members are matched on state + office (+ district) + name, within a cycle's
// candidates; one that matches nobody (or two people) is listed, never guessed.

import '../env';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fecCandidateUrl, fecCommitteeUrl, nameParts, parseWeballLine, type CampaignCycle, type WeballRow } from '@/lib/campaigns';
import * as db from '@/server/db';
import PersonCampaign from '@/server/model/personCampaign';

const { values: flags } = parseArgs({
  options: {
    cycles: { type: 'string', default: '2022,2024,2026' },
    'dry-run': { type: 'boolean', default: false },
    prod: { type: 'boolean', default: false },
    base: { type: 'string', default: 'https://www.chronopin.com' },
    'token-file': { type: 'string' },
  },
});

const STATES: Record<string, string> = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA', Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID',
  Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS',
  Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND',
  Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT',
  Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY', 'District of Columbia': 'DC', 'Puerto Rico': 'PR', Guam: 'GU', 'Virgin Islands': 'VI', 'American Samoa': 'AS', 'Northern Mariana Islands': 'MP',
};
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\b(jr|sr|ii|iii|iv|dr|hon)\b\.?/g, '').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();

const dir = mkdtempSync(path.join(tmpdir(), 'fec-'));
function bulk(name: string, cycle: number, file: string): string {
  const yy = String(cycle).slice(2);
  const zip = path.join(dir, `${name}${yy}.zip`);
  execFileSync('curl', ['-sfL', '-o', zip, `https://www.fec.gov/files/bulk-downloads/${cycle}/${name}${yy}.zip`]);
  return execFileSync('unzip', ['-p', zip, file], { maxBuffer: 1 << 30 }).toString('latin1');
}

type Cand = { id: number; name: string; role: string; state: string; district: string | null };
// "...Representative from California's 11th congressional district", "at-large".
function districtOf(office: string | null): string | null {
  if (!office) return null;
  if (/at[- ]large|delegate|resident commissioner/i.test(office)) return '00';
  const m = /(\d+)(?:st|nd|rd|th)\s+(?:congressional\s+)?district/i.exec(office);
  return m ? m[1].padStart(2, '0') : null;
}

function nameMatches(person: string, fec: WeballRow): boolean {
  const { last, first } = nameParts(fec.name);
  const p = fold(person);
  if (!(p.endsWith(last) || p.split(' ').slice(1).join(' ').includes(last))) return false;
  const pf = p.split(' ')[0];
  return !first || pf === first || pf.startsWith(first) || first.startsWith(pf);
}

async function main() {
  const rows = await db.query<{ id: number; name: string; role: string; jurisdiction: string | null; office: string | null }>(
    `SELECT "id", "name", "role", "jurisdiction", "office" FROM "Person" WHERE "role" IN ('representative', 'senator') OR ("office" ILIKE '%Representative from%' OR "office" ILIKE '%Senator from%')`,
  );
  const people: Cand[] = rows
    .map((r) => ({ id: r.id, name: r.name, role: /senator/i.test(r.office ?? '') || r.role === 'senator' ? 'S' : 'H', state: STATES[r.jurisdiction ?? ''] ?? '', district: districtOf(r.office) }))
    .filter((p) => p.state);
  const byPerson = new Map<number, CampaignCycle[]>();
  const unmatched = new Set<string>();

  for (const cycle of String(flags.cycles).split(',').map(Number)) {
    const all = bulk('weball', cycle, `weball${String(cycle).slice(2)}.txt`).split('\n').map(parseWeballLine).filter((r): r is WeballRow => !!r && r.office !== 'P');
    const names = new Map<string, string>();
    for (const line of bulk('cm', cycle, `cm.txt`).split('\n')) {
      const c = line.split('|');
      if (c[0]) names.set(c[0], c[1]);
    }
    // Committee -> candidate contributions (24K = direct contribution), per candidate and giver.
    const gave = new Map<string, Map<string, { amount: number; count: number }>>();
    for (const line of bulk('pas2', cycle, 'itpas2.txt').split('\n')) {
      const c = line.split('|');
      if (c[5] !== '24K' || !c[16]) continue;
      const amount = Number(c[14]);
      if (!Number.isFinite(amount)) continue;
      const byGiver = gave.get(c[16]) ?? new Map();
      const cur = byGiver.get(c[0]) ?? { amount: 0, count: 0 };
      cur.amount += amount;
      cur.count += 1;
      byGiver.set(c[0], cur);
      gave.set(c[16], byGiver);
    }
    const bySeat = new Map<string, WeballRow[]>();
    for (const r of all) {
      const key = `${r.office}|${r.state}|${r.district ?? ''}`;
      bySeat.set(key, [...(bySeat.get(key) ?? []), r]);
    }
    let matched = 0;
    for (const p of people) {
      const seat = p.role === 'H' && p.district ? bySeat.get(`H|${p.state}|${p.district}`) : null;
      const pool = seat ?? (p.role === 'S' ? bySeat.get(`S|${p.state}|`) : all.filter((r) => r.office === 'H' && r.state === p.state));
      const hits = (pool ?? []).filter((r) => nameMatches(p.name, r));
      // Two hits (a primary loser with the same name) - the one that raised more.
      const self = hits.sort((a, b) => (b.receipts ?? 0) - (a.receipts ?? 0))[0];
      if (!self) continue;
      matched++;
      const race = all.filter((r) => r.office === self.office && r.state === self.state && r.district === self.district && r.fecCandidateId !== self.fecCandidateId);
      const rivals = race
        .filter((r) => (r.receipts ?? 0) > 0 || r.votePct != null)
        .sort((a, b) => (b.votePct ?? -1) - (a.votePct ?? -1) || (b.receipts ?? 0) - (a.receipts ?? 0))
        .slice(0, 12)
        .map((r) => ({ fecCandidateId: r.fecCandidateId, name: r.name, party: r.party, status: r.status, receipts: r.receipts, disbursements: r.disbursements, cashOnHand: r.cashOnHand, votePct: r.votePct, general: r.general, sourceUrl: fecCandidateUrl(r.fecCandidateId, cycle) }));
      const pacs = [...(gave.get(self.fecCandidateId) ?? [])]
        .filter(([, v]) => v.amount > 0)
        .sort((a, b) => b[1].amount - a[1].amount)
        .slice(0, 10)
        .map(([id, v]) => ({ committeeId: id, name: names.get(id) ?? id, amount: Math.round(v.amount), count: v.count, sourceUrl: fecCommitteeUrl(id, cycle) }));
      const list = byPerson.get(p.id) ?? [];
      list.push({
        cycle, fecCandidateId: self.fecCandidateId, office: self.office as 'H' | 'S', state: self.state, district: self.district, status: self.status, party: self.party,
        receipts: self.receipts, disbursements: self.disbursements, cashOnHand: self.cashOnHand, individual: self.individual, pac: self.pac, partyCommittee: self.partyCommittee,
        selfFunded: self.selfFunded, debts: self.debts, coverageEnd: self.coverageEnd, votePct: self.votePct, sourceUrl: fecCandidateUrl(self.fecCandidateId, cycle), rivals, pacs,
      });
      byPerson.set(p.id, list);
    }
    console.log(`${cycle}: ${all.length} candidates, ${matched} of ${people.length} people matched`);
  }
  for (const p of people) if (!byPerson.has(p.id)) unmatched.add(p.name);
  console.log(`${byPerson.size} people with campaign data; ${unmatched.size} with none in these cycles (retired earlier or never ran)`);
  if (flags['dry-run']) return;
  if (flags.prod) {
    if (!flags['token-file']) throw new Error('--prod needs --token-file');
    const headers = { Authorization: `Bearer ${readFileSync(flags['token-file'], 'utf8').trim()}`, 'Content-Type': 'application/json' };
    const bioguides = new Map((await db.query<{ id: number; bioguideId: string }>(`SELECT "id", "bioguideId" FROM "Person" WHERE "bioguideId" IS NOT NULL`)).map((r) => [r.id, r.bioguideId]));
    const entries = [...byPerson].filter(([id]) => bioguides.has(id)).map(([id, cycles]) => ({ bioguideId: bioguides.get(id), cycles }));
    for (let i = 0; i < entries.length; i += 20) {
      const res = await fetch(`${flags.base}/api/admin/person-campaigns`, { method: 'POST', headers, body: JSON.stringify({ people: entries.slice(i, i + 20) }) });
      console.log(res.status, await res.text());
    }
    return;
  }
  for (const [id, cycles] of byPerson) await PersonCampaign.replace(id, cycles);
  console.log('saved');
}
main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
