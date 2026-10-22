// The data behind the conflict-of-interest mark and its wikis: committee seats, ticker sectors and the OKF
// wikis compiled from them. Shared by `npm run people:committees` / `gov:wiki` / `companies:wiki` and the admin
// API (/api/admin/conflicts).

import { committeeSectors, SECTORS, sectorOfSic, type Sector } from '@/lib/conflicts';
import * as db from '../db';
import CompanyWiki from '../model/companyWiki';
import GovWiki from '../model/govWiki';
import { holdingSector } from '../model/personTrade';

const BASE = 'https://unitedstates.github.io/congress-legislators';
const SOURCE = `${BASE}/committee-membership-current.json`;
const HEADERS = { 'User-Agent': 'chronopin-dev/1.0 (contact@chronopin.local)' };

type Committee = { type: 'house' | 'senate' | 'joint'; name: string; thomas_id: string; subcommittees?: { name: string; thomas_id: string }[] };
type Member = { name: string; rank: number; title?: string; bioguide: string };

// Replaces every committee seat with today's, from congress-legislators.
export async function refreshSeats(): Promise<{ seats: number; unmatched: string[] }> {
  const committees = (await (await fetch(`${BASE}/committees-current.json`)).json()) as Committee[];
  const members = (await (await fetch(SOURCE)).json()) as Record<string, Member[]>;
  const info = new Map<string, { name: string; parentId: string | null; chamber: Committee['type']; parentName: string }>();
  for (const c of committees) {
    info.set(c.thomas_id, { name: c.name, parentId: null, chamber: c.type, parentName: c.name });
    for (const s of c.subcommittees ?? []) info.set(c.thomas_id + s.thomas_id, { name: s.name, parentId: c.thomas_id, chamber: c.type, parentName: c.name });
  }
  const people = await db.query<{ id: number; bioguideId: string }>(`SELECT "id", "bioguideId" FROM "Person" WHERE "bioguideId" IS NOT NULL`);
  const byBio = new Map(people.map((p) => [p.bioguideId, p.id]));
  await db.query(`DELETE FROM "PersonCommittee"`);
  let seats = 0;
  const unmatched = new Set<string>();
  for (const [id, list] of Object.entries(members)) {
    const c = info.get(id);
    if (!c) continue;
    const sectors = committeeSectors(id, c.name);
    for (const m of list) {
      const personId = byBio.get(m.bioguide);
      if (!personId) {
        unmatched.add(m.name);
        continue;
      }
      await db.query(
        `INSERT INTO "PersonCommittee" ("personId", "committeeId", "parentId", "name", "chamber", "title", "rank", "sectors", "sourceUrl")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT DO NOTHING`,
        [personId, id, c.parentId, c.parentId ? `${c.parentName}: ${c.name}` : c.name, c.chamber, m.title ?? null, m.rank, sectors, SOURCE],
      );
      seats++;
    }
  }
  return { seats, unmatched: [...unmatched] };
}

// Classifies the tickers not yet in TickerSector from the SEC's SIC code (about 8 requests a second).
export async function classifyTickers(log: (m: string) => void = () => undefined): Promise<number> {
  const listed = Object.values((await (await fetch('https://www.sec.gov/files/company_tickers.json', { headers: HEADERS })).json()) as Record<string, { cik_str: number; ticker: string }>);
  const cik = new Map(listed.map((c) => [c.ticker.toUpperCase(), c.cik_str]));
  const todo = await db.query<{ ticker: string }>(
    `SELECT DISTINCT t."ticker" FROM "PersonTrade" t LEFT JOIN "TickerSector" s ON s."ticker" = t."ticker" WHERE t."ticker" IS NOT NULL AND s."ticker" IS NULL`,
  );
  log(`${todo.length} tickers to classify`);
  let done = 0;
  for (const { ticker } of todo) {
    const id = cik.get(ticker.toUpperCase()) ?? cik.get(ticker.toUpperCase().replace('-', '.')) ?? cik.get(ticker.toUpperCase().replace('.', '-'));
    let sic: number | null = null;
    let label: string | null = null;
    if (id) {
      const res = await fetch(`https://data.sec.gov/submissions/CIK${String(id).padStart(10, '0')}.json`, { headers: HEADERS });
      if (res.ok) {
        const j = (await res.json()) as { sic?: string; sicDescription?: string };
        sic = j.sic ? Number(j.sic) : null;
        label = j.sicDescription ?? null;
      } else if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }
      await new Promise((r) => setTimeout(r, 120));
    }
    await db.query(
      `INSERT INTO "TickerSector" ("ticker", "cik", "sic", "sicLabel", "sector") VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT ("ticker") DO UPDATE SET "cik" = $2, "sic" = $3, "sicLabel" = $4, "sector" = $5, "checkedAt" = now()`,
      [ticker, id ?? null, sic, label, sic ? sectorOfSic(sic) : null],
    );
    if (++done % 200 === 0) log(`${done}/${todo.length}`);
  }
  return done;
}

