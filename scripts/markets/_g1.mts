import { wikipediaLeads } from '../../src/server/jobs/outcomePhotos';
import { savePhotosPartial } from '../../src/server/model/pinOutcomePhoto';
import * as db from '../../src/server/db';
import { readFileSync } from 'node:fs';
const S = '/private/tmp/claude-501/-Users-ianflynn-chronopin/31fd055b-9952-4af9-a872-c38d0e16a57a/scratchpad';
const gaps = JSON.parse(readFileSync(S + '/gaps.json', 'utf8'));
const ids = [1950, 1969, 1976, 1951, 21161, 21430, 20722, 5173, 19425, 1974, 1965];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
await sleep(660000);
for (const id of ids) {
  const labels = [...new Set<string>(gaps.filter((g: any) => g.pinId === id).flatMap((g: any) => g.missing.map((m: any) => m.label)))];
  const leads = await wikipediaLeads(labels); await sleep(3000);
  console.log(id, 'leads', leads.size, '/', labels.length, 'missing:', labels.filter((l) => !leads.has(l)).join('; '));
  for (const label of labels) {
    const h = leads.get(label); if (!h) continue;
    const r = await savePhotosPartial(id, [{ label, person: label, imageSource: h.imageSource, authorName: `Wikipedia, ${label} (lead image)`, authorUrl: h.pageUrl }]);
    console.log(id, label, r.saved.length ? 'ok' : 'FAILED ' + JSON.stringify(r.failed));
    await sleep(20000);
  }
}
await db.closeConnection(); process.exit(0);
