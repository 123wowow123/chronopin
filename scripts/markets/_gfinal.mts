import { wikipediaLeads } from '../../src/server/jobs/outcomePhotos';
import { outcomePhotosForPin, outcomeKey, savePhotosPartial, type PhotoInput } from '../../src/server/model/pinOutcomePhoto';
import * as db from '../../src/server/db';
import { readFileSync } from 'node:fs';
const S = '/private/tmp/claude-501/-Users-ianflynn-chronopin/31fd055b-9952-4af9-a872-c38d0e16a57a/scratchpad';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const person = JSON.parse(readFileSync(S + '/gall_person.json', 'utf8'));
const g3 = JSON.parse(readFileSync(S + '/g3.json', 'utf8'));
// A 20 MB original is refused: ask Wikimedia for a 1280px rendition instead.
const thumb = (u: string) => { const m = u.match(/^(https:\/\/upload\.wikimedia\.org\/wikipedia\/(?:commons|en))\/([0-9a-f]\/[0-9a-f]{2})\/([^/]+)$/i); if (!m || /\.svg$/i.test(m[3])) return u; return `${m[1]}/thumb/${m[2]}/${m[3]}/1280px-${m[3]}`; };
const jobs: { pinId: number; row: PhotoInput }[] = [];
// people
const peoplePins = [1950, 1976, 21430, 1965, 5173];
for (const pinId of peoplePins) {
  const labels = [...new Set<string>(person.filter((g: any) => g.pinId === pinId).flatMap((g: any) => g.missing.map((m: any) => m.label)))];
  const leads = await wikipediaLeads(labels); await sleep(3000);
  console.log(pinId, 'no lead:', labels.filter((l) => !leads.has(l)).join('; '));
  for (const label of labels) { const h = leads.get(label); if (h) jobs.push({ pinId, row: { label, person: label, kind: 'person', imageSource: thumb(h.imageSource), authorName: `Wikipedia, ${label} (lead image)`, authorUrl: h.pageUrl } }); }
}
// logos from Wikipedia svg files (only where the lead image is a logo/symbol file)
const okFile = /logo|symbol|flag/i;
const extraPins: Record<string, number[]> = { ChatGPT: [1989, 1990], Citigroup: [20116] };
for (const [pidS, p] of Object.entries<any>(g3.plan)) {
  const pinId = Number(pidS);
  if (![1977, 1979, 20769, 2357, 21237, 20116, 1989].includes(pinId)) continue;
  for (const [label, title] of Object.entries<string>(p.t)) {
    const o = g3.out[title]; if (!o?.image) continue;
    const file = decodeURIComponent(o.image.split('?')[0].split('/').pop()!);
    if (!okFile.test(file) || /screenshot|building|ACT|Conservatism/i.test(file)) continue;
    const row: PhotoInput = { label, person: label === 'ChatGPT' ? 'ChatGPT (OpenAI)' : label, kind: 'logo', imageSource: o.image.split('?')[0], authorName: `Wikimedia Commons, ${file}`, authorUrl: o.url };
    for (const id of pinId === 1989 ? [1989, 1990] : [pinId]) jobs.push({ pinId: id, row });
  }
}
console.log('jobs', jobs.length);
for (const { pinId, row } of jobs) {
  if ((await outcomePhotosForPin(pinId)).some((p) => outcomeKey(p.label) === outcomeKey(row.label))) continue;
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await savePhotosPartial(pinId, [row]);
    console.log(pinId, row.label, r.saved.length ? 'ok' : 'FAILED ' + JSON.stringify(r.failed).slice(0, 140));
    if (r.saved.length || !/429/.test(JSON.stringify(r.failed))) break;
    await sleep(660000);
  }
  await sleep(45000);
}
await db.closeConnection(); process.exit(0);
