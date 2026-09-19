import type { AssetClass } from '@/lib/stocks';
import * as db from '../db';
import type { Row } from '../db';

export type CompanyRelationRow = {
  id: number;
  companyId: number;
  symbol: string;
  name: string | null;
  assetClass: AssetClass;
  relation: 'related' | 'supplier';
  note: string | null;
  origin: 'claude' | 'manual';
};

// A company's related and supplier companies' tickers (0030).
export default class CompanyRelation {
  static forCompany(companyId: number): Promise<CompanyRelationRow[]> {
    return db.query(
      `SELECT "id", "companyId", "symbol", "name", "assetClass", "relation", "note", "origin" FROM "CompanyRelation" WHERE "companyId" = $1 ORDER BY "relation", "id"`,
      [companyId],
    );
  }

  // Adds or replaces one; a hand-set relation is not overwritten by Claude's.
  static async set(companyId: number, r: Omit<CompanyRelationRow, 'id' | 'companyId'>): Promise<void> {
    await db.query(
      `INSERT INTO "CompanyRelation" ("companyId", "symbol", "name", "assetClass", "relation", "note", "origin") VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT ("companyId", "symbol") DO UPDATE SET "name" = EXCLUDED."name", "assetClass" = EXCLUDED."assetClass",
         "relation" = EXCLUDED."relation", "note" = EXCLUDED."note", "origin" = EXCLUDED."origin"
       WHERE "CompanyRelation"."origin" = 'claude' OR EXCLUDED."origin" = 'manual'`,
      [companyId, r.symbol, r.name, r.assetClass, r.relation, r.note, r.origin],
    );
  }

  static async markChecked(companyId: number): Promise<void> {
    await db.query(`UPDATE "Company" SET "utcRelationsCheckedDateTime" = now() WHERE "id" = $1`, [companyId]);
  }

  static getAll(): Promise<Row[]> {
    return db.query(`SELECT * FROM "CompanyRelation" ORDER BY "id"`);
  }

  static async restore(rows: Row[] = []): Promise<void> {
    for (const r of rows) {
      await db.query(
        `INSERT INTO "CompanyRelation" ("id", "companyId", "symbol", "name", "assetClass", "relation", "note", "origin", "utcCreatedDateTime")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT DO NOTHING`,
        [r.id, r.companyId, r.symbol, r.name, r.assetClass, r.relation, r.note, r.origin, r.utcCreatedDateTime],
      );
    }
    await db.query(`SELECT setval(pg_get_serial_sequence('"CompanyRelation"', 'id'), GREATEST((SELECT MAX("id") FROM "CompanyRelation"), 1))`);
  }
}
