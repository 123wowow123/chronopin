import { json } from '@/server/http';
import specialtyDays from '@/server/data/specialtyDays.json';

const MONTH_DAY = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

// The specialty days ("National Peanut Day") on a calendar date. The date is
// the caller's own, since "today" depends on their time zone.
// GET /api/specialty-days/09-13 -> { monthDay: '09-13', names: [...] }
export async function GET(_request: Request, ctx: RouteContext<'/api/specialty-days/[monthDay]'>) {
  const { monthDay } = await ctx.params;
  if (!MONTH_DAY.test(monthDay)) {
    return new Response('monthDay must be MM-DD', { status: 400 });
  }
  return json(
    { monthDay, names: (specialtyDays as Record<string, string[]>)[monthDay] || [] },
    200,
    { 'Cache-Control': 'public, max-age=3600' },
  );
}
