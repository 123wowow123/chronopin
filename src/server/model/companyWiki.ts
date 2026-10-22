// The wiki behind a company (0206, src/lib/companyWiki.ts), compiled from its stored facts.

import { compileCompanyWiki, COMPANY_WIKI_VERSION, type CompanyFacts } from '@/lib/companyWiki';
import { TICKER_SECTORS } from '@/lib/conflicts';
import * as db from '../db';

export default class CompanyWiki {
  // Compiles and saves one company's wiki; false when there is no such company.
  static async rebuild(companyId: number, now: Date = new Date()): Promise<boolean> {
    const [c] = await db.query<{ name: string; description: string | null; wikiUrl: string | null; websiteUrl: string | null; ticker: string | null; hqAddress: string | null; marketCap: number | null; parentName: string | null; parentWiki: string | null }>(
      `SELECT c."name"::text AS "name", c."description", c."wikiUrl", c."websiteUrl", NULLIF(upper(trim(c."tickerSymbol")), '') AS "ticker", c."hqAddress", c."marketCap"::float8 AS "marketCap",
              p."name"::text AS "parentName", p."wikiUrl" AS "parentWiki"
       FROM "Company" c LEFT JOIN "Company" p ON p."id" = c."parentCompanyId" WHERE c."id" = $1`,
      [companyId],
    );
    if (!c) return false;
    const facts: CompanyFacts = {
      name: c.name,
      description: c.description,
      wikiUrl: c.wikiUrl,
      websiteUrl: c.websiteUrl,
      ticker: c.ticker,
      hqAddress: c.hqAddress,
      marketCap: c.marketCap,
      parent: c.parentName ? { name: c.parentName, wikiUrl: c.parentWiki } : null,
      sector: null,
      executives: await db.query<{ name: string; title: string }>(`SELECT "name", "title" FROM "CompanyExecutive" WHERE "companyId" = $1 ORDER BY "rank", "id"`, [companyId]).catch(() => []),
      trades: null,
    };
    if (c.ticker) {
      const [s] = await db.query<{ sector: string | null; sic: number | null; sicLabel: string | null; cik: number | null }>(`SELECT "sector", "sic", "sicLabel", "cik" FROM "TickerSector" WHERE "ticker" = $1`, [c.ticker]);
      if (s?.sector) facts.sector = { sector: s.sector, how: 'sic', sic: s.sic, sicLabel: s.sicLabel, cik: s.cik };
      else if (TICKER_SECTORS[c.ticker]) facts.sector = { sector: TICKER_SECTORS[c.ticker], how: 'manual', sic: null, sicLabel: null, cik: null };
      else {
        const [n] = await db.query<{ sector: string | null }>(`SELECT "sector" FROM "PersonTrade" WHERE "ticker" = $1 AND "sector" IS NOT NULL LIMIT 1`, [c.ticker]);
        if (n?.sector) facts.sector = { sector: n.sector, how: 'name', sic: null, sicLabel: null, cik: null };
      }
      const [t] = await db.query<{ count: number; people: number; first: string | null; last: string | null }>(
        `SELECT count(*)::int AS "count", count(DISTINCT "personId")::int AS "people", min("txDate")::text AS "first", max("txDate")::text AS "last" FROM "PersonTrade" WHERE "ticker" = $1`,
        [c.ticker],
      );
      if (t?.count) {
        const committees = facts.sector
          ? await db.query<{ id: string; name: string }>(
              `SELECT DISTINCT COALESCE(pc."parentId", pc."committeeId") AS "id", split_part(pc."name", ': ', 1) AS "name" FROM "PersonCommittee" pc
               WHERE $2 = ANY (pc."sectors") AND pc."personId" IN (SELECT "personId" FROM "PersonTrade" WHERE "ticker" = $1) ORDER BY 2`,
              [c.ticker, facts.sector.sector],
            )
          : [];
        facts.trades = { ...t, committees };
      }
    }
    const { page, sources } = compileCompanyWiki(facts, now);
    await db.query(
      `INSERT INTO "CompanyWiki" ("companyId", "page", "sources", "wikiVersion", "utcBuiltDateTime") VALUES ($1, $2, $3::jsonb, $4, $5)
       ON CONFLICT ("companyId") DO UPDATE SET "page" = EXCLUDED."page", "sources" = EXCLUDED."sources", "wikiVersion" = EXCLUDED."wikiVersion", "utcBuiltDateTime" = EXCLUDED."utcBuiltDateTime"`,
      [companyId, page, JSON.stringify(sources), COMPANY_WIKI_VERSION, now],
    );
    return true;
  }

  static async rebuildAll(): Promise<number> {
    const ids = await db.query<{ id: number }>(`SELECT "id" FROM "Company" ORDER BY "id"`);
    for (const { id } of ids) await CompanyWiki.rebuild(id);
    return ids.length;
  }

  static async page(companyId: number): Promise<string | null> {
    const rows = await db.query<{ page: string }>(`SELECT "page" FROM "CompanyWiki" WHERE "companyId" = $1`, [companyId]);
    return rows[0]?.page ?? null;
  }
}
