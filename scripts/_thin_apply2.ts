import './env';
import { readFileSync } from 'node:fs';
import { getPin, updatePin } from '@/server/jobs/pinApi';
const textLen = (h: string) => h.replace(/<[^>]+>/g, '').length;
const only = process.argv.slice(2).map(Number);
(async () => {
  const drafts: any[] = [];
  for (let i = 7; i <= 12; i++) drafts.push(...JSON.parse(readFileSync('/private/tmp/claude-501/-Users-ianflynn-chronopin/61f7ac12-cc0e-4a53-86b5-02b9bcb67040/scratchpad/draft' + i + '.json', 'utf8')));
  const log: string[] = [];
  for (const d of drafts) {
    if (d.action !== 'enrich') { log.push(d.id + ' SKIP'); continue; }
    if (only.length && !only.includes(d.id)) continue;
    try {
      const pin = await getPin(d.id);
      const known = new Set<string>([pin.sourceUrl, ...(pin.references ?? []).map((r: any) => r.url), ...d.addReferences.map((r: any) => r.url)]);
      const bad = [...d.longFormSummary.matchAll(/data-ref="([^"]+)"/g)].map((m) => m[1]).filter((c) => !known.has(c));
      if (bad.length) { log.push(d.id + ' BAD CITES ' + bad.join(' ')); continue; }
      const old = pin.longFormSummary ?? '';
      const keepOld = /<h3/i.test(old);
      const summary = keepOld ? old + d.longFormSummary : d.longFormSummary;
      if (!keepOld && textLen(old) > textLen(d.longFormSummary)) { log.push(d.id + ' HELD old longer ' + textLen(old) + '>' + textLen(d.longFormSummary)); continue; }
      await updatePin(d.id, { longFormSummary: summary, addReferences: d.addReferences });
      const back = await getPin(d.id);
      log.push(d.id + ' SAVED len=' + textLen(back.longFormSummary ?? '') + ' refs=' + (back.references ?? []).length + ' title=' + (back.title === pin.title));
      await new Promise((r) => setTimeout(r, 20000));
    } catch (e: any) { log.push(d.id + ' ERR ' + e.message); }
  }
  console.log(log.join('\n'));
  process.exit(0);
})();
