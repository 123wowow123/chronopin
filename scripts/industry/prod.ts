// Sends scripts/industry/forecasts.json (and the BTOS lines) to production's
// admin endpoint, signed as the existing admin with the jobs' production
// credentials (JOBS_PROD_BASE, JOBS_PROD_SESSION_SECRET).
//
//   npm run industry:forecasts:prod

import '../env';
import { readFileSync, existsSync } from 'node:fs';
import { forecastProblem } from '@/lib/industryForecast';
import { industryForecastRequest, prodBase } from '@/server/jobs/pinApi';

if (!prodBase()) throw new Error('Set JOBS_PROD_BASE and JOBS_PROD_SESSION_SECRET');
const rows = JSON.parse(readFileSync('scripts/industry/forecasts.json', 'utf8'));
const btos = existsSync('scripts/industry/btos.json') ? JSON.parse(readFileSync('scripts/industry/btos.json', 'utf8')) : [];

for (const r of rows) {
  const checked = forecastProblem({ ...r, prefix: r.prefix ?? '', suffix: r.suffix ?? '', projection: r.projection ?? null, earlier: r.earlier ?? [], note: r.note ?? null });
  if (typeof checked === 'string') throw new Error(`${r.slug}: ${checked}`);
  await industryForecastRequest({ ...checked, live: r.live ?? [] });
  console.log('saved', r.slug);
}
console.log('btos', await industryForecastRequest({ slug: 'us-ai-adoption', snapshot: btos }));
process.exit(0);
