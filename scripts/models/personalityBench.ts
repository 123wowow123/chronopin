// AA-PersonalityBench panels (Artificial Analysis, launch article 2026-10-19) on the release pins of
// the models the article scores in numbers: two bar charts and one table, merged into each pin's
// PinPerf (charts/tables with the AA-PersonalityBench title prefix are replaced, the rest kept).
//
//   npx tsx scripts/models/personalityBench.ts            # local database
//
// Figures are only those printed as numbers in the article (Transparency index, Friendly Elo,
// average words, lists and bold per response). Nothing here is inferred; the other seven indexes
// and 29 traits are charts without numbers in the page text. Translations (15 locales, owner ask 2026-11-06) live in
// personalityBench.i18n.json and are attached here, so a replay never wipes them.
//
//   npx tsx scripts/models/personalityBench.ts --json out.json   # also dump the panels per pin (for the prod PUT)

import './../env';
import { readFileSync, writeFileSync } from 'node:fs';
import { perfProblem, type PerfChart, type PerfTable } from '@/lib/pinPerf';
import { perfForPin, savePerf } from '@/server/model/pinPerf';
import { invalidatePin } from '@/server/services/cache';

const ARTICLE = 'https://artificialanalysis.ai/articles/aa-personalitybench';
const PREFIX = 'AA-PersonalityBench';

// pin id -> the model's row label
const PINS: Record<number, string> = {
  4814: 'Claude Sonnet 5.5',
  2693: 'Claude Fable 5.1',
  4802: 'GPT-6 Astra',
  2694: 'Claude Opus 5.5',
  15308: 'Gemini 4 Argon',
};

// label, Transparency index (1-100 percentile), Friendly Elo + 95% CI, words, lists, bold per response
const MODELS = [
  { label: 'Claude Sonnet 5.5', effort: 'max with fallback', transparency: 100, friendly: 1041, ci: '1010-1070', words: 450, lists: 2.84, bold: 9.95 },
  { label: 'Claude Fable 5.1', effort: 'max with fallback', transparency: 97, friendly: 1047, ci: '1014-1076', words: 576, lists: 1.73, bold: 8.67 },
  { label: 'GPT-6 Astra', effort: 'max', transparency: 94, friendly: 1001, ci: '972-1031', words: 352, lists: 1.46, bold: 8.84 },
  { label: 'Claude Opus 5.5', effort: 'max with fallback', transparency: 88, friendly: 1077, ci: '1049-1107', words: 571, lists: 2.92, bold: 11.8 },
  { label: 'Gemini 4 Argon', effort: 'high', transparency: 18, friendly: 1059, ci: '1030-1087', words: 790, lists: 3.88, bold: 17.2 },
];

type Tr = { tTitle: string; fTitle: string; tabTitle: string; idxUnit: string; tLead: string; fLead: string; tabLead: string; note: string; cols: string[]; effort: Record<string, string> };
const TR: Record<string, Tr> = JSON.parse(readFileSync(new URL('./personalityBench.i18n.json', import.meta.url), 'utf8'));
const L = Object.keys(TR);
const each = <T,>(f: (t: Tr) => T) => Object.fromEntries(L.map((l) => [l, f(TR[l])]));

const note =
  'Artificial Analysis launch article, results as at 19 Oct 2026 (the live leaderboard has grown to 41 models and may differ). ' +
  'No system prompt; 900 private questions; pairwise judging by Gemini 3.8 Flash, Claude Sonnet 5.5 and GLM 5.3 Flash. ' +
  'It measures how strongly a trait shows, not whether it is desirable, and is not a capability benchmark.';

function panels(self: string): { charts: PerfChart[]; tables: PerfTable[] } {
  const bars = (key: 'transparency' | 'friendly') =>
    [...MODELS].sort((a, b) => b[key] - a[key]).map((m) => ({ label: m.label, value: m[key], ...(m.label === self ? { highlight: true } : {}) }));
  return {
    charts: [
      {
        title: `${PREFIX}: Transparency index`,
        unit: 'index (1-100)',
        higherIsBetter: true,
        sourceUrl: ARTICLE,
        bars: bars('transparency'),
        note: 'Truthful, admits uncertainty, disclaims assumptions, flags nuances and non-sycophantic; percentile rank across all models rated. ' + note,
        i18n: each((t) => ({ title: t.tTitle, unit: t.idxUnit, note: t.tLead + t.note })),
      },
      {
        title: `${PREFIX}: Friendly trait`,
        unit: 'Elo',
        sourceUrl: ARTICLE,
        bars: bars('friendly'),
        note: 'Pairwise Elo on the Friendly trait, anchor model GPT-6.1 Sol fixed at 1000. ' + note,
        i18n: each((t) => ({ title: t.fTitle, unit: 'Elo', note: t.fLead + t.note })),
      },
    ],
    tables: [
      {
        title: `${PREFIX}: personality and style`,
        sourceUrl: ARTICLE,
        columns: ['Model', 'Transparency index', 'Friendly Elo (95% CI)', 'Words per reply', 'Lists per reply', 'Bold per reply'],
        rows: MODELS.map((m) => [`${m.label} (${m.effort})`, String(m.transparency), `${m.friendly} (${m.ci})`, String(m.words), String(m.lists), String(m.bold)]),
        note: 'Words, lists and bold are averages per response over the 900 questions: descriptive, not quality scores. ' + note,
        i18n: each((t) => ({
          title: t.tabTitle,
          columns: t.cols,
          rows: MODELS.map((m) => [`${m.label} (${t.effort[m.effort]})`, String(m.transparency), `${m.friendly} (${m.ci})`, String(m.words), String(m.lists), String(m.bold)]),
          note: t.tabLead + t.note,
        })),
      },
    ],
  };
}

const dump: Record<number, { charts: PerfChart[]; tables: PerfTable[] }> = {};
for (const [id, self] of Object.entries(PINS)) {
  const pinId = Number(id);
  const current = await perfForPin(pinId);
  const add = panels(self);
  const merged = perfProblem({
    charts: [...(current?.charts ?? []).filter((c) => !c.title.startsWith(PREFIX)), ...add.charts],
    tables: [...(current?.tables ?? []).filter((t) => !t.title.startsWith(PREFIX)), ...add.tables],
  });
  if (typeof merged === 'string') throw new Error(`${pinId}: ${merged}`);
  dump[pinId] = add;
  await savePerf(pinId, merged.charts, merged.tables);
  invalidatePin(pinId);
  console.log('saved', pinId, self, `${merged.charts.length} charts, ${merged.tables.length} tables`);
}
const out = process.argv.indexOf('--json');
if (out > 0) writeFileSync(process.argv[out + 1], JSON.stringify(dump));
process.exit(0);
