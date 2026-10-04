// A company's C-suite and what each was paid (0125), shown in the company
// panel. Filled on the dev machine (`npm run companies:executives`); prod
// stores what a local run sends it (PUT /api/companies/:id/executives).

import * as db from '../db';

export type CompanyExecutiveJson = {
  name: string;
  title: string;
  // Whole units of `currency`; null where the company does not publish pay.
  salary: number | null;
  totalCompensation: number | null;
  // The other columns of the pay table (null: not in the filing).
  bonus: number | null;
  stockAwards: number | null;
  optionAwards: number | null;
  incentivePay: number | null;
  pensionChange: number | null;
  otherCompensation: number | null;
  currency: string;
  fiscalYear: number | null;
  sourceUrl: string | null;
};

export type CompanyExecutiveInput = {
  name: string;
  title: string;
  salary?: number | null;
  totalCompensation?: number | null;
  bonus?: number | null;
  stockAwards?: number | null;
  optionAwards?: number | null;
  incentivePay?: number | null;
  pensionChange?: number | null;
  otherCompensation?: number | null;
  currency?: string | null;
  fiscalYear?: number | null;
  sourceUrl?: string | null;
  origin?: 'sec' | 'claude' | 'hand';
};

type Stored = { name: string; title: string; salary: string | null; totalCompensation: string | null; bonus: string | null; stockAwards: string | null; optionAwards: string | null; incentivePay: string | null; pensionChange: string | null; otherCompensation: string | null; currency: string; fiscalYear: number | null; sourceUrl: string | null };

// The order the panel lists them in: the chief executive, then the president,
// finance, operations, technology, any other chief officer. A title naming
// several seats ("President and CFO") takes the highest.
export function executiveRank(title: string): number {
  const t = title.toLowerCase();
  if (/\b(ceo|chief executive)/.test(t)) return 1;
  if (/\bpresident\b/.test(t) && !/vice|svp|evp/.test(t)) return 2;
  if (/\b(cfo|chief financial)/.test(t)) return 3;
  if (/\b(coo|chief operating)/.test(t)) return 4;
  if (/\b(cto|chief technology|chief technical)/.test(t)) return 5;
  return 6;
}

const whole = (value: string | null) => (value == null ? null : Number(value));

export default class CompanyExecutive {
  static async forCompany(companyId: number): Promise<CompanyExecutiveJson[]> {
    const rows = await db.query<Stored>(
      `SELECT "name", "title", "salary", "totalCompensation", "bonus", "stockAwards", "optionAwards", "incentivePay", "pensionChange", "otherCompensation", "currency", "fiscalYear", "sourceUrl"
       FROM "CompanyExecutive" WHERE "companyId" = $1 ORDER BY "rank", "id"`,
      [companyId],
    );
    return rows.map((r) => ({
      ...r,
      salary: whole(r.salary),
      totalCompensation: whole(r.totalCompensation),
      bonus: whole(r.bonus),
      stockAwards: whole(r.stockAwards),
      optionAwards: whole(r.optionAwards),
      incentivePay: whole(r.incentivePay),
      pensionChange: whole(r.pensionChange),
      otherCompensation: whole(r.otherCompensation),
    }));
  }

