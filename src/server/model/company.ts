import * as db from '../db';
import type { Row } from '../db';
import { inBackground } from '../background';
import * as logo from '../companyLogo';
import { findDescriptions } from '../companyDescription';
import { findLocalNames, nameIndex, type NameIndex } from '../companyNames';
import { wordStartPattern } from '../util/searchQuery';

const COLUMNS = `"id", "name", "wikiUrl", "websiteUrl", "logoUrl", "utcLogoCheckedDateTime", "description", "utcDescriptionCheckedDateTime", "utcLocalNamesCheckedDateTime"`;

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
  // When its names in other scripts were looked up (0105, companyNames.ts).
  utcLocalNamesCheckedDateTime: Date | null;
};

const NAME_INDEX_TTL = 10 * 60 * 1000;
const nameCache: { at: number; index: Promise<NameIndex> | null } = { at: 0, index: null };

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
    // The logo lookup also finds the Wikipedia article of a company that came
    // without one, which the local names are then read from.
    const logoLookup = company.utcLogoCheckedDateTime
      ? Promise.resolve()
      : Company.findLogos([company]).then(
          () => undefined,
          (err) => console.log(`Company '${company.name}' logo lookup err:`, err.message),
        );
    // Registered rather than merely started: a script that finishes first
    // would otherwise close the pool out from under the write this makes.
    inBackground(logoLookup);
    if (!company.utcLocalNamesCheckedDateTime) {
      inBackground(
        logoLookup
          .then(() => Company.findLocalNames([company.id]))
          .catch((err) => console.log(`Company '${company.name}' local names lookup err:`, err.message)),
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
      "hqAddress", "hqLatitude", "hqLongitude", "utcHqCheckedDateTime", "marketCap", "utcMarketCapCheckedDateTime", "localNames", "utcLocalNamesCheckedDateTime", "utcCreatedDateTime", "utcUpdatedDateTime" FROM "Company" ORDER BY "id"`);
  }

  // Names and logos for the pin form's company suggestions.
  static list() {
    return db.query<{ id: number; name: string; logoUrl: string | null }>(
      `SELECT "id", "name", "logoUrl" FROM "Company" ORDER BY "name"`,
    );
  }

  // Companies with a word of their name starting with the typed text, most
  // pins first, for the search suggestions. A company whose pins are all
  // deleted is left out: its company: search would find nothing.
  static suggest(text: string, limit: number) {
    return db.query<{ name: string; logoUrl: string | null; count: number }>(
      `
      SELECT "Company"."name"::text AS "name", "Company"."logoUrl", COUNT(*)::integer AS "count"
      FROM "Company"
        INNER JOIN "Pin" ON "Pin"."companyId" = "Company"."id" AND "Pin"."utcDeletedDateTime" IS NULL
      WHERE "Company"."name"::text ~* $1
      GROUP BY "Company"."id"
      ORDER BY 3 DESC, 1
      LIMIT $2`,
      [wordStartPattern(text), limit],
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

  // Companies whose names in other scripts have not been looked up, or every company.
  static needingLocalNames(all: boolean) {
    return db.query<{ id: number; name: string; wikiUrl: string | null }>(
      `SELECT "id", "name"::text AS "name", "wikiUrl" FROM "Company" ${all ? '' : 'WHERE "utcLocalNamesCheckedDateTime" IS NULL'} ORDER BY "id"`,
    );
  }

  // Looks up these companies' names in other scripts and stores them.
  static async findLocalNames(ids: number[]) {
    const companies = await db.query<{ id: number; wikiUrl: string | null }>(`SELECT "id", "wikiUrl" FROM "Company" WHERE "id" = ANY($1::integer[])`, [ids]);
    const found = await findLocalNames(companies);
    await Promise.all(
      found.map((f) =>
        db.query(`UPDATE "Company" SET "localNames" = $2, "utcLocalNamesCheckedDateTime" = now() WHERE "id" = $1`, [f.id, f.names]),
      ),
    );
    Company.forgetNameIndex();
    return found;
  }

  // Every company's names in other scripts, for search (withCompanyNames):
  // read once and kept for a few minutes, as every search asks for it.
  static nameIndex(): Promise<NameIndex> {
    const now = Date.now();
    if (!nameCache.index || now - nameCache.at > NAME_INDEX_TTL) {
      nameCache.at = now;
      nameCache.index = db
        .query<{ name: string; localNames: string[] }>(
          // Busiest first: a name several companies share (迪士尼 for Disney,
          // Disney+ and FX, whose articles lead to one entity) goes to the
          // one with the most pins.
          `SELECT "name"::text AS "name", "localNames" FROM "Company" AS "c" WHERE cardinality("localNames") > 0
           ORDER BY (SELECT count(*) FROM "Pin" WHERE "Pin"."companyId" = "c"."id" AND "Pin"."utcDeletedDateTime" IS NULL) DESC, "id"`,
        )
        .then(nameIndex, (err) => {
          nameCache.index = null;
          throw err;
        });
    }
    return nameCache.index;
  }

  static forgetNameIndex() {
    nameCache.index = null;
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

  // The company listed under this ticker, when only one is: several can
  // share one (Sony's divisions all trade as SONY), and then none is it.
  static async byTicker(symbol: string): Promise<CompanyRow | null> {
    const rows = await db.query<CompanyRow>(`SELECT ${COLUMNS} FROM "Company" WHERE upper("tickerSymbol") = $1 LIMIT 2`, [symbol.trim().toUpperCase()]);
    return rows.length === 1 ? rows[0] : null;
  }

  // Seeding: puts companies back with their ids, links and logos, so pins
  // seeded afterwards resolve to them rather than creating fresh rows.
  static async restore(companies: Row[] | undefined) {
    for (const c of companies || []) {
      await db.query(
        `
      INSERT INTO "Company" ("id", "name", "wikiUrl", "websiteUrl", "logoUrl", "utcLogoCheckedDateTime", "utcCreatedDateTime", "utcUpdatedDateTime",
        "tickerSymbol", "utcTickerCheckedDateTime", "utcRelationsCheckedDateTime", "tickerNote",
        "hqAddress", "hqLatitude", "hqLongitude", "utcHqCheckedDateTime", "description", "utcDescriptionCheckedDateTime",
        "marketCap", "utcMarketCapCheckedDateTime", "localNames", "utcLocalNamesCheckedDateTime")
      VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, now()), $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      ON CONFLICT DO NOTHING`,
        [
          c.id, c.name, c.wikiUrl, c.websiteUrl, c.logoUrl, c.utcLogoCheckedDateTime, c.utcCreatedDateTime, c.utcUpdatedDateTime,
          c.tickerSymbol, c.utcTickerCheckedDateTime, c.utcRelationsCheckedDateTime, c.tickerNote,
          c.hqAddress, c.hqLatitude, c.hqLongitude, c.utcHqCheckedDateTime, c.description, c.utcDescriptionCheckedDateTime,
          c.marketCap, c.utcMarketCapCheckedDateTime, c.localNames, c.utcLocalNamesCheckedDateTime,
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
