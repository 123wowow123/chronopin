import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import { addPosition, pushPosition } from '@/server/services/traders';
import TraderPosition from '@/server/model/traderPosition';
import { ACTIONS, INSTRUMENTS, type Instrument, type TraderAction } from '@/lib/traders';

// Record disclosed positions: { positions: [{ traderSlug, traderName, ticker,
// instrument, action, tradeDate, summary, sourceUrl, sourceTitle }], push? }.
// Summaries are our own words with a link to the source, never the author's
// text. A new position is pushed to premium readers once (push: false for a
// quiet backfill). Admin only.
export const POST = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  const body = await readJson<{ positions?: Record<string, unknown>[]; push?: boolean }>(request);
  if (!Array.isArray(body.positions) || !body.positions.length) throw new HttpError(400, '', { message: 'positions is required.' });
  const added: number[] = [];
  let skipped = 0;
  for (const raw of body.positions) {
    const text = (k: string) => String(raw[k] ?? '').trim();
    if (!INSTRUMENTS.includes(text('instrument') as Instrument) || !ACTIONS.includes(text('action') as TraderAction)) throw new HttpError(400, '', { message: `Bad instrument or action for ${text('ticker')}.` });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text('tradeDate')) || !text('traderSlug') || !text('ticker') || !text('summary') || !/^https:\/\//.test(text('sourceUrl'))) {
      throw new HttpError(400, '', { message: `Incomplete position for ${text('ticker')}.` });
    }
    const row = await addPosition(
      {
        traderSlug: text('traderSlug'), traderName: text('traderName') || text('traderSlug'), ticker: text('ticker'),
        instrument: text('instrument') as Instrument, action: text('action') as TraderAction, tradeDate: text('tradeDate'),
        summary: text('summary'), sourceUrl: text('sourceUrl'), sourceTitle: text('sourceTitle'),
      },
      { push: body.push !== false },
    );
    if (row) added.push(row.id);
    else skipped++;
  }
  return json({ added, skipped }, added.length ? 201 : 200);
});

// Send the positions that were never pushed (a quiet backfill, or a push that failed).
export const PUT = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  const rows = await TraderPosition.unpushed();
  let sent = 0;
  for (const row of rows) sent += await pushPosition(row);
  return json({ positions: rows.length, deliveries: sent });
});
