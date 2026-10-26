// Upserts the industry forecast rows (IndustryForecast, 0216) from
// scripts/industry/forecasts.json, with the Census BTOS lines from btos.json
// (python3 -I scripts/industry/btos.py National.xlsx) on the AI adoption row.
//
//   npm run industry:forecasts
//
// Live FRED lines are handles only; projections carry their sources in the row.

import '../env';
import { readFileSync, existsSync } from 'node:fs';
import { forecastProblem } from '@/lib/industryForecast';
import { saveIndustryForecast } from '@/server/model/industryForecast';

type Row = {
  slug: string;
  industry: string;
  title: string;
  tags: string[];
  prefix?: string;
  suffix?: string;
  live?: unknown[];
  projection?: unknown;
  earlier?: unknown[];
  sources: { url: string }[];
  note?: string;
};

const rows: Row[] = JSON.parse(readFileSync('scripts/industry/forecasts.json', 'utf8'));
const btos = existsSync('scripts/industry/btos.json') ? JSON.parse(readFileSync('scripts/industry/btos.json', 'utf8')) : [];

for (const r of rows) {
  const checked = forecastProblem({ ...r, prefix: r.prefix ?? '', suffix: r.suffix ?? '', projection: r.projection ?? null, earlier: r.earlier ?? [], note: r.note ?? null });
  if (typeof checked === 'string') throw new Error(`${r.slug}: ${checked}`);
  await saveIndustryForecast({ ...checked, live: (r.live ?? []) as never }, r.slug === 'us-ai-adoption' ? btos : undefined);
  console.log('saved', r.slug);
}
process.exit(0);
