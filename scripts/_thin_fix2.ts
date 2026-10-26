import './env';
import { readFileSync } from 'node:fs';
import { getPin, updatePin } from '@/server/jobs/pinApi';
const fixes: Record<number, Record<string, unknown>> = {
  2310: { description: 'OpenAI removes gpt-image-1-mini, gpt-image-1.5 and chatgpt-image-latest from its API on 1 December 2026; its current deprecation table points callers to the gpt-image-2.5 models (sunburst or flare).' },
  3899: { description: 'Alo Yoga plans a 700 m², two-level store at Westfield Bondi Junction, with no opening date published yet; the end-of-2026 date is an estimate. It would follow the Galeries store, which opened on 11 September 2026.' },
  2265: { title: 'Beijing Subway Line 22 Is Due to Open From Hongmiao to Pinggu' },
  5467: { description: 'Agility expects its business combination with the blank-check company Churchill Capital Corp XI to close in the fourth quarter of 2026; a shareholder vote is set for 2 November, and Pulse 2.0 reported a close expected in November. The combined company is expected to trade on Nasdaq as AGLT.' },
};
const refsOnly = [2267, 2227, 2234, 2269, 2547, 2291];
(async () => {
  const drafts: any[] = [];
  for (let i = 7; i <= 12; i++) drafts.push(...JSON.parse(readFileSync('/private/tmp/claude-501/-Users-ianflynn-chronopin/61f7ac12-cc0e-4a53-86b5-02b9bcb67040/scratchpad/draft' + i + '.json', 'utf8')));
  for (const id of [...Object.keys(fixes).map(Number), ...refsOnly]) {
    try {
      const d = drafts.find((x) => x.id === id);
      const patch: any = { ...(fixes[id] ?? {}) };
      if (refsOnly.includes(id)) patch.addReferences = d.addReferences;
      const before = await getPin(id);
      await updatePin(id, patch);
      const b = await getPin(id);
      console.log(id, 'ok', b.title, '| refs', (before.references ?? []).length, '->', (b.references ?? []).length, '| sum', (b.longFormSummary ?? '').length === (before.longFormSummary ?? '').length);
    } catch (e: any) { console.log(id, 'ERR', e.message); }
    await new Promise((r) => setTimeout(r, 20000));
  }
  process.exit(0);
})();
