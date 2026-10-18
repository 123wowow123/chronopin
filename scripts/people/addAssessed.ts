// Adds contributions - each with its good-for-society assessment (0156) - to
// people who already exist, one row at a time, without touching the rest of
// their contribution list (Person.save replaces a whole hand list).
//
//   npm run people:add-assessed -- file.json [--dry-run]
//
// [{ "name": "Richard Nixon", "contribution": { "kind": "executive-order",
//    "title": "...", "reference": "EO 11615", "date": "1971-08-15",
//    "role": "signed", "importance": 4, "sourceUrl": "https://...",
//    "summary": "...", "impact": { scores, confidence, contested, basis,
//    evidenceUrl, assessedDate } } }]
//
// The contribution needs its own source URL (who did it); the impact needs
// scores, a confidence and an evidence URL (readImpact). An existing row with
// the same kind/title/reference is updated, never duplicated. Each person's
// wiki is rebuilt afterwards.

import '../env';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import PersonWiki from '@/server/model/personWiki';
import { readContribution } from '@/server/personInput';

const { values: flags, positionals } = parseArgs({ allowPositionals: true, options: { 'dry-run': { type: 'boolean', default: false } } });

async function main() {
  if (!positionals[0]) throw new Error('Pass a JSON file');
  const entries = JSON.parse(readFileSync(positionals[0], 'utf8')) as { name: string; contribution: Record<string, unknown> }[];
  const touched = new Set<number>();
  let saved = 0;
  for (const e of entries) {
    const c = readContribution({ ...e.contribution, origin: 'hand' });
    if (!c || !c.sourceUrl) {
      console.log(`${e.name}: contribution refused (needs a title and a source URL)`);
      continue;
    }
    if (!c.impact) {
      console.log(`${e.name} / ${c.title}: assessment refused (scores, confidence and evidence URL needed)`);
      continue;
    }
    const people = await db.query<{ id: number }>(`SELECT "id" FROM "Person" WHERE lower("name") = lower($1)`, [e.name]);
    if (people.length !== 1) {
      console.log(`${e.name}: ${people.length ? 'several people' : 'no such person'}`);
      continue;
    }
    if (!flags['dry-run']) {
      await db.query(
        `INSERT INTO "PersonContribution" ("personId", "kind", "title", "summary", "role", "date", "reference", "importance", "sourceUrl", "origin",
            "impactScores", "impactConfidence", "impactContested", "impactBasis", "impactEvidenceUrl", "impactAssessedDate")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'hand', $10::jsonb, $11, $12, $13, $14, $15)
         ON CONFLICT ("personId", "kind", "title", "reference") DO UPDATE SET
           "summary" = COALESCE(EXCLUDED."summary", "PersonContribution"."summary"), "role" = EXCLUDED."role", "date" = EXCLUDED."date",
           "importance" = EXCLUDED."importance", "sourceUrl" = EXCLUDED."sourceUrl", "impactScores" = EXCLUDED."impactScores",
           "impactConfidence" = EXCLUDED."impactConfidence", "impactContested" = EXCLUDED."impactContested", "impactBasis" = EXCLUDED."impactBasis",
           "impactEvidenceUrl" = EXCLUDED."impactEvidenceUrl", "impactAssessedDate" = EXCLUDED."impactAssessedDate"`,
        [
          people[0].id, c.kind, c.title, c.summary, c.role, c.date, c.reference, c.importance, c.sourceUrl,
          JSON.stringify(c.impact.scores), c.impact.confidence, c.impact.contested, c.impact.basis, c.impact.evidenceUrl, c.impact.assessedDate,
        ],
      );
      touched.add(people[0].id);
    }
    saved += 1;
  }
  for (const id of touched) await PersonWiki.rebuild(id);
  console.log(`${saved} contribution(s) ${flags['dry-run'] ? 'checked' : 'saved'}`);
}

main()
  .catch((err) => {
    console.error(err.message ?? err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
