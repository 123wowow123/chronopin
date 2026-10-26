import { createHash } from 'node:crypto';
import type { HoldingsSnapshot } from '@/lib/holdings';
import * as db from '../db';
import catalog from '../data/personHoldings.json';
import { readHoldings } from '../holdingsInput';

const bundled = new Map((catalog.profiles as { name: string; portfolios: unknown[] }[]).map(p => [p.name, readHoldings(p)]));
export const holdingsEtag = (portfolios: HoldingsSnapshot[]) => `"${createHash('sha256').update(JSON.stringify(portfolios)).digest('hex')}"`;

export default class PersonHoldings {
  static async forPerson(personId: number, name: string): Promise<HoldingsSnapshot[]> {
    const [row] = await db.query<{ portfolios: HoldingsSnapshot[] }>('SELECT "portfolios" FROM "PersonHoldings" WHERE "personId" = $1', [personId]);
    return row?.portfolios ?? bundled.get(name) ?? [];
  }

  // Merge only the keys supplied by the caller, atomically; other sources stay.
  // The ETag checks both the bundled baseline and any newer admin edits.
  static async save(personId: number, name: string, additions: HoldingsSnapshot[], expected: string): Promise<boolean> {
    return db.transaction(async q => {
      await q('SELECT "id" FROM "Person" WHERE "id" = $1 FOR UPDATE', [personId]);
      const [row] = await q<{ portfolios: HoldingsSnapshot[] }>('SELECT "portfolios" FROM "PersonHoldings" WHERE "personId" = $1', [personId]);
      const current = row?.portfolios ?? bundled.get(name) ?? [];
      if (holdingsEtag(current) !== expected) return false;
      const next = [...current];
      for (const addition of additions) {
        const at = next.findIndex(p => p.key === addition.key);
        if (at < 0) next.push(addition);
        else {
          if (addition.asOf < next[at].asOf || addition.checkedAt < next[at].checkedAt) throw new Error('Holdings update would replace newer evidence');
          next[at] = addition;
        }
      }
      await q(`INSERT INTO "PersonHoldings" ("personId", "portfolios") VALUES ($1, $2::jsonb)
        ON CONFLICT ("personId") DO UPDATE SET "portfolios" = EXCLUDED."portfolios", "utcUpdatedDateTime" = now()`, [personId, JSON.stringify(next)]);
      return true;
    });
  }
}
