import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parsePtrText } from '@/lib/trades';
import * as db from '../db';
import PersonTrade, { type TradeFiling } from '../model/personTrade';
import { fetchSenateFilings } from './senateTrades';
import { storeFiling } from './personTrades';

// Reads the stock trades members of Congress disclose - the House Clerk's
// periodic transaction report PDFs (pdftotext) and the Senate's eFD site - and
// saves the ones not stored yet, telling the people watching each person.
// Shared by `npm run people:trades` and the news job's personTrades task.

const UA = 'Mozilla/5.0 (compatible; chronopin-trades/1.0)';
const STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia', PR: 'Puerto Rico', GU: 'Guam', VI: 'Virgin Islands', AS: 'American Samoa', MP: 'Northern Mariana Islands',
};

type Candidate = { id: number; name: string; bioguideId: string | null; jurisdiction: string | null; role: string };

const fold = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\b(jr|sr|ii|iii|iv|hon|dr|mr|mrs|ms|md|do|facs|esq)\b\.?/g, '').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();

// A person's jurisdiction is the state ("Florida") for current members but the
// seat ("Maryland's 6th congressional district") for former ones.
const inState = (p: Candidate, state: string) => !!p.jurisdiction && (p.jurisdiction === state || p.jurisdiction.startsWith(`${state}'s `));

// Does the filing's first name fit the page's (exact, prefix either way)?
const firstFits = (pageFirst: string, first: string) => pageFirst === first || pageFirst.startsWith(first) || first.startsWith(pageFirst);

// A member by last name, first name (or a nickname-prefix) and state.
function matchHouse(people: Candidate[], first: string, last: string, state: string): Candidate | null {
  const f = fold(first).split(' ')[0];
  const l = fold(last);
  const lastWord = l.split(' ').pop() ?? l; // "Paulina Luna" -> luna
  const full = STATES[state] ?? state;
  const pool = people.filter((p) => inState(p, full));
  const hits = pool.filter((p) => {
    const parts = fold(p.name).split(' ');
    return (fold(p.name).endsWith(l) || parts.slice(1).join(' ').includes(l)) && firstFits(parts[0], f);
  });
  if (hits.length === 1) return hits[0];
  // Nicknames and middle names ("Chuck" Fleischmann, Gerald "Gerry" Connolly):
  // the last name alone, when it is the only one from that state.
  const byLast = pool.filter((p) => fold(p.name).endsWith(lastWord) || fold(p.name).split(' ').slice(1).join(' ') === l);
  if (byLast.length === 1) return byLast[0];
  // Mike / Michael: two members share a last name in the state, one first initial fits.
  const byInitial = byLast.filter((p) => fold(p.name)[0] === f[0]);
  if (byInitial.length === 1) return byInitial[0];
  // Someone who moved to the cabinet or the VP's office has no state: first and last name.
  const national = people.filter((p) => !p.jurisdiction || !Object.values(STATES).some((s) => inState(p, s))).filter((p) => fold(p.name).endsWith(lastWord) && firstFits(fold(p.name).split(' ')[0], f));
  if (national.length === 1) return national[0];
  const nationalInitial = people.filter((p) => !Object.values(STATES).some((s) => inState(p, s)) && fold(p.name).endsWith(lastWord) && fold(p.name)[0] === f[0]);
  return nationalInitial.length === 1 ? nationalInitial[0] : null;
}

// The Senate lists no state: a senator is matched on name, then on last name alone;
// a senator who has since joined the cabinet or won another office matches on the full name.
function matchSenator(people: Candidate[], first: string, last: string): Candidate | null {
  const l = fold(last);
  const f = fold(first).split(' ')[0];
  const senators = people.filter((p) => p.role === 'senator');
  const hits = senators.filter((p) => fold(p.name).endsWith(l) && firstFits(fold(p.name).split(' ')[0], f));
  if (hits.length === 1) return hits[0];
  const byLast = senators.filter((p) => fold(p.name).endsWith(l));
  if (byLast.length === 1) return byLast[0];
  const others = people.filter((p) => p.role !== 'senator' && p.role !== 'representative' && fold(p.name).endsWith(l) && firstFits(fold(p.name).split(' ')[0], f));
  return others.length === 1 ? others[0] : null;
}

export type ImportResult = { filings: number; trades: number; unmatched: string[]; failed: string[] };

