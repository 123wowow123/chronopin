// Who performs at an event pin and how to get in (PinEventInfo, 0082), read
// off its pages by `npm run events:refresh`. One row per pin; a row a person
// set ('hand') is never overwritten by a later refresh.

import * as db from '../db';
import {
  AVAILABILITIES,
  EVENT_INFO_SOURCES,
  type Availability,
  type EventInfoFields,
  type EventInfoSource,
  type Performer,
  type PinEventInfoJson,
} from '@/lib/eventInfo';

const COLUMNS = `"performers", "ticketUrl", "lowPrice", "highPrice", "priceCurrency", "availability", "onSaleDate", "source", "sourceUrl", "checkedAt"`;

type EventInfoRow = Omit<PinEventInfoJson, 'lowPrice' | 'highPrice' | 'onSaleDate' | 'checkedAt'> & {
  lowPrice: string | null;
  highPrice: string | null;
  onSaleDate: Date | null;
  checkedAt: Date;
};

export type StoredPinEventInfo = PinEventInfoJson & { pinId: number };

const toJson = (row: EventInfoRow): PinEventInfoJson => ({
  ...row,
  lowPrice: row.lowPrice == null ? null : Number(row.lowPrice),
  highPrice: row.highPrice == null ? null : Number(row.highPrice),
  onSaleDate: row.onSaleDate ? new Date(row.onSaleDate).toISOString() : null,
  checkedAt: new Date(row.checkedAt).toISOString(),
});

const httpUrl = (value: unknown): string | null =>
  typeof value === 'string' && /^https?:\/\/\S+$/i.test(value.trim()) && value.trim().length <= 4000 ? value.trim() : null;

// Checks and tidies a reading from the API or a script: the fields, or a
// sentence saying what is wrong with them.
export function eventInfoProblem(body: Record<string, unknown>): { fields: EventInfoFields; source: EventInfoSource; sourceUrl: string | null } | string {
  const performers: Performer[] = [];
  for (const p of Array.isArray(body.performers) ? body.performers : body.performers == null ? [] : [null]) {
    const name = typeof p?.name === 'string' ? p.name.trim() : '';
    if (!name || name.length > 200) return 'Each performer needs a name of at most 200 characters.';
    if (p.type !== 'Person' && p.type !== 'PerformingGroup') return `Performer "${name}" needs a type of Person or PerformingGroup.`;
    const url = p.url == null || p.url === '' ? null : httpUrl(p.url);
    if (p.url && !url) return `Performer "${name}" has a url that is not a web address.`;
    performers.push({ name, type: p.type, ...(url ? { url } : {}) });
  }
  // A race's entry list, a marathon's elite field or a festival's lineup runs
  // to dozens.
  if (performers.length > 150) return 'At most 150 performers.';

  const price = (value: unknown) => (value == null || value === '' ? null : Number(value));
  const lowPrice = price(body.lowPrice);
  const highPrice = price(body.highPrice ?? body.lowPrice);
  if ((lowPrice != null && !(lowPrice >= 0)) || (highPrice != null && !(highPrice >= 0))) return 'Prices must be numbers of 0 or more.';
  if (lowPrice != null && highPrice != null && highPrice < lowPrice) return 'highPrice is below lowPrice.';
  const priceCurrency = typeof body.priceCurrency === 'string' && body.priceCurrency.trim() ? body.priceCurrency.trim().toUpperCase() : null;
  if (priceCurrency && !/^[A-Z]{3}$/.test(priceCurrency)) return 'priceCurrency must be a three-letter code (USD).';
  if (lowPrice != null && !priceCurrency) return 'A price needs its priceCurrency.';

  const availability = body.availability == null || body.availability === '' ? null : String(body.availability);
  if (availability && !AVAILABILITIES.includes(availability as Availability)) return `availability must be one of ${AVAILABILITIES.join(', ')}.`;
  const onSale = body.onSaleDate == null || body.onSaleDate === '' ? null : new Date(String(body.onSaleDate));
  if (onSale && Number.isNaN(onSale.getTime())) return 'onSaleDate is not a date.';
  const ticketUrl = body.ticketUrl == null || body.ticketUrl === '' ? null : httpUrl(body.ticketUrl);
  if (body.ticketUrl && !ticketUrl) return 'ticketUrl is not a web address.';

  const source = String(body.source ?? 'hand') as EventInfoSource;
  if (!EVENT_INFO_SOURCES.includes(source)) return `source must be one of ${EVENT_INFO_SOURCES.join(', ')}.`;
  const sourceUrl = body.sourceUrl == null || body.sourceUrl === '' ? null : httpUrl(body.sourceUrl);

  return {
    fields: {
      performers,
      ticketUrl,
      lowPrice,
      highPrice: lowPrice == null ? null : highPrice,
      priceCurrency: lowPrice == null ? null : priceCurrency,
      availability: (availability as Availability | null) ?? null,
      onSaleDate: onSale ? onSale.toISOString() : null,
    },
    source,
    sourceUrl,
  };
}

