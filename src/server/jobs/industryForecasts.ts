// The industryForecasts task (docs/okf/scraping/daily-jobs.md#industryforecasts):
// keeps the industry forecast panels (IndustryForecast, 0216) current. The
// Census BTOS lines are refreshed mechanically; projections and their revisions
// are researched by the run and saved with save_industry_forecast.

import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { forecastProblem, type ForecastLine } from '@/lib/industryForecast';
import { forecastStatus, saveForecastSnapshot, saveIndustryForecast } from '../model/industryForecast';
import { industryForecastRequest } from './pinApi';

const run = promisify(execFile);
const BTOS_URL = 'https://www.census.gov/hfp/btos/downloads/National.xlsx';
const BTOS_ROW = 'us-ai-adoption';

export { forecastStatus };
export { refreshRampTokens } from './rampTokens';

// Downloads the Census file and re-reads its two AI questions (scripts/industry/btos.py,
// which needs python3 with openpyxl), then replaces the AI adoption row's survey
// lines here and, when the run writes to production, there.
export async function refreshBtos(): Promise<{ through: string | null; points: number; production: boolean }> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'btos-'));
  const res = await fetch(BTOS_URL, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ChronoPin job)' }, signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`Census BTOS download answered ${res.status}`);
  const xlsx = path.join(dir, 'National.xlsx');
  const out = path.join(dir, 'btos.json');
  await writeFile(xlsx, Buffer.from(await res.arrayBuffer()));
  await run('python3', ['-I', path.resolve('scripts/industry/btos.py'), xlsx, out], { timeout: 60_000 });
  const lines = JSON.parse(await readFile(out, 'utf8')) as ForecastLine[];
  if (lines.length !== 2 || lines.some((l) => l.points.length < 2)) throw new Error('The BTOS file no longer has both AI questions; check scripts/industry/btos.py');
  if (!(await saveForecastSnapshot(BTOS_ROW, lines))) throw new Error(`No ${BTOS_ROW} row to hold the BTOS lines; run npm run industry:forecasts`);
  const production = await industryForecastRequest({ slug: BTOS_ROW, snapshot: lines }).then(() => true, () => false);
  return { through: lines[0].points.at(-1)?.x ?? null, points: lines[0].points.length, production };
}

// Checks and saves one researched row, here and on production when the run writes there.
export async function saveResearched(input: unknown): Promise<{ slug: string; production: boolean }> {
  const checked = forecastProblem(input);
  if (typeof checked === 'string') throw new Error(checked);
  await saveIndustryForecast(checked);
  const production = await industryForecastRequest(checked).then(() => true, () => false);
  return { slug: checked.slug, production };
}