export async function importTrades({
  house = false,
  senate = false,
  year = new Date().getFullYear(),
  days = 365,
  limit,
  log = () => {},
  save = (personId: number, filing: TradeFiling) => storeFiling(personId, filing),
  skipStored = true,
}: {
  house?: boolean;
  senate?: boolean;
  year?: number;
  days?: number;
  limit?: number;
  log?: (line: string) => void;
  // How a filing is stored; the CLI's --dry-run and --prod swap it.
  save?: (personId: number, filing: TradeFiling, person: Candidate) => Promise<number>;
  skipStored?: boolean;
}): Promise<ImportResult> {
  const people = await db.query<Candidate>(`SELECT "id", "name", "bioguideId", "jurisdiction", "role" FROM "Person" WHERE "role" IN ('representative', 'senator', 'cabinet', 'governor', 'vice-president', 'president', 'other')`);
  const result: ImportResult = { filings: 0, trades: 0, unmatched: [], failed: [] };
  const unmatched = new Set<string>();
  const store = async (person: Candidate, filing: TradeFiling) => {
    if (!filing.trades.length) return;
    const n = await save(person.id, filing, person);
    if (n) {
      result.filings += 1;
      result.trades += n;
    }
    log(`${person.name} ${filing.filingId}: ${filing.trades.length} trades`);
  };

  if (house) {
    const dir = mkdtempSync(path.join(tmpdir(), 'ptr-'));
    const zip = path.join(dir, 'fd.zip');
    execFileSync('curl', ['-sfL', '-A', UA, '-o', zip, `https://disclosures-clerk.house.gov/public_disc/financial-pdfs/${year}FD.zip`]);
    const xml = execFileSync('unzip', ['-p', zip, `${year}FD.xml`], { maxBuffer: 1 << 28 }).toString('utf8');
    const members = [...xml.matchAll(/<Member>([\s\S]*?)<\/Member>/g)].map((m) => Object.fromEntries([...m[1].matchAll(/<(\w+)>([^<]*)</g)].map((x) => [x[1], x[2].trim()])));
    let ptrs = members.filter((m) => m.FilingType === 'P').reverse();
    if (limit) ptrs = ptrs.slice(0, limit);
    log(`${year}: ${ptrs.length} periodic transaction reports`);
    for (const m of ptrs) {
      const person = matchHouse(people, m.First, m.Last, m.StateDst.slice(0, 2));
      if (!person) {
        unmatched.add(`${m.First} ${m.Last} (${m.StateDst})`);
        continue;
      }
      if (skipStored && (await PersonTrade.has('house', m.DocID))) continue;
      const url = `https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/${year}/${m.DocID}.pdf`;
      const file = path.join(dir, `${m.DocID}.pdf`);
      try {
        execFileSync('curl', ['-sfL', '-A', UA, '-o', file, url]);
        const text = execFileSync('pdftotext', ['-layout', file, '-'], { maxBuffer: 1 << 26 }).toString('utf8');
        const [mo, d, y] = m.FilingDate.split('/');
        await store(person, { chamber: 'house', filingId: m.DocID, filedDate: `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`, sourceUrl: url, trades: parsePtrText(text) });
      } catch (err) {
        result.failed.push(`${m.First} ${m.Last} ${m.DocID}: ${(err as Error).message.split('\n')[0]}`);
      }
    }
  }

  if (senate) {
    for (const f of await fetchSenateFilings(days, { skip: skipStored ? (id) => PersonTrade.has('senate', id) : undefined })) {
      const person = matchSenator(people, f.first, f.last);
      if (!person) {
        unmatched.add(`${f.first} ${f.last}`);
        continue;
      }
      await store(person, { chamber: 'senate', filingId: f.filingId, filedDate: f.filedDate, sourceUrl: f.sourceUrl, trades: f.trades });
    }
  }
  result.unmatched = [...unmatched];
  return result;
}

// The filings filed in the last `days` days, as the admin endpoint takes them
// (a person is named by bioguide id, since local ids match prod's only after a pull).
export async function recentFilings(days: number) {
  const rows = await db.query<Record<string, any>>(
    `SELECT p."bioguideId", t."chamber", t."filingId", t."filedDate"::text AS "filedDate", t."sourceUrl", t."owner", t."asset", t."ticker", t."assetType", t."txType",
            t."txDate"::text AS "txDate", t."notifiedDate"::text AS "notifiedDate", t."amountLow"::float8 AS "amountLow", t."amountHigh"::float8 AS "amountHigh"
     FROM "PersonTrade" t JOIN "Person" p ON p."id" = t."personId"
     WHERE p."bioguideId" IS NOT NULL AND t."filedDate" >= now()::date - $1::int
     ORDER BY t."chamber", t."filingId", t."id"`,
    [days],
  );
  const byFiling = new Map<string, any>();
  for (const r of rows) {
    const key = `${r.chamber}:${r.filingId}`;
    const f = byFiling.get(key) ?? { bioguideId: r.bioguideId, chamber: r.chamber, filingId: r.filingId, filedDate: r.filedDate, sourceUrl: r.sourceUrl, trades: [] };
    f.trades.push({ owner: r.owner, asset: r.asset, ticker: r.ticker, assetType: r.assetType, txType: r.txType, txDate: r.txDate, notifiedDate: r.notifiedDate, amountLow: r.amountLow, amountHigh: r.amountHigh });
    byFiling.set(key, f);
  }
  return [...byFiling.values()];
}
