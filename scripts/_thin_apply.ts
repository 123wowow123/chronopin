import './env';
import { readFileSync } from 'node:fs';
import { getPin, updatePin } from '@/server/jobs/pinApi';
const HOLD = new Set([3114, 4406, 5106, 2667, 3542, 2274]);
const apply = process.argv[2] === 'apply';
const textLen = (h: string) => h.replace(/<[^>]+>/g, '').length;
(async () => {
  const drafts: any[] = [];
  for (let i = 1; i <= 6; i++) drafts.push(...JSON.parse(readFileSync('/private/tmp/claude-501/-Users-ianflynn-chronopin/61f7ac12-cc0e-4a53-86b5-02b9bcb67040/scratchpad/draft' + i + '.json', 'utf8')));
  const log: string[] = [];
  for (const d of drafts) {
    if (d.action !== 'enrich' || HOLD.has(d.id)) { log.push(d.id + ' HELD/SKIP'); continue; }
    try {
      const pin = await getPin(d.id);
      const known = new Set<string>([pin.sourceUrl, ...(pin.references ?? []).map((r: any) => r.url), ...d.addReferences.map((r: any) => r.url)]);
      const cites = [...d.longFormSummary.matchAll(/data-ref="([^"]+)"/g)].map((m) => m[1]);
      const bad = cites.filter((c) => !known.has(c));
      const old = pin.longFormSummary ?? '';
      const keepOld = /<h3/i.test(old);
      if (bad.length) { log.push(d.id + ' BAD CITES ' + bad.join(' ')); continue; }
      const summary = keepOld ? old + d.longFormSummary : d.longFormSummary;
      if (!apply) { log.push(d.id + ' ok len=' + textLen(summary) + ' oldH3=' + keepOld + ' oldLen=' + textLen(old) + ' refs+' + d.addReferences.length); continue; }
      const out = await updatePin(d.id, { longFormSummary: summary, addReferences: d.addReferences });
      const back = await getPin(d.id);
      log.push(d.id + ' SAVED len=' + textLen(back.longFormSummary ?? '') + ' refs=' + (back.references ?? []).length + ' title=' + (back.title === pin.title));
      await new Promise((r) => setTimeout(r, 20000));
    } catch (e: any) { log.push(d.id + ' ERR ' + e.message); }
  }
  console.log(log.join('\n'));
  process.exit(0);
})();