export async function eventInfoForPin(pinId: number): Promise<PinEventInfoJson | null> {
  const [row] = await db.query<EventInfoRow>(`SELECT ${COLUMNS} FROM "PinEventInfo" WHERE "pinId" = $1`, [pinId]);
  return row ? toJson(row) : null;
}

// Stores a reading. A row set by hand keeps winning over a refresh; a hand
// reading replaces anything. Resolves to whether it was stored.
export async function saveEventInfo(
  pinId: number,
  fields: EventInfoFields,
  { source, sourceUrl, checkedAt }: { source: EventInfoSource; sourceUrl?: string | null; checkedAt?: string | Date },
): Promise<boolean> {
  const rows = await db.query(
    `INSERT INTO "PinEventInfo" ("pinId", "performers", "ticketUrl", "lowPrice", "highPrice", "priceCurrency", "availability", "onSaleDate", "source", "sourceUrl", "checkedAt")
     VALUES ($1, $2::jsonb, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11::timestamptz, now()))
     ON CONFLICT ("pinId") DO UPDATE SET
       "performers" = EXCLUDED."performers", "ticketUrl" = EXCLUDED."ticketUrl", "lowPrice" = EXCLUDED."lowPrice",
       "highPrice" = EXCLUDED."highPrice", "priceCurrency" = EXCLUDED."priceCurrency", "availability" = EXCLUDED."availability",
       "onSaleDate" = EXCLUDED."onSaleDate", "source" = EXCLUDED."source", "sourceUrl" = EXCLUDED."sourceUrl", "checkedAt" = EXCLUDED."checkedAt"
     WHERE "PinEventInfo"."source" <> 'hand' OR EXCLUDED."source" = 'hand'
     RETURNING "pinId"`,
    [
      pinId,
      JSON.stringify(fields.performers),
      fields.ticketUrl,
      fields.lowPrice,
      fields.highPrice,
      fields.priceCurrency,
      fields.availability,
      fields.onSaleDate,
      source,
      sourceUrl ?? null,
      checkedAt ? new Date(checkedAt).toISOString() : null,
    ],
  );
  return rows.length > 0;
}

// A check whose pages stated nothing: the pin is marked read now, so a
// refresh passes it by until it is due again. A row that already says
// something keeps it - a blocked or rewritten page is no reason to forget
// what an earlier read found - and only its check time moves.
export async function markEventChecked(
  pinId: number,
  { source, sourceUrl }: { source: EventInfoSource; sourceUrl?: string | null },
): Promise<void> {
  await db.query(
    `INSERT INTO "PinEventInfo" ("pinId", "source", "sourceUrl") VALUES ($1, $2, $3)
     ON CONFLICT ("pinId") DO UPDATE SET "checkedAt" = now()`,
    [pinId, source, sourceUrl ?? null],
  );
}

export async function deleteEventInfo(pinId: number): Promise<void> {
  await db.query(`DELETE FROM "PinEventInfo" WHERE "pinId" = $1`, [pinId]);
}

// Every row, for the seed backup: a reading costs a browser visit (and often
// a Claude call) to make again.
export async function allEventInfo(): Promise<StoredPinEventInfo[]> {
  const rows = await db.query<EventInfoRow & { pinId: number }>(`SELECT "pinId", ${COLUMNS} FROM "PinEventInfo" ORDER BY "pinId"`);
  return rows.map((row) => ({ pinId: row.pinId, ...toJson(row) }));
}

// Puts backed-up rows back for the pins that exist, with the time each was
// read, so a stale sale state still reads as stale.
export async function restoreEventInfo(rows: StoredPinEventInfo[]): Promise<void> {
  for (const row of rows) {
    const [pin] = await db.query(`SELECT 1 FROM "Pin" WHERE "id" = $1`, [row.pinId]);
    if (pin) {
      await saveEventInfo(row.pinId, row, { source: row.source, sourceUrl: row.sourceUrl, checkedAt: row.checkedAt });
    }
  }
}
