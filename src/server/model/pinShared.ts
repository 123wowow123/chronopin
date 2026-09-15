import _ from 'lodash';
import * as db from '../db';
import type { Row } from '../db';
import Company from './company';

// An all-day pin covers whole UTC calendar days: utcStartDateTime is 00:00Z of
// its first day and utcEndDateTime, when set, is 00:00Z of the day after its
// last day (exclusive), so a one-day pin ends at the next midnight or has no
// end. The "CK_Pin_allDayUtcMidnight" constraint enforces the midnight part.
//
// Values are floored to their UTC day. That also lands the old encodings on
// the intended dates: browser-local midnight in the Americas (07:00Z/08:00Z),
// noon UTC, and a local 23:59:59.999 inclusive end (which floors to the next
// UTC midnight).
//
// Timed pins are real instants and are left alone. Mutates and returns pin.
export function normalizeAllDayDates<T extends Row>(pin: T): T {
  if (!pin || !pin.allDay) {
    return pin;
  }
  const start = floorToUtcDay(pin.utcStartDateTime);
  let end = floorToUtcDay(pin.utcEndDateTime);
  if (start && end && end <= start) {
    end = null;
  }
  if (start) {
    (pin as Row).utcStartDateTime = start;
  }
  (pin as Row).utcEndDateTime = end;
  return pin;
}

function floorToUtcDay(value: unknown) {
  if (value == null || value === '') {
    return null;
  }
  const date = new Date(value as string);
  if (isNaN(date.getTime())) {
    return value;
  }
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

// The view returns one row per pin x medium x merchant, with the joined
// columns prefixed ("Media.id", "Merchant.url"). Collects the distinct
// sub-objects under prefix, keyed by groupKey; undefined when there are none.
export function mapSubObjectFromQuery(prefix: string, groupKey: string, pinRows: Row[]): Row[] | undefined {
  const aggregate: Row[] = [];
  const groupByKey = `${prefix}.${groupKey}`;
  const startsWithKey = `${prefix}.`;

  const groupedSubRows = _.groupBy(
    pinRows.filter((t) => t[groupByKey]),
    (row) => row[groupByKey],
  );

  Object.values(groupedSubRows).forEach((subRows) => {
    const subObj = Object.entries(subRows[0])
      .filter(([key]) => key.startsWith(startsWithKey))
      .reduce<Row>((a, [key, value]) => {
        a[key.substring(startsWithKey.length)] = value;
        return a;
      }, {});

    if (Object.keys(subObj).length) {
      aggregate.push(subObj);
    }
  });

  return aggregate.length ? aggregate : undefined;
}

function nullIfUndefined(value: unknown) {
  return value === undefined ? null : value;
}

// Inserts a pin and sets pin.id. A pin that already carries an id (seeding)
// keeps it; otherwise the database assigns one. pin.company is a name; it is
// stored as a reference to its Company row.
export async function createPin<T extends Row>(pin: T, userId: number | null) {
  normalizeAllDayDates(pin);
  await Company.applyToPin(pin);

  const hasId = pin.id != null;
  const columns = [
    'parentId', 'title', 'description', 'sourceUrl', 'longFormSummary',
    'dateConfidence', 'dateConfidenceReasoning', 'companyId',
    'category', 'address', 'priceLowerBound', 'priceUpperBound', 'price',
    'priceCurrency', 'tip', 'utcStartDateTime', 'utcEndDateTime', 'allDay',
    'sourceStartDateTime', 'sourceEndDateTime', 'userId', 'utcCreatedDateTime', 'utcUpdatedDateTime', 'utcDeletedDateTime',
  ];
  const values = [
    pin.parentId, pin.title, pin.description, pin.sourceUrl, pin.longFormSummary,
    pin.dateConfidence, pin.dateConfidenceReasoning, pin.companyId,
    pin.category, pin.address, pin.priceLowerBound, pin.priceUpperBound, pin.price,
    pin.priceCurrency, pin.tip, pin.utcStartDateTime, pin.utcEndDateTime,
    pin.allDay == null ? false : pin.allDay,
    pin.sourceStartDateTime || null, pin.sourceEndDateTime || null, userId, pin.utcCreatedDateTime || new Date(), pin.utcUpdatedDateTime, pin.utcDeletedDateTime,
  ].map(nullIfUndefined);

  if (hasId) {
    columns.unshift('id');
    values.unshift(pin.id);
  }

  const placeholders = values.map((_value, i) => `$${i + 1}`);
  values.push(nullIfUndefined(pin.latitude), nullIfUndefined(pin.longitude));
  const lat = `$${values.length - 1}`;
  const lng = `$${values.length}`;

  const rows = await db.query(
    `
    INSERT INTO "Pin" (${columns.map((c) => `"${c}"`).join(', ')}, "location")
    VALUES (${placeholders.join(', ')}, ${locationSql(lat, lng)})
    RETURNING "id"`,
    values,
  );
  (pin as Row).id = rows[0].id;
  if (hasId) {
    await advanceIdSequence('Pin');
  }
  return { pin };
}

// An insert with an explicit id does not move the identity sequence, so the
// next ordinary insert would reuse that id. Moves the sequence past the
// highest id in the table.
export function advanceIdSequence(table: string) {
  return db.query(
    `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), GREATEST((SELECT MAX("id") FROM "${table}"), 1))`,
  );
}

// A geography point from latitude/longitude parameters, or NULL when either
// is missing - a pin with no coordinates simply has no map.
export function locationSql(latParam: string, lngParam: string) {
  return `CASE WHEN ${latParam}::double precision IS NULL OR ${lngParam}::double precision IS NULL THEN NULL
        ELSE ST_SetSRID(ST_MakePoint(${lngParam}::double precision, ${latParam}::double precision), 4326)::geography END`;
}
