import type { NextRequest } from 'next/server';
import { forecastProblem, type ForecastLine } from '@/lib/industryForecast';
import { requireRole } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import { saveForecastSnapshot, saveIndustryForecast } from '@/server/model/industryForecast';

// Saves one industry forecast row (IndustryForecast, 0216) so the jobs' local
// edit can reach production. Admin only. Body: a row (see forecastProblem),
// or { slug, snapshot } to replace a row's stored survey lines (the BTOS refresh).
export const PUT = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  const body = await readJson<Record<string, unknown>>(request);
  if (Array.isArray(body.snapshot) && typeof body.slug === 'string' && Object.keys(body).length === 2) {
    const ok = body.snapshot.every((l: ForecastLine) => typeof l?.label === 'string' && Array.isArray(l.points) && l.points.every((p) => typeof p.x === 'string' && Number.isFinite(p.value)));
    if (!ok) throw new HttpError(400, '', { message: 'snapshot: [{ label, points: [{ x, value }] }]' });
    return json({ saved: await saveForecastSnapshot(body.slug, body.snapshot) });
  }
  const checked = forecastProblem(body);
  if (typeof checked === 'string') throw new HttpError(400, '', { message: checked });
  await saveIndustryForecast(checked);
  return json({ saved: true });
});
