import { createHash } from 'node:crypto';
import { preferredHoldings, type HoldingsSnapshot } from '@/lib/holdings';
import * as db from '../db';
import catalog from '../data/personHoldings.json';
import primary from '../data/personHoldingsPrimary.json';
import insiders from '../data/personHoldingsInsiders.json';
import reported from '../data/personHoldingsReported.json';
import { readHoldings } from '../holdingsInput';

const bundled = new Map<string, HoldingsSnapshot[]>();
for (const p of [...catalog.profiles, ...primary.profiles, ...insiders.profiles, ...reported.profiles] as { name: string; portfolios: unknown[] }[]) bundled.set(p.name, [...(bundled.get(p.name) ?? []), ...readHoldings(p)]);
function combined(name: string, stored: HoldingsSnapshot[] = []): HoldingsSnapshot[] {
  const byKey = new Map((bundled.get(name) ?? []).map(p => [p.key, p]));
  for (const p of stored) byKey.set(p.key, p);
  return preferredHoldings([...byKey.values()]);
}
export const holdingsEtag = (portfolios: HoldingsSnapshot[]) => `"${createHash('sha256').update(JSON.stringify(portfolios)).digest('hex')}"`;
export class HoldingsConflictError extends Error {}

export default class PersonHoldings {
  static async forPerson(personId: number, name: string): Promise<HoldingsSnapshot[]> {
    const [row] = await db.query<{ portfolios: HoldingsSnapshot[] }>('SELECT "portfolios" FROM "PersonHoldings" WHERE "personId" = $1', [personId]);
    return combined(name, row?.portfolios);
  }

  // Merge only the keys supplied by the caller, atomically; other sources stay.
  // The ETag checks both the bundled baseline and any newer admin edits.
  static async save(personId: number, name: string, additions: HoldingsSnapshot[], expected: string): Promise<boolean> {
    return db.transaction(async q => {
      await q('SELECT "id" FROM "Person" WHERE "id" = $1 FOR UPDATE', [personId]);
      const [row] = await q<{ portfolios: HoldingsSnapshot[] }>('SELECT "portfolios" FROM "PersonHoldings" WHERE "personId" = $1', [personId]);
      const current = combined(name, row?.portfolios);
      if (holdingsEtag(current) !== expected) return false;
      const next = [...current];
      for (const addition of additions) {
        const at = next.findIndex(p => p.key === addition.key);
        if (at < 0) next.push(addition);
        else {
          if (addition.asOf < next[at].asOf || addition.checkedAt < next[at].checkedAt || (addition.performance && next[at].performance && addition.performance!.asOf < next[at].performance!.asOf)) throw new HoldingsConflictError('Holdings update would replace newer evidence');
          next[at] = addition;
        }
      }
      await q(`INSERT INTO "PersonHoldings" ("personId", "portfolios") VALUES ($1, $2::jsonb)
        ON CONFLICT ("personId") DO UPDATE SET "portfolios" = EXCLUDED."portfolios", "utcUpdatedDateTime" = now()`, [personId, JSON.stringify(next)]);
      return true;
    });
  }
}
