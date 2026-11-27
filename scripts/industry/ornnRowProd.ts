// Creates (or updates the text of) just the Ornn GPU rental price row on production's admin endpoint.
// industry:forecasts:prod sends every row in forecasts.json and would overwrite revisions the
// production job has made to other rows; this sends one. The daily lines come from industry:ornn.
//
//   npx tsx scripts/industry/ornnRowProd.ts

import '../env';
import { readFileSync } from 'node:fs';
import { forecastProblem } from '@/lib/industryForecast';
import { industryForecastRequest, prodBase } from '@/server/jobs/pinApi';

if (!prodBase()) throw new Error('Set JOBS_PROD_BASE and JOBS_PROD_SESSION_SECRET');
const r = JSON.parse(readFileSync('scripts/industry/forecasts.json', 'utf8')).find((row: { slug: string }) => row.slug === 'ornn-gpu-rental-price');
if (!r) throw new Error('No ornn-gpu-rental-price row in forecasts.json');
const checked = forecastProblem({ ...r, prefix: r.prefix ?? '', suffix: r.suffix ?? '', projection: r.projection ?? null, earlier: r.earlier ?? [], note: r.note ?? null });
if (typeof checked === 'string') throw new Error(checked);
console.log('saved', r.slug, await industryForecastRequest({ ...checked, live: r.live ?? [] }));
process.exit(0);
