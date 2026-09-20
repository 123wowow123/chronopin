import * as db from '../db';
import type { Row } from '../db';
import { inBackground } from '../background';
import * as logo from '../companyLogo';
import { findDescriptions } from '../companyDescription';

const COLUMNS = `"id", "name", "wikiUrl", "websiteUrl", "logoUrl", "utcLogoCheckedDateTime", "description", "utcDescriptionCheckedDateTime"`;

export type CompanyRow = {
  id: number;
  name: string;
  wikiUrl: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  utcLogoCheckedDateTime: Date | null;
  // A line about the company (0048), shown by a company: search.
  description: string | null;
  utcDescriptionCheckedDateTime: Date | null;
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
      // Registered rather than merely started: a script that finishes first
      // would otherwise close the pool out from under the write this makes.
      inBackground(
        Company.findLogos([company]).catch((err) =>
          console.log(`Company '${company.name}' logo lookup err:`, err.message),
        ),
      );
    }
    if (!company.utcDescriptionCheckedDateTime) {
      inBackground(
        Company.findDescriptions([company]).catch((err) =>
          console.log(`Company '${company.name}' description lookup err:`, err.message),
        ),
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
    return db.query(`SELECT ${COLUMNS}, "tickerSymbol", "tickerNote", "utcTickerCheckedDateTime", "utcRelationsCheckedDateTime",
      "hqAddress", "hqLatitude", "hqLongitude", "utcHqCheckedDateTime", "utcCreatedDateTime", "utcUpdatedDateTime" FROM "Company" ORDER BY "id"`);
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
            "wikiUrl" = COALESCE("wikiUrl", $4),
            "logoUrl" = $3,
            "utcLogoCheckedDateTime" = now(),
            "utcUpdatedDateTime" = now()
        WHERE "id" = $1`,
          [f.id, f.websiteUrl || null, f.logoUrl || null, f.wikiUrl || null],
        ),
      ),
    );
    return found;
  }

  // Companies with no description looked for yet, or every company.
  static needingDescription(all: boolean) {
    return db.query<CompanyRow>(
      `SELECT ${COLUMNS} FROM "Company" ${all ? '' : 'WHERE "utcDescriptionCheckedDateTime" IS NULL'} ORDER BY "id"`,
    );
  }

  // Looks up a line about each of these companies and stores what was found.
  // A wiki link found on the way fills a gap on the row, as the logo lookup
  // does. A fresh description replaces the stored one; a lookup that finds
  // none leaves what is there alone. A company Wikipedia turned away is not
  // marked checked at all, so the next run asks about it again.
  static async findDescriptions(companies: CompanyRow[]) {
    const found = await findDescriptions(companies);
    await Promise.all(
      found.filter((f) => !f.failed).map((f) =>
        db.query(
          `
        UPDATE "Company"
        SET "wikiUrl" = COALESCE("wikiUrl", $3),
            "description" = COALESCE($2, "description"),
            "utcDescriptionCheckedDateTime" = now(),
            "utcUpdatedDateTime" = now()
        WHERE "id" = $1`,
          [f.id, f.description, f.wikiUrl || null],
        ),
      ),
    );
    return found;
  }

  // One company by id, or null when there is no such row.
  static async getById(id: number): Promise<CompanyRow | null> {
    const rows = await db.query<CompanyRow>(`SELECT ${COLUMNS} FROM "Company" WHERE "id" = $1`, [id]);
    return rows[0] || null;
  }

  // The company a company: search names, with what its panel shows. Matched
  // as the search does, by name (citext, so case does not matter).
  static async byName(name: string): Promise<CompanyRow | null> {
    const rows = await db.query<CompanyRow>(`SELECT ${COLUMNS} FROM "Company" WHERE "name" = $1`, [name.trim()]);
    return rows[0] || null;
  }

  // Seeding: puts companies back with their ids, links and logos, so pins
  // seeded afterwards resolve to them rather than creating fresh rows.
  static async restore(companies: Row[] | undefined) {
    for (const c of companies || []) {
      await db.query(
        `
      INSERT INTO "Company" ("id", "name", "wikiUrl", "websiteUrl", "logoUrl", "utcLogoCheckedDateTime", "utcCreatedDateTime", "utcUpdatedDateTime",
        "tickerSymbol", "utcTickerCheckedDateTime", "utcRelationsCheckedDateTime", "tickerNote",
        "hqAddress", "hqLatitude", "hqLongitude", "utcHqCheckedDateTime", "description", "utcDescriptionCheckedDateTime")
      VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, now()), $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT DO NOTHING`,
        [
          c.id, c.name, c.wikiUrl, c.websiteUrl, c.logoUrl, c.utcLogoCheckedDateTime, c.utcCreatedDateTime, c.utcUpdatedDateTime,
          c.tickerSymbol, c.utcTickerCheckedDateTime, c.utcRelationsCheckedDateTime, c.tickerNote,
          c.hqAddress, c.hqLatitude, c.hqLongitude, c.utcHqCheckedDateTime, c.description, c.utcDescriptionCheckedDateTime,
        ].map(
          (v) => (v === undefined ? null : v),
        ),
      );
    }
    await db.query(
      `SELECT setval(pg_get_serial_sequence('"Company"', 'id'), GREATEST((SELECT MAX("id") FROM "Company"), 1))`,
    );
  }
}
