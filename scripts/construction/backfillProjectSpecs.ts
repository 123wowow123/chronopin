// Fill PinProject from counts a build pin's own title states ("600-Unit Housing", "20,000-Seat Arena", "300-Room Hotel").
// Dry run by default; --apply writes with source 'title' (never replaces a hand row). Local DB, or the API you point at.
//   npx tsx scripts/construction/backfillProjectSpecs.ts [--apply]
import * as db from '../../src/server/db';
import { projectFromTitle } from '../../src/lib/projectSpecs';
import { saveProject } from '../../src/server/model/pinProject';

const BUILD_TAGS = ['Proposed', 'In Progress', 'Completed', 'Housing', 'Apartments', 'Property', 'Real Estate', 'Hotels', 'Hotel', 'Stadium', 'Arena', 'Architecture', 'Construction', 'Redevelopment'];
const apply = process.argv.includes('--apply');

async function main() {
  const rows = await db.query<{ id: number; title: string }>(
    `SELECT p.id, p.title FROM "Pin" p
     WHERE p."utcDeletedDateTime" IS NULL AND p.title ~ '[0-9]'
       AND EXISTS (SELECT 1 FROM "PinTag" t WHERE t."pinId" = p.id AND t.name = ANY($1))`,
    [BUILD_TAGS],
  );
  let n = 0;
  for (const r of rows) {
    const f = projectFromTitle(r.title);
    if (f.seats != null && f.seats < 500) delete f.seats; // "5-Seat SUV" is not a venue
    if (f.beds != null && f.beds < 10) delete f.beds;
    if (f.stories != null && f.stories < 2) delete f.stories;
    if (!Object.keys(f).length) continue;
    n++;
    console.log(r.id, JSON.stringify(f), '|', r.title);
    if (apply) await saveProject(r.id, { ...f, basis: 'reported', note: 'Read from the pin title.' }, 'title');
  }
  console.log(`${n} pins ${apply ? 'written' : 'would be written (dry run)'}`);
  process.exit(0);
}
main();
