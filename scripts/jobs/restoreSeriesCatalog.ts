// Re-appends the generated "Part of the ... release-history thread" paragraph and the Nintendo series-catalog block
// (internal series links) from the LOCAL copy of a pin onto its prod summary, when a rewrite dropped them.
//   npx tsx scripts/jobs/restoreSeriesCatalog.ts 20185,20188 [--apply]
import '../env';
import { getPin, updatePin } from '../../src/server/jobs/pinApi';
const ids = process.argv[2].split(',').map(Number);
const apply = process.argv.includes('--apply');
for (const id of ids) {
  const prod: any = await getPin(id);
  const local: any = await (await fetch(`http://127.0.0.1:3000/api/pins/${id}`)).json();
  const ls: string = local.longFormSummary ?? '';
  const i = ls.indexOf('Part of the');
  if (local.title !== prod.title || i < 0 || !ls.includes('Nintendo series catalog')) { console.log(id, 'SKIP no block/mismatch', local.title === prod.title); continue; }
  const tail = ls.slice(i);
  if ((prod.longFormSummary ?? '').includes('Nintendo series catalog')) { console.log(id, 'already has block'); continue; }
  console.log(id, apply ? 'restoring' : 'would restore', tail.length, 'chars');
  if (apply) await updatePin(id, { longFormSummary: `${prod.longFormSummary}\n\n${tail}` });
}
process.exit(0);
