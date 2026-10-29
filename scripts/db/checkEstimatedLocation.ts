// Exercise the real migration/trigger locally and roll everything back.
// npx tsx scripts/db/checkEstimatedLocation.ts
import '../env';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as db from '@/server/db';

const rollback = new Error('estimated-location-check-rollback');

async function run() {
  const host = new URL(process.env.DATABASE_URL!).hostname;
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(host), 'Run this check against a local database');
  try {
    await db.transaction(async (query) => {
      await query('DROP TRIGGER IF EXISTS "Pin_estimatedLocation" ON "Pin"');
      const migration = readFileSync(new URL('./schema/0230_pin_estimated_location.sql', import.meta.url), 'utf8');
      await query(migration.replace('CREATE FUNCTION', 'CREATE OR REPLACE FUNCTION'));
      // The trigger needs only these fields. A temporary table avoids pin
      // identities, authors, notifications and cache writes while exercising
      // the same function and INSERT/UPDATE events as the production table.
      await query(`CREATE TEMP TABLE "EstimatedLocationCheck" (
        id integer PRIMARY KEY, address text, "longFormSummary" text,
        location geography(Point, 4326)) ON COMMIT DROP`);
      await query(`CREATE TRIGGER "estimatedLocationCheck"
        BEFORE INSERT OR UPDATE OF address, location, "longFormSummary" ON "EstimatedLocationCheck"
        FOR EACH ROW EXECUTE FUNCTION "pinEstimatedLocation"()`);

      const cases = [
        { address: 'Tempe, Arizona (approximate campus point)', summary: '', estimated: true },
        { address: 'Estimated: Tempe, Arizona', summary: '', estimated: true },
        { address: 'Estimated location: Tempe, Arizona', summary: '', estimated: true },
        { address: 'Tempe, Arizona', summary: '<p>Map position is <b>approximate</b>, based on area geocoding.</p>', estimated: true },
        { address: 'Tempe, Arizona', summary: 'Map location: Location is approximate locality; coordinates are not a surveyed entrance.', estimated: true },
        { address: 'Tempe, Arizona', summary: 'An approximate location is shown for the new factory.', estimated: true },
        { address: '123 Warner Road, Tempe, Arizona', summary: 'An estimated $500 million budget and approximately 600 jobs. Opening estimated for 2028.', estimated: false },
        { address: '123 Warner Road, Tempe, Arizona', summary: 'Verified factory entrance.', estimated: false },
        { address: 'Tempe, Arizona (approximate)', summary: '', estimated: false, mapped: false },
        { address: null, summary: 'Map position is approximate.', estimated: false },
      ];
      for (const [i, item] of cases.entries()) {
        const point = item.mapped === false ? null : 'SRID=4326;POINT(-111.9594285 33.3356129)';
        const [saved] = await query(`INSERT INTO "EstimatedLocationCheck" (id, address, "longFormSummary", location)
          VALUES ($1, $2, $3, $4::geography) RETURNING address, "longFormSummary", ST_AsEWKT(location) AS location`,
        [i, item.address, item.summary, point]);
        const expected = item.estimated && !/^estimated(?: location)?:/i.test(item.address!)
          ? 'Estimated: ' + item.address : item.address;
        assert.equal(saved.address, expected, `insert case ${i}`);
        assert.equal(saved.longFormSummary, item.summary);
        assert.equal(saved.location, point);
        const [again] = await query(`UPDATE "EstimatedLocationCheck" SET address = address WHERE id = $1 RETURNING address`, [i]);
        assert.equal(again.address, expected, `idempotent edit ${i}`);
      }
      // Adding evidence later, or coordinates after the evidence, must also
      // work: these are common partial admin API updates.
      const [edited] = await query(`UPDATE "EstimatedLocationCheck" SET "longFormSummary" = 'Map position is approximate.'
        WHERE id = 7 RETURNING address`);
      assert.equal(edited.address, 'Estimated: 123 Warner Road, Tempe, Arizona');
      const [mapped] = await query(`UPDATE "EstimatedLocationCheck" SET location = 'SRID=4326;POINT(-111.96 33.34)'::geography
        WHERE id = 8 RETURNING address`);
      assert.equal(mapped.address, 'Estimated: Tempe, Arizona (approximate)');
      throw rollback;
    });
  } catch (err) {
    if (err !== rollback) throw err;
  }
  console.log('Estimated location: 10 insert cases, repeat edits and partial updates passed; all changes rolled back.');
}

run().catch(err => { console.error(err); process.exitCode = 1; }).finally(() => db.closeConnection());
