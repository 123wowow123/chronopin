import type { NextRequest } from 'next/server';
import { intParam, json, noContent, route } from '@/server/http';
import Pin from '@/server/model/pin';
import { getSeries } from '@/server/eiaSeries';
import { linkFor, seriesForPin } from '@/server/services/pinSeries';
import log from '@/server/util/log';

// The public data series a pin's event moves, with the publisher's current
// numbers (PinSeries, 0062). 204 when the pin has none, which is almost every
// pin - the page only asks when the pin's own JSON says it has one.
//
// The window is the pin's event in context rather than the whole history: a
// reader wants to see the step this event made and what it has done since, not
// forty years of weeks. The full series stays one click away on the
// publisher's page.
const YEARS_BEFORE = 3;
const YEARS_AFTER = 2;
const DAY_MS = 86_400_000;

const dayKey = (at: Date) => at.toISOString().slice(0, 10);

export const GET = route(async (_request: NextRequest, ctx: RouteContext<'/api/pins/[id]/series'>) => {
  const id = intParam((await ctx.params).id);
  const rows = await seriesForPin(id);
  if (!rows.length) {
    return noContent();
  }

  // The pin's own day, so the chart can mark it and the window can centre on
  // it. Read here rather than passed in: the pin may have moved since.
  const { pin } = await Pin.queryById(id);
  if (!pin) {
    return new Response(null, { status: 404 });
  }
  const at = new Date(pin.utcStartDateTime);
  const from = dayKey(new Date(at.getTime() - YEARS_BEFORE * 365 * DAY_MS));
  const to = dayKey(new Date(Math.min(Date.now(), at.getTime() + YEARS_AFTER * 365 * DAY_MS)));

  try {
    const out = [];
    for (const row of rows) {
      const series = await getSeries(row.seriesId);
      if (!series) continue;
      const windowed = series.points.filter((p) => p.day >= from && p.day <= to);
      // An event older or newer than the series has no window; show the
      // nearest end rather than an empty chart.
      const points = windowed.length ? windowed : series.points.slice(-52);
      // The week the pin's event falls in: the last week at or before its day.
      const markedAt = [...series.points].reverse().find((p) => p.day <= dayKey(at))?.day ?? null;
      out.push({
        source: row.source,
        seriesId: series.seriesId,
        label: row.label || series.title,
        units: series.units,
        sourceUrl: linkFor(row),
        releaseDate: series.releaseDate,
        nextReleaseDate: series.nextReleaseDate,
        latest: series.points.at(-1) ?? null,
        marked: points.some((p) => p.day === markedAt) ? markedAt : null,
        markedValue: series.points.find((p) => p.day === markedAt)?.value ?? null,
        points,
      });
    }
    if (!out.length) {
      return noContent();
    }
    // The weekly report lands once a week; an hour on the edge is plenty.
    return json(out, 200, { 'Cache-Control': 'public, max-age=3600' });
  } catch (err) {
    log.error('pinSeries', (err as Error)?.message);
    return new Response(null, { status: 502 });
  }
});
