import './env';
import { readFileSync } from 'node:fs';
import { getPin, updatePin } from '@/server/jobs/pinApi';
const textLen = (h: string) => h.replace(/<[^>]+>/g, '').length;
(async () => {
  const drafts: any[] = [];
  for (let i = 13; i <= 18; i++) { try { drafts.push(...JSON.parse(readFileSync('/private/tmp/claude-501/-Users-ianflynn-chronopin/61f7ac12-cc0e-4a53-86b5-02b9bcb67040/scratchpad/draft' + i + '.json', 'utf8'))); } catch (e: any) { console.log('PARSE', i, e.message); } }
  const log: string[] = [];
  for (const d of drafts) {
    try {
      const pin = await getPin(d.id);
      const refs = (d.addReferences ?? []).filter((r: any) => r.url && r.url !== pin.sourceUrl);
      const known = new Set<string>([pin.sourceUrl, ...(pin.references ?? []).map((r: any) => r.url), ...refs.map((r: any) => r.url)]);
      const old = pin.longFormSummary ?? '';
      const keepOld = /<h3/i.test(old);
      let patch: any = { addReferences: refs };
      let kind = 'REFS';
      if (d.action === 'enrich' && d.longFormSummary) {
        const bad = [...d.longFormSummary.matchAll(/data-ref="([^"]+)"/g)].map((m) => m[1]).filter((c) => !known.has(c));
        const n = textLen(d.longFormSummary);
        if (bad.length) log.push(d.id + ' BAD CITES -> refs only');
        else if (!keepOld && textLen(old) > n) log.push(d.id + ' old longer ' + textLen(old) + '>' + n + ' -> refs only');
        else if (n < 900) log.push(d.id + ' short ' + n + ' -> refs only');
        else { patch.longFormSummary = keepOld ? old + d.longFormSummary : d.longFormSummary; kind = 'SUMMARY'; }
      }
      if (kind === 'REFS' && !refs.length) { log.push(d.id + ' nothing to save'); continue; }
      await updatePin(d.id, patch);
      const b = await getPin(d.id);
      log.push(d.id + ' SAVED ' + kind + ' len=' + textLen(b.longFormSummary ?? '') + ' refs=' + (pin.references ?? []).length + '->' + (b.references ?? []).length + ' title=' + (b.title === pin.title));
      await new Promise((r) => setTimeout(r, 20000));
    } catch (e: any) { log.push(d.id + ' ERR ' + e.message); }
  }
  console.log(log.join('\n'));
  process.exit(0);
})();
