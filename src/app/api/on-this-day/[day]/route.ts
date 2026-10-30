import { absoluteUrl, pinPath } from '@/lib/seo';
import { isMonthDay, monthDayLabel, onThisDayPath } from '@/lib/onThisDay';
import { yearLabel } from '@/lib/format';
import { DEFAULT_LOCALE, INTL_LOCALES } from '@/lib/i18n/config';
import { HttpError, json, route } from '@/server/http';
import { onThisDayPage } from '@/server/services/onThisDay';

// One day's pins as data for a daily social post: the page to link, a
// ready-to-send text, and the pins by year. `day` is "10-30", or "today"
// for the current UTC day. English; the page itself is in every language.
export const GET = route(async (_request: Request, ctx: { params: Promise<{ day: string }> }) => {
  let { day } = await ctx.params;
  if (day === 'today') day = new Date().toISOString().slice(5, 10);
  if (!isMonthDay(day)) throw new HttpError(404, 'Not a day: use MM-DD, like 10-30');
  const page = await onThisDayPage(day, DEFAULT_LOCALE);
  const url = absoluteUrl(onThisDayPath(day));
  const label = monthDayLabel(day, INTL_LOCALES[DEFAULT_LOCALE]);
  const lines = page.years.slice(0, 3).flatMap((g) => g.pins.slice(0, 1).map((p) => `${yearLabel(g.year)}: ${p.title}`));
  const text = lines.length ? `On this day, ${label}:\n${lines.join('\n')}\n${url}` : `On this day, ${label}: ${url}`;
  return json(
    {
      day,
      label,
      url,
      text,
      total: page.total,
      headline: page.headline,
      years: page.years.map((g) => ({ year: g.year, total: g.total, pins: g.pins.map((p) => ({ id: p.id, title: p.title, url: absoluteUrl(pinPath(p)) })) })),
    },
    200,
    { 'Cache-Control': 'public, max-age=3600' },
  );
});
