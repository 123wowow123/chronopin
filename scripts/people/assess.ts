// Records "good for society" assessments (0156) on contributions already on
// a person's page, from a JSON file of assessments - without touching the rest
// of the profile.
//
//   npm run people:assess -- assessments.json [--dry-run]
//
// [{ "wikiUrl": "https://en.wikipedia.org/wiki/...", "name": "...",
//    "contribution": { "reference": "Pub. L. 115-97" } | { "title": "..." },
//    "impact": { "scores": { "efficiency": 1, "externalities": 0, "growth": 1,
//                            "fiscal": -2, "distortion": 0, "distribution": -1 },
//                "confidence": "high|medium|low", "contested": true,
//                "basis": "what the evidence says", "evidenceUrl": "https://...",
//                "assessedDate": "2026-10-10" } }]
//
// Scores are -2..+2 per criterion (src/lib/people.ts IMPACT_CRITERIA) and an
// assessment without scores, a confidence and an https evidence URL is
// refused (readImpact). Then `npm run people:wiki -- --all` happens by itself
// for each person touched.

import '../env';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import PersonWiki from '@/server/model/personWiki';
import { readImpact } from '@/server/personInput';

const { values: flags, positionals } = parseArgs({ allowPositionals: true, options: { 'dry-run': { type: 'boolean', default: false } } });

type Entry = { wikiUrl?: string; name?: string; contribution: { reference?: string; title?: string }; impact: unknown };

async function main() {
  if (!positionals[0]) throw new Error('Pass a JSON file of assessments');
  const entries = JSON.parse(readFileSync(positionals[0], 'utf8')) as Entry[];
  const touched = new Set<number>();
  let saved = 0;
  const problems: string[] = [];
  for (const e of entries) {
    const impact = readImpact(e.impact);
    const label = `${e.name ?? e.wikiUrl} / ${e.contribution?.reference ?? e.contribution?.title}`;
    if (!impact) {
      problems.push(`${label}: assessment refused (needs scores, a confidence and an https evidence URL)`);
      continue;
    }
    const [person] = await db.query<{ id: number }>(
      `SELECT "id" FROM "Person" WHERE ($1::text IS NOT NULL AND "wikiUrl" = $1) OR ($2::text IS NOT NULL AND lower("name") = lower($2)) ORDER BY ("wikiUrl" = $1) DESC NULLS LAST LIMIT 1`,
      [e.wikiUrl ?? null, e.name ?? null],
    );
    if (!person) {
      problems.push(`${label}: no such person`);
      continue;
    }
    const rows = await db.query<{ id: number }>(
      `SELECT "id" FROM "PersonContribution" WHERE "personId" = $1
         AND (($2::text IS NOT NULL AND "reference" = $2) OR ($3::text IS NOT NULL AND lower("title") = lower($3)))`,
      [person.id, e.contribution?.reference ?? null, e.contribution?.title ?? null],
    );
    if (rows.length !== 1) {
      problems.push(`${label}: ${rows.length ? 'matches several contributions' : 'no such contribution'}`);
      continue;
    }
    if (!flags['dry-run']) {
      await db.query(
        `UPDATE "PersonContribution" SET "impactScores" = $1::jsonb, "impactConfidence" = $2, "impactContested" = $3, "impactBasis" = $4,
                "impactEvidenceUrl" = $5, "impactAssessedDate" = $6 WHERE "id" = $7`,
        [JSON.stringify(impact.scores), impact.confidence, impact.contested, impact.basis, impact.evidenceUrl, impact.assessedDate, rows[0].id],
      );
      touched.add(person.id);
    }
    saved += 1;
  }
  for (const id of touched) await PersonWiki.rebuild(id);
  console.log(`${saved} assessment(s) ${flags['dry-run'] ? 'checked' : 'saved'}; ${problems.length} problem(s)`);
  for (const p of problems.slice(0, 40)) console.log(`  ${p}`);
}

main()
  .catch((err) => {
    console.error(err.message ?? err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
