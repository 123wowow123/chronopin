// Applies researched education degrees and income rows to people who had none,
// without touching the rest of their record (Person.save replaces whole hand
// lists). Reads agent JSON files, one object per person:
//
//   npm run people:gap -- gapwork/out/edu-*.json   { id, name, educationLevel, educationNote, educationSourceUrl }
//   npm run people:gap -- gapwork/out/inc-*.json   { id, name, earnings: [ { year, kind, label, amount, currency, sourceUrl, note } ] }
//   add --dry-run to count only
//
// The degree needs a level 1..5 and an https source; an earnings row goes
// through readEarning (a year from 1950, a whole amount) and needs an https
// source. A person whose name no longer matches the id is skipped. An existing
// degree or earnings row is never replaced by a gap-fill. Each wiki is rebuilt.

import '../env';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import Person from '@/server/model/person';
import PersonWiki from '@/server/model/personWiki';
import { readEarning } from '@/server/personInput';

const { values: flags, positionals } = parseArgs({ allowPositionals: true, options: { 'dry-run': { type: 'boolean', default: false } } });
const https = (u: unknown) => typeof u === 'string' && /^https:\/\//.test(u) && u.length < 2000;

async function main() {
  const touched = new Set<number>();
  const stats = { education: 0, earnings: 0, skipped: 0 };
  for (const file of positionals) {
    const entries = JSON.parse(readFileSync(file, 'utf8')) as Record<string, any>[];
    for (const e of entries) {
      const [person] = await db.query<{ id: number; name: string; educationLevel: number | null }>(`SELECT "id", "name", "educationLevel" FROM "Person" WHERE "id" = $1`, [e.id]);
      if (!person || person.name !== e.name) {
        console.log(`skip ${e.id} ${e.name}: not found or renamed`);
        stats.skipped += 1;
        continue;
      }
      if (typeof e.educationLevel === 'number' && e.educationLevel >= 1 && e.educationLevel <= 5 && https(e.educationSourceUrl) && person.educationLevel == null) {
        if (!flags['dry-run']) await Person.setEducation(person.id, Math.round(e.educationLevel * 2) / 2, String(e.educationNote ?? '').slice(0, 500) || null, e.educationSourceUrl);
        stats.education += 1;
        touched.add(person.id);
      }
      for (const raw of Array.isArray(e.earnings) ? e.earnings : []) {
        const row = readEarning(raw);
        if (!row || !https(row.sourceUrl)) {
          console.log(`${e.name}: earnings row refused (${JSON.stringify(raw).slice(0, 80)})`);
          continue;
        }
        if (!flags['dry-run']) {
          await db.query(
            `INSERT INTO "PersonEarning" ("personId", "year", "kind", "label", "amount", "amountLow", "amountHigh", "currency", "sourceUrl", "note")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT ("personId", "year", "kind", "label") DO NOTHING`,
            [person.id, row.year, row.kind, row.label, row.amount, row.amountLow, row.amountHigh, row.currency, row.sourceUrl, row.note],
          );
        }
        stats.earnings += 1;
        touched.add(person.id);
      }
    }
  }
  if (!flags['dry-run']) for (const id of touched) await PersonWiki.rebuild(id);
  console.log(JSON.stringify(stats), `${touched.size} wiki(s) ${flags['dry-run'] ? 'would be ' : ''}rebuilt`);
}

main()
  .catch((err) => {
    console.error(err.message ?? err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