  // Adds or replaces one person. A figure left out keeps the one stored, so a
  // run that only knows the name does not blank pay found before.
  static async set(companyId: number, e: CompanyExecutiveInput): Promise<void> {
    await db.query(
      `INSERT INTO "CompanyExecutive" ("companyId", "name", "title", "rank", "salary", "totalCompensation", "currency", "fiscalYear", "sourceUrl", "origin", "bonus", "stockAwards", "optionAwards", "incentivePay", "pensionChange", "otherCompensation")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       ON CONFLICT ("companyId", "name") DO UPDATE SET
         "title" = EXCLUDED."title", "rank" = EXCLUDED."rank",
         "salary" = COALESCE(EXCLUDED."salary", "CompanyExecutive"."salary"),
         "totalCompensation" = COALESCE(EXCLUDED."totalCompensation", "CompanyExecutive"."totalCompensation"),
         "bonus" = COALESCE(EXCLUDED."bonus", "CompanyExecutive"."bonus"),
         "stockAwards" = COALESCE(EXCLUDED."stockAwards", "CompanyExecutive"."stockAwards"),
         "optionAwards" = COALESCE(EXCLUDED."optionAwards", "CompanyExecutive"."optionAwards"),
         "incentivePay" = COALESCE(EXCLUDED."incentivePay", "CompanyExecutive"."incentivePay"),
         "pensionChange" = COALESCE(EXCLUDED."pensionChange", "CompanyExecutive"."pensionChange"),
         "otherCompensation" = COALESCE(EXCLUDED."otherCompensation", "CompanyExecutive"."otherCompensation"),
         "currency" = EXCLUDED."currency",
         "fiscalYear" = COALESCE(EXCLUDED."fiscalYear", "CompanyExecutive"."fiscalYear"),
         "sourceUrl" = COALESCE(EXCLUDED."sourceUrl", "CompanyExecutive"."sourceUrl"),
         "origin" = EXCLUDED."origin", "utcUpdatedDateTime" = now()`,
      [
        companyId,
        e.name.trim(),
        e.title.trim(),
        executiveRank(e.title),
        e.salary ?? null,
        e.totalCompensation ?? null,
        (e.currency || 'USD').toUpperCase(),
        e.fiscalYear ?? null,
        e.sourceUrl ?? null,
        e.origin ?? 'hand',
        e.bonus ?? null,
        e.stockAwards ?? null,
        e.optionAwards ?? null,
        e.incentivePay ?? null,
        e.pensionChange ?? null,
        e.otherCompensation ?? null,
      ],
    );
  }

  // Replaces the whole list: the people who left the seat go too.
  static async replace(companyId: number, list: CompanyExecutiveInput[]): Promise<void> {
    const names = list.map((e) => e.name.trim());
    await db.query(`DELETE FROM "CompanyExecutive" WHERE "companyId" = $1 AND NOT ("name" = ANY($2::text[]))`, [companyId, names]);
    for (const e of list) await CompanyExecutive.set(companyId, e);
  }

  static getAll(): Promise<db.Row[]> {
    return db.query(
      `SELECT "companyId", "name", "title", "rank", "salary"::float8 AS "salary", "totalCompensation"::float8 AS "totalCompensation", "bonus"::float8 AS "bonus", "stockAwards"::float8 AS "stockAwards", "optionAwards"::float8 AS "optionAwards", "incentivePay"::float8 AS "incentivePay", "pensionChange"::float8 AS "pensionChange", "otherCompensation"::float8 AS "otherCompensation", "currency", "fiscalYear", "sourceUrl", "origin"
       FROM "CompanyExecutive" ORDER BY "companyId", "rank", "id"`,
    );
  }

  // From seedCompanyExecutives.json; rows for companies that are not there are skipped.
  static async restore(rows: db.Row[] = []): Promise<void> {
    for (const r of rows) {
      await db.query(
        `INSERT INTO "CompanyExecutive" ("companyId", "name", "title", "rank", "salary", "totalCompensation", "currency", "fiscalYear", "sourceUrl", "origin", "bonus", "stockAwards", "optionAwards", "incentivePay", "pensionChange", "otherCompensation")
         SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16 WHERE EXISTS (SELECT 1 FROM "Company" WHERE "id" = $1)
         ON CONFLICT ("companyId", "name") DO NOTHING`,
        [r.companyId, r.name, r.title, r.rank, r.salary, r.totalCompensation, r.currency, r.fiscalYear, r.sourceUrl, r.origin, r.bonus ?? null, r.stockAwards ?? null, r.optionAwards ?? null, r.incentivePay ?? null, r.pensionChange ?? null, r.otherCompensation ?? null],
      );
    }
  }
}
