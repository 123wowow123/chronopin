import * as db from '../db';
import type { Row } from '../db';
import * as logo from '../companyLogo';

const COLUMNS = `"id", "name", "wikiUrl", "websiteUrl", "logoUrl", "utcLogoCheckedDateTime"`;

export type CompanyRow = {
  id: number;
  name: string;
  wikiUrl: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  utcLogoCheckedDateTime: Date | null;
};

export default class Company {
  // The Company row for a typed or scraped name, created on first sight.
  // Resolves null for a blank name. A wiki URL only fills a gap: an edit form
  // that does not send one never clears the stored link. A newly created
  // company gets its logo looked up in the background.
  static async resolve(name: unknown, wikiUrl?: string | null): Promise<CompanyRow | null> {
    const trimmed = typeof name === 'string' ? name.trim() : '';
    if (!trimmed) {
      return null;
    }
    const rows = await db.query<CompanyRow>(
      `
      INSERT INTO "Company" ("name", "wikiUrl")
      VALUES ($1, $2)
      ON CONFLICT ("name") DO UPDATE SET
        "wikiUrl" = COALESCE("Company"."wikiUrl", EXCLUDED."wikiUrl"),
        "utcUpdatedDateTime" = CASE WHEN "Company"."wikiUrl" IS NULL AND EXCLUDED."wikiUrl" IS NOT NULL
                                    THEN now() ELSE "Company"."utcUpdatedDateTime" END
      RETURNING ${COLUMNS}`,
      [trimmed, wikiUrl || null],
    );
    const company = rows[0];
    if (!company.utcLogoCheckedDateTime) {
      Company.findLogos([company]).catch((err) =>
        console.log(`Company '${company.name}' logo lookup err:`, err.message),
      );
    }
    return company;
  }

  // Sets pin.companyId from pin.company, and brings the pin's company fields
  // in line with the stored row (canonical name, wiki link, logo).
  static async applyToPin<T extends Row>(pin: T): Promise<T> {
    const company = await Company.resolve(pin.company, pin.companyWikiUrl);
    const target = pin as Row;
    target.companyId = company ? company.id : null;
    target.company = company ? company.name : null;
    target.companyWikiUrl = company ? company.wikiUrl : null;
    target.companyLogoUrl = company ? company.logoUrl : null;
    return pin;
  }

  static getAll() {
    return db.query(`SELECT ${COLUMNS}, "utcCreatedDateTime", "utcUpdatedDateTime" FROM "Company" ORDER BY "id"`);
  }

  // Names and logos for the pin form's company suggestions.
  static list() {
    return db.query<{ id: number; name: string; logoUrl: string | null }>(
      `SELECT "id", "name", "logoUrl" FROM "Company" ORDER BY "name"`,
    );
  }

  // Companies whose logo has not been looked for yet, or every company.
  static needingLogo(all: boolean) {
    return db.query<CompanyRow>(
      `SELECT ${COLUMNS} FROM "Company" ${all ? '' : 'WHERE "utcLogoCheckedDateTime" IS NULL'} ORDER BY "id"`,
    );
  }

  // Looks up logos for these companies and stores what was found. A
  // websiteUrl already on the row is kept over the one Wikidata suggests.
  static async findLogos(companies: CompanyRow[]) {
    const found = await logo.findLogos(companies);
    await Promise.all(
      found.map((f) =>
        db.query(
          `
        UPDATE "Company"
        SET "websiteUrl" = COALESCE("websiteUrl", $2),
            "logoUrl" = $3,
            "utcLogoCheckedDateTime" = now(),
            "utcUpdatedDateTime" = now()
        WHERE "id" = $1`,
          [f.id, f.websiteUrl || null, f.logoUrl || null],
        ),
      ),
    );
    return found;
  }

  // Seeding: puts companies back with their ids, links and logos, so pins
  // seeded afterwards resolve to them rather than creating fresh rows.
  static async restore(companies: Row[] | undefined) {
    for (const c of companies || []) {
      await db.query(
        `
      INSERT INTO "Company" ("id", "name", "wikiUrl", "websiteUrl", "logoUrl", "utcLogoCheckedDateTime", "utcCreatedDateTime", "utcUpdatedDateTime")
      VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, now()), $8)
      ON CONFLICT DO NOTHING`,
        [c.id, c.name, c.wikiUrl, c.websiteUrl, c.logoUrl, c.utcLogoCheckedDateTime, c.utcCreatedDateTime, c.utcUpdatedDateTime].map(
          (v) => (v === undefined ? null : v),
        ),
      );
    }
    await db.query(
      `SELECT setval(pg_get_serial_sequence('"Company"', 'id'), GREATEST((SELECT MAX("id") FROM "Company"), 1))`,
    );
  }
}