// Funds, bonds and tickers EDGAR does not list have no SIC code; their names (and the hand-checked list) stand in.
export async function classifyNames(): Promise<{ classified: number; holdings: number }> {
  const rows = await db.query<{ ticker: string | null; asset: string }>(`SELECT DISTINCT "ticker", "asset" FROM "PersonTrade"`);
  let classified = 0;
  for (const r of rows) {
    const sector = holdingSector(r.ticker, r.asset);
    await db.query(`UPDATE "PersonTrade" SET "sector" = $3 WHERE "asset" = $2 AND "ticker" IS NOT DISTINCT FROM $1 AND "sector" IS DISTINCT FROM $3`, [r.ticker, r.asset, sector]);
    if (sector) classified++;
  }
  return { classified, holdings: rows.length };
}

export type WikiKind = 'committees' | 'filings' | 'companies';
export const WIKI_KINDS: WikiKind[] = ['committees', 'filings', 'companies'];

export async function rebuildWikis(kinds: WikiKind[] = WIKI_KINDS): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  if (kinds.includes('committees')) out.committees = await GovWiki.rebuildCommittees();
  if (kinds.includes('filings')) out.filings = await GovWiki.rebuildFilings();
  if (kinds.includes('companies')) out.companies = await CompanyWiki.rebuildAll();
  return out;
}

export type ConflictEdit = {
  // Set (or, with null, clear) the sector of a ticker.
  tickers?: { ticker: string; sector: Sector | null }[];
  // Set the sectors a committee (or subcommittee) oversees, on every seat of it.
  committees?: { committeeId: string; sectors: Sector[] }[];
};

const isSector = (s: unknown): s is Sector => typeof s === 'string' && (SECTORS as readonly string[]).includes(s);

export function readEdit(body: unknown): ConflictEdit {
  const b = (body ?? {}) as { tickers?: unknown; committees?: unknown };
  const edit: ConflictEdit = {};
  if (b.tickers !== undefined) {
    if (!Array.isArray(b.tickers) || b.tickers.length > 500) throw new Error('tickers: an array of at most 500 { ticker, sector }');
    edit.tickers = b.tickers.map((t: { ticker?: unknown; sector?: unknown }) => {
      if (typeof t?.ticker !== 'string' || !/^[A-Za-z0-9.\-]{1,20}$/.test(t.ticker)) throw new Error('tickers[].ticker must be a ticker symbol');
      if (t.sector !== null && !isSector(t.sector)) throw new Error(`tickers[].sector must be null or one of ${SECTORS.join(', ')}`);
      return { ticker: t.ticker.toUpperCase(), sector: t.sector as Sector | null };
    });
  }
  if (b.committees !== undefined) {
    if (!Array.isArray(b.committees) || b.committees.length > 500) throw new Error('committees: an array of at most 500 { committeeId, sectors }');
    edit.committees = b.committees.map((c: { committeeId?: unknown; sectors?: unknown }) => {
      if (typeof c?.committeeId !== 'string' || !/^[A-Z]{2,4}\d{0,3}$/.test(c.committeeId)) throw new Error('committees[].committeeId must be a Thomas id such as HSAS or HSAS03');
      if (!Array.isArray(c.sectors) || !c.sectors.every(isSector)) throw new Error(`committees[].sectors must be a list of ${SECTORS.join(', ')}`);
      return { committeeId: c.committeeId, sectors: c.sectors };
    });
  }
  return edit;
}

// Applies manual sector edits and rebuilds the wikis they change. Answers with what changed.
export async function applyEdit(edit: ConflictEdit): Promise<{ tickers: number; committees: number; wikis: Record<string, number> }> {
  let tickers = 0;
  let committees = 0;
  for (const t of edit.tickers ?? []) {
    // A hand edit is kept apart from SIC: sic is cleared so the row reads as manual.
    await db.query(
      `INSERT INTO "TickerSector" ("ticker", "sector", "sicLabel") VALUES ($1, $2, 'set by hand')
       ON CONFLICT ("ticker") DO UPDATE SET "sector" = $2, "sicLabel" = 'set by hand', "checkedAt" = now()`,
      [t.ticker, t.sector],
    );
    tickers++;
  }
  for (const c of edit.committees ?? []) {
    const rows = await db.query(`UPDATE "PersonCommittee" SET "sectors" = $2 WHERE "committeeId" = $1 RETURNING 1`, [c.committeeId, c.sectors]);
    committees += rows.length;
  }
  const wikis: Record<string, number> = {};
  if (committees) wikis.committees = await GovWiki.rebuildCommittees();
  if (tickers || committees) {
    wikis.filings = await GovWiki.rebuildFilings();
    wikis.companies = await CompanyWiki.rebuildAll();
  }
  return { tickers, committees, wikis };
}

export async function status() {
  const [row] = await db.query<Record<string, number | string | null>>(
    `SELECT (SELECT count(*)::int FROM "PersonCommittee") AS "seats", (SELECT count(DISTINCT "committeeId")::int FROM "PersonCommittee") AS "committees",
            (SELECT count(*)::int FROM "TickerSector") AS "tickers", (SELECT count(*)::int FROM "TickerSector" WHERE "sector" IS NULL) AS "tickersUnclassified",
            (SELECT count(*)::int FROM "GovWiki" WHERE "kind" = 'committee') AS "committeeWikis", (SELECT count(*)::int FROM "GovWiki" WHERE "kind" = 'filing') AS "filingWikis",
            (SELECT count(*)::int FROM "CompanyWiki") AS "companyWikis", (SELECT max("utcBuiltDateTime")::text FROM "GovWiki") AS "wikisBuilt"`,
  );
  return row;
}
