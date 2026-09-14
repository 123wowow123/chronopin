'use strict';

import * as db from '../../db';
import * as logo from '../../company/logo';

const COLUMNS = `"id", "name", "wikiUrl", "websiteUrl", "logoUrl", "utcLogoCheckedDateTime"`;

export default class Company {

  // The Company row for a typed or scraped name, created on first sight.
  // Resolves null for a blank name. A wiki URL only fills a gap: an edit form
  // that does not send one never clears the stored link. A newly created
  // company gets its logo looked up in the background.
  static resolve(name, wikiUrl) {
    const trimmed = typeof name === 'string' ? name.trim() : '';
    if (!trimmed) {
      return Promise.resolve(null);
    }
    return db.query(`
      INSERT INTO "Company" ("name", "wikiUrl")
      VALUES ($1, $2)
      ON CONFLICT ("name") DO UPDATE SET
        "wikiUrl" = COALESCE("Company"."wikiUrl", EXCLUDED."wikiUrl"),
        "utcUpdatedDateTime" = CASE WHEN "Company"."wikiUrl" IS NULL AND EXCLUDED."wikiUrl" IS NOT NULL
                                    THEN now() ELSE "Company"."utcUpdatedDateTime" END
      RETURNING ${COLUMNS}`, [trimmed, wikiUrl || null])
      .then(rows => {
        const company = rows[0];
        if (!company.utcLogoCheckedDateTime) {
          Company.findLogos([company])
            .catch(err => console.log(`Company '${company.name}' logo lookup err:`, err.message));
        }
        return company;
      });
  }

  // Sets pin.companyId from pin.company, and brings the pin's company fields
  // in line with the stored row (canonical name, wiki link, logo).
  static applyToPin(pin) {
    return Company.resolve(pin.company, pin.companyWikiUrl)
      .then(company => {
        pin.companyId = company ? company.id : null;
        pin.company = company ? company.name : null;
        pin.companyWikiUrl = company ? company.wikiUrl : null;
        pin.companyLogoUrl = company ? company.logoUrl : null;
        return pin;
      });
  }

  static getAll() {
    return db.query(`SELECT ${COLUMNS}, "utcCreatedDateTime", "utcUpdatedDateTime" FROM "Company" ORDER BY "id"`);
  }

  // Names and logos for the pin form's company suggestions.
  static list() {
    return db.query(`SELECT "id", "name", "logoUrl" FROM "Company" ORDER BY "name"`);
  }

  // Companies whose logo has not been looked for yet, or every company.
  static needingLogo(all) {
    return db.query(`SELECT ${COLUMNS} FROM "Company" ${all ? '' : 'WHERE "utcLogoCheckedDateTime" IS NULL'} ORDER BY "id"`);
  }

  // Looks up logos for these companies and stores what was found. A
  // websiteUrl already on the row is kept over the one Wikidata suggests.
  static findLogos(companies) {
    return logo.findLogos(companies)
      .then(found => Promise.all(found.map(f => db.query(`
        UPDATE "Company"
        SET "websiteUrl" = COALESCE("websiteUrl", $2),
            "logoUrl" = $3,
            "utcLogoCheckedDateTime" = now(),
            "utcUpdatedDateTime" = now()
        WHERE "id" = $1`, [f.id, f.websiteUrl || null, f.logoUrl || null])))
        .then(() => found));
  }

  // Seeding: puts companies back with their ids, links and logos, so pins
  // seeded afterwards resolve to them rather than creating fresh rows.
  static restore(companies) {
    return (companies || []).reduce((prev, c) => prev.then(() => db.query(`
      INSERT INTO "Company" ("id", "name", "wikiUrl", "websiteUrl", "logoUrl", "utcLogoCheckedDateTime", "utcCreatedDateTime", "utcUpdatedDateTime")
      VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, now()), $8)
      ON CONFLICT DO NOTHING`,
      [c.id, c.name, c.wikiUrl, c.websiteUrl, c.logoUrl, c.utcLogoCheckedDateTime, c.utcCreatedDateTime, c.utcUpdatedDateTime]
        .map(v => v === undefined ? null : v))), Promise.resolve())
      .then(() => db.query(`SELECT setval(pg_get_serial_sequence('"Company"', 'id'), GREATEST((SELECT MAX("id") FROM "Company"), 1))`));
  }
}
