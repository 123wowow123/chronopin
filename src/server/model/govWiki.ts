// Wikis for committees and trade filings (0207, src/lib/govWiki.ts), compiled from PersonCommittee / PersonTrade.

import { compileCommittee, compileFiling, GOV_WIKI_VERSION, type Compiled, type FilingFacts } from '@/lib/govWiki';
import * as db from '../db';
import { CONFLICTS } from './personTrade';

const save = (kind: 'committee' | 'filing', key: string, c: Compiled, at: Date) =>
  db.query(
    `INSERT INTO "GovWiki" ("kind", "key", "title", "page", "sources", "wikiVersion", "utcBuiltDateTime") VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
     ON CONFLICT ("kind", "key") DO UPDATE SET "title" = EXCLUDED."title", "page" = EXCLUDED."page", "sources" = EXCLUDED."sources", "wikiVersion" = EXCLUDED."wikiVersion", "utcBuiltDateTime" = EXCLUDED."utcBuiltDateTime"`,
    [kind, key, c.title.slice(0, 300), c.page, JSON.stringify(c.sources), GOV_WIKI_VERSION, at],
  );

export default class GovWiki {
  static async page(kind: 'committee' | 'filing', key: string): Promise<string | null> {
    const rows = await db.query<{ page: string }>(`SELECT "page" FROM "GovWiki" WHERE "kind" = $1 AND "key" = $2`, [kind, key]);
    return rows[0]?.page ?? null;
  }

  // Rebuilds every committee wiki (or one) from the stored seats.
  static async rebuildCommittees(only?: string, now = new Date()): Promise<number> {
    const seats = await db.query<{ committeeId: string; parentId: string | null; name: string; chamber: string; title: string | null; rank: number | null; sectors: string[]; person: string }>(
      `SELECT pc."committeeId", pc."parentId", pc."name", pc."chamber", pc."title", pc."rank", pc."sectors", p."name"::text AS "person"
       FROM "PersonCommittee" pc JOIN "Person" p ON p."id" = pc."personId" WHERE $1::text IS NULL OR pc."committeeId" = $1 ORDER BY pc."committeeId", pc."rank" NULLS LAST, p."name"`,
      [only ?? null],
    );
    const all = only
      ? await db.query<{ committeeId: string; parentId: string | null; name: string; n: number }>(`SELECT "committeeId", "parentId", min("name") AS "name", count(*)::int AS "n" FROM "PersonCommittee" GROUP BY 1, 2`)
      : null;
    const by = new Map<string, typeof seats>();
    for (const s of seats) by.set(s.committeeId, [...(by.get(s.committeeId) ?? []), s]);
    const info = new Map<string, { name: string; n: number; parentId: string | null }>();
    for (const [id, list] of by) info.set(id, { name: list[0].name, n: list.length, parentId: list[0].parentId });
    for (const a of all ?? []) if (!info.has(a.committeeId)) info.set(a.committeeId, { name: a.name, n: a.n, parentId: a.parentId });
    let built = 0;
    for (const [id, list] of by) {
      const head = list[0];
      const parent = head.parentId ? info.get(head.parentId) : null;
      const flagged = await db.query<{ ticker: string | null; asset: string; people: number; n: number }>(
        `SELECT t."ticker", min(t."asset") AS "asset", count(DISTINCT t."personId")::int AS "people", count(*)::int AS "n"
         FROM "PersonTrade" t JOIN "PersonCommittee" pc ON pc."personId" = t."personId" AND pc."committeeId" = $1
         WHERE COALESCE((SELECT ts."sector" FROM "TickerSector" ts WHERE ts."ticker" = t."ticker"), t."sector") = ANY (pc."sectors") GROUP BY t."ticker", t."asset"`,
        [id],
      );
      const byTicker = new Map<string, number>();
      for (const r of flagged) byTicker.set(r.ticker ?? r.asset.slice(0, 30), (byTicker.get(r.ticker ?? r.asset.slice(0, 30)) ?? 0) + r.n);
      const [tot] = await db.query<{ n: number; people: number }>(
        `SELECT count(*)::int AS n, count(DISTINCT t."personId")::int AS people FROM "PersonTrade" t JOIN "PersonCommittee" pc ON pc."personId" = t."personId" AND pc."committeeId" = $1
         WHERE COALESCE((SELECT ts."sector" FROM "TickerSector" ts WHERE ts."ticker" = t."ticker"), t."sector") = ANY (pc."sectors")`,
        [id],
      );
      const subs = [...info].filter(([, v]) => v.parentId === id).map(([cid, v]) => ({ committeeId: cid, name: v.name, members: v.n }));
      const c = compileCommittee(
        {
          committeeId: id, name: head.name, chamber: head.chamber,
          parent: head.parentId && parent ? { committeeId: head.parentId, name: parent.name } : null,
          sectors: head.sectors,
          members: list.map((m) => ({ name: m.person, title: m.title, rank: m.rank })),
          subcommittees: subs,
          flagged: { trades: tot?.n ?? 0, people: tot?.people ?? 0, tickers: [...byTicker].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([ticker, count]) => ({ ticker, count })) },
        },
        now,
      );
      await save('committee', id, c, now);
      built++;
    }
    return built;
  }

  // Rebuilds the wiki of every filing (or one, "chamber:filingId") from the stored trades.
  static async rebuildFilings(only?: string, now = new Date()): Promise<number> {
    const [chamber, filingId] = only ? only.split(':') : [null, null];
    const rows = await db.query<{ chamber: FilingFacts['chamber']; filingId: string; filer: string; filedDate: string | null; sourceUrl: string; txDate: string; asset: string; ticker: string | null; txType: string; amountLow: number | null; amountHigh: number | null; owner: string; sector: string | null; conflicts: { committee: string }[] }>(
      `SELECT t."chamber", t."filingId", p."name"::text AS "filer", t."filedDate"::text AS "filedDate", t."sourceUrl", t."txDate"::text AS "txDate", t."asset", t."ticker", t."txType",
              t."amountLow"::float8 AS "amountLow", t."amountHigh"::float8 AS "amountHigh", t."owner",
              COALESCE((SELECT ts."sector" FROM "TickerSector" ts WHERE ts."ticker" = t."ticker"), t."sector") AS "sector", ${CONFLICTS('t')} AS "conflicts"
       FROM "PersonTrade" t JOIN "Person" p ON p."id" = t."personId"
       WHERE $1::text IS NULL OR (t."chamber" = $1 AND t."filingId" = $2) ORDER BY t."chamber", t."filingId", t."txDate", t."id"`,
      [chamber, filingId],
    );
    let built = 0;
    for (let i = 0; i < rows.length; ) {
      let j = i;
      while (j < rows.length && rows[j].chamber === rows[i].chamber && rows[j].filingId === rows[i].filingId && rows[j].filer === rows[i].filer) j++;
      const g = rows.slice(i, j);
      const c = compileFiling(
        {
          chamber: g[0].chamber, filingId: g[0].filingId, filer: g[0].filer, filedDate: g[0].filedDate, sourceUrl: g[0].sourceUrl,
          trades: g.map((r) => ({ ...r, conflicts: [...new Set(r.conflicts.map((x) => x.committee.split(': ')[0]))] })),
        },
        now,
      );
      await save('filing', `${g[0].chamber}:${g[0].filingId}`, c, now);
      built++;
      i = j;
    }
    return built;
  }
}
