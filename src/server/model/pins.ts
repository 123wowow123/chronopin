import _ from 'lodash';
import * as db from '../db';
import type { Row } from '../db';
import BasePins from './basePins';
import Pin from './pin';
import PinTag from './pinTag';
import { THIN_PIN_SQL, TRANSLATABLE_PIN_SQL } from './searchIssues';
import { dayKeyIn, dayKeyToMs, dayStartIn, nextDayKey } from '@/lib/format';
import { holidayRanges, loadAstronomy } from '../holidays';
import { TASTE_KEYS, TASTE_STRONG, type TasteAxis } from '@/lib/pinTaste';
import { CAR_PERF_KEYS, CAR_PERF_STRONG, type CarPerfAxis } from '@/lib/pinCarPerf';
import { DINING_KEYS, DINING_STRONG, type DiningAxis } from '@/lib/pinDining';
import { HOTEL_KEYS, HOTEL_STRONG, type HotelAxis } from '@/lib/pinHotel';
import { NEW_TAG, PREDICTED_TAG, reservedName, UPDATED_TAG, UPDATED_WITHIN_MS, tagGroupPatterns, type TagCount } from '@/lib/tags';
import { CONFIDENCE_BANDS, CONFIDENCE_BARS, type ConfidenceBand } from '@/lib/referenceConfidence';
import { PLACE_TEXT_SCORE, SEMANTIC_ALONE_SCORE, TITLE_TEXT_SCORE, isCjkText, looksLikePlaceText, placePatterns, typedTextPatterns, typedWordPatterns, wholeWordPattern } from '../util/placeMatch';
import type { NearFilter } from '../util/nearFilter';
import { isRubricYear } from '@/lib/rubricYear';
import { rubricYearClause } from '../util/rubricSearch';
import { expandTagGroups } from '../util/tagNames';
import { restaurantTimelineClause } from '../util/restaurantTimeline';
import type { CarPerfTerm, DayBound, DiningTerm, DelayBound, HotelTerm, PersonAxisBound, RatingBound, TasteTerm } from '../util/searchQuery';

// A pin "p"'s categories (its category tags, 0043), the main one first, and
// the main one alone.
const CATEGORIES = `ARRAY(SELECT "c"."name"::text FROM "PinTag" AS "c" WHERE "c"."pinId" = "p"."id" AND "c"."kind" = 'category' ORDER BY "c"."id")`;
const MAIN_CATEGORY = `(SELECT "c"."name"::text FROM "PinTag" AS "c" WHERE "c"."pinId" = "p"."id" AND "c"."kind" = 'category' ORDER BY "c"."id" LIMIT 1)`;

// A tag on more pins than this says what kind of pin it is, not what it is like.
const RELATED_MAX_TAG_PINS = 1500;

// A pin on the Curated pages: a product with a ProductBlurb, or a Top
// Restaurants one. tag:Curated searches it (the card's CURATED pill).
const CURATED = `(EXISTS (SELECT 1 FROM "ProductBlurb" AS "b" WHERE "b"."pinId" = "Pin"."id") OR EXISTS (SELECT 1 FROM "PinTag" AS "t" WHERE "t"."pinId" = "Pin"."id" AND "t"."name" = 'Top Restaurants'))`;

export type PinSearchFilters = {
  userNames: string[];
  ids: number[];
  companies: string[];
  tickers: string[];
  confidences: string[];
  confidenceBands: ConfidenceBand[];
  dates: string[];
  postedDays: string[];
  updatedDays: string[];
  dateBounds: DayBound[];
  postedBounds: DayBound[];
  updatedBounds: DayBound[];
  tags: string[];
  excludeTags: string[];
  places: string[];
  platforms: string[];
  rated: string[];
  tastes: TasteTerm[];
  carPerfs: CarPerfTerm[];
  dinings: DiningTerm[];
  hotels: HotelTerm[];
  rubricYears: number[];
  people: string[];
  personAxes: PersonAxisBound[];
  ratings: RatingBound[];
  delays: DelayBound[];
  holidays: string[];
};

// Everything a search narrows pins to. hits are a free-text search's matches
// with their scores (null when the search has no free text).
export type SearchFilter = PinSearchFilters & {
  // An OR query's groups: a pin matches when it meets all of any one group's
  // label fields (the fields above are then only their merge, and unused).
  alternatives?: PinSearchFilters[];
  hits: { id: number; score: number }[] | null;
  // The free text those hits came from, which also matches pins standing in
  // the place it names and those whose translated title says it
  // (searchClauses).
  text?: string;
  favoriteUserId?: number | null;
  excludePredicted?: boolean;
  createdSince?: Date | null;
  startFrom?: Date | null;
  startTo?: Date | null;
  // Only pins with a place on the map.
  hasLocation?: boolean;
  // The zone date: and posted: days are read in (UTC when absent).
  timeZone?: string;
};

// A pin's place in search results. start is the exact ISO text of its start.
export type SearchRank = { id: number; score: number; start: string };

// Which way a page of search results walks, from after a pin (exclusive) or
// from the beginning. By relevance: best score first, ties oldest start first.
// By date: later pins (next) or earlier ones (previous).
export type SearchOrder =
  | { sort: 'relevance'; after?: SearchRank | null }
  | { sort: 'date'; direction: 'next' | 'previous'; after?: { start: string; id: number } | null };

type PageResult = { pins: Row[]; queryCount: number };

export default class Pins extends BasePins<Pin> {
  // Set by the timeline endpoint (the DateTime markers inside the page's
  // range) and by search (the one user a query names).
  declare dateTimes?: unknown[];
  declare link?: string;

  setPins(pins: Row[]): this {
    if (!Array.isArray(pins)) {
      throw new Error('arg is not an array');
    }
    this.pins = Pins.mapPinJoins(pins);
    return this;
  }

  setPinsSortBy(pins: Row[], sortId: string, reverse: boolean): this {
    if (!Array.isArray(pins)) {
      throw new Error('arg is not an array');
    }
    this.pins = Pins.mapPinJoins(pins, sortId, reverse);
    return this;
  }

  // Groups the view's pin x medium x merchant rows back into pins, ordered by
  // start time then id (or by sortId).
  static mapPinJoins(pinRows: Row[], sortId?: string, reverse?: boolean): Pin[] {
    let pins: Pin[] = [];
    const groupedPinRows = _.groupBy(pinRows, (row) => row.id);

    _.forEach(groupedPinRows, (rows) => {
      pins.push(Pin.mapPinJoins(new Pin(rows[0]), rows));
    });

    pins = sortId ? _.sortBy(pins, sortId) : _.sortBy(_.sortBy(pins, 'id'), 'utcStartDateTime');
    return reverse ? pins.reverse() : pins;
  }

  // minConfidence: the score a pin needs to show, or null to show every pin.
  static queryForwardByDate(fromDateTime: Date | string, userId: number, lastPinId: number, pageSize: number, createdSince: Date | null | undefined, minConfidence: number | null, near?: NearFilter | null, timeZone = 'UTC') {
    return queryPage(true, false, fromDateTime, userId, lastPinId, pageSize, createdSince, minConfidence, near, timeZone).then((res) => withThreadConfidence(new Pins(res)));
  }

  static queryBackwardByDate(fromDateTime: Date | string, userId: number, lastPinId: number, pageSize: number, createdSince: Date | null | undefined, minConfidence: number | null, near?: NearFilter | null, timeZone = 'UTC') {
    return queryPage(false, false, fromDateTime, userId, lastPinId, pageSize, createdSince, minConfidence, near, timeZone).then((res) => withThreadConfidence(new Pins(res)));
  }

  // aroundPinId splits the page at that pin (starting at fromDateTime) rather
  // than at the instant, so it is on the page however many pins share its start.
  static queryInitialByDate(fromDateTime: Date, userId: number, pageSizePrev: number, pageSizeNext: number, createdSince: Date | null | undefined, minConfidence: number | null, aroundPinId = 0, near?: NearFilter | null, timeZone = 'UTC') {
    return queryInitialPage(false, fromDateTime, userId, pageSizePrev, pageSizeNext, createdSince, minConfidence, aroundPinId, near, timeZone).then((res) => withThreadConfidence(new Pins(res)));
  }

  // Every pin starting in [start, end), oldest first, at most limit of them:
  // a crowded day's "View all" popup. Filtered as the timeline is.
  static queryBetween(start: Date, end: Date, userId: number, limit: number, createdSince: Date | null | undefined, minConfidence: number | null, near?: NearFilter | null) {
    return queryBetween(start, end, userId, limit, createdSince, minConfidence, near).then((res) => withThreadConfidence(new Pins(res)));
  }

  // Just the start of every pin in [start, end), filtered as the timeline
  // is: enough to tell which day each falls on, to count a day's pins.
  static listStartsBetween(start: Date, end: Date, createdSince: Date | null | undefined, minConfidence: number | null, near?: NearFilter | null, timeZone = 'UTC') {
    return db.query<{ utcStartDateTime: Date; allDay: boolean }>(
      `
      SELECT "p"."utcStartDateTime", "p"."allDay"
      FROM "Pin" AS "p"
      WHERE "p"."utcStartDateTime" >= $1::timestamptz AND "p"."utcStartDateTime" < $2::timestamptz
        AND "p"."utcDeletedDateTime" IS NULL
        AND ($3::timestamptz IS NULL OR "p"."utcCreatedDateTime" >= $3)
        AND ($4::integer IS NULL OR COALESCE(${pinConfidenceOf('p')}, $4) >= $4)
        AND ${withinRing('p', 5, 6)}
        AND ${restaurantTimelineClause('p', '$7', `($3::timestamptz IS NULL OR "timelineOther"."utcCreatedDateTime" >= $3) AND ($4::integer IS NULL OR COALESCE(${pinConfidenceOf('timelineOther')}, $4) >= $4) AND ${withinRing('timelineOther', 5, 6)}`)}`,
      [start, end, createdSince || null, minConfidence, near?.point ?? null, near?.meters ?? null, timeZone],
    );
  }

  static queryForwardByDateFilterByHasFavorite(fromDateTime: Date | string, userId: number, lastPinId: number, pageSize: number, createdSince?: Date | null, near?: NearFilter | null) {
    return queryPage(true, true, fromDateTime, userId, lastPinId, pageSize, createdSince, null, near).then((res) => new Pins(res));
  }

  static queryBackwardByDateFilterByHasFavorite(fromDateTime: Date | string, userId: number, lastPinId: number, pageSize: number, createdSince?: Date | null, near?: NearFilter | null) {
    return queryPage(false, true, fromDateTime, userId, lastPinId, pageSize, createdSince, null, near).then((res) => new Pins(res));
  }

  static queryInitialByDateFilterByHasFavorite(fromDateTime: Date, userId: number, pageSizePrev: number, pageSizeNext: number, createdSince?: Date | null, near?: NearFilter | null) {
    return queryInitialPage(true, fromDateTime, userId, pageSizePrev, pageSizeNext, createdSince, null, 0, near).then((res) => new Pins(res));
  }

  static queryPinByIds(pins: BasePins) {
    return queryPinByIds(pins.getAllIds()).then((res) => new Pins(res));
  }

  // The pins most like this one, best first, from what they share with it: tags
  // (a rare tag counts for more than a common one, and a tag on over
  // RELATED_MAX_TAG_PINS pins is a category, not a likeness) and its company.
  // Ties go to the nearer date. Indexed reads on the tag cache, a few ms;
  // semantic search is not used, since its service can stall a page for minutes.
  static async relatedIds(pinId: number, limit: number): Promise<number[]> {
    const rows = await db.query<{ id: number }>(
      `
      WITH "me" AS (
        SELECT "companyId", "utcStartDateTime" FROM "Pin" WHERE "id" = $1
      ),
      "shared" AS (
        SELECT "t"."name", count(*) AS "n"
        FROM "PinTagCache" AS "t"
        WHERE "t"."name" IN (SELECT "name" FROM "PinTagCache" WHERE "pinId" = $1)
        GROUP BY "t"."name"
        HAVING count(*) <= $3
      ),
      "scored" AS (
        SELECT "t"."pinId" AS "id", sum(1.0 / ln(1 + "s"."n")) AS "score"
        FROM "PinTagCache" AS "t" JOIN "shared" AS "s" ON "s"."name" = "t"."name"
        WHERE "t"."pinId" <> $1
        GROUP BY "t"."pinId"
        UNION ALL
        SELECT "p"."id", 2.0 FROM "Pin" AS "p", "me"
        WHERE "me"."companyId" IS NOT NULL AND "p"."companyId" = "me"."companyId" AND "p"."id" <> $1
      )
      SELECT "p"."id"
      FROM (SELECT "id", sum("score") AS "score" FROM "scored" GROUP BY "id") AS "r"
        JOIN "Pin" AS "p" ON "p"."id" = "r"."id", "me"
      WHERE "p"."utcDeletedDateTime" IS NULL
      ORDER BY "r"."score" DESC, abs(extract(epoch FROM "p"."utcStartDateTime" - "me"."utcStartDateTime")), "p"."id"
      LIMIT $2`,
      [pinId, limit, RELATED_MAX_TAG_PINS],
    );
    return rows.map((r) => r.id);
  }

  static queryByIds(ids: number[]) {
    return queryPinByIds(ids).then((res) => new Pins(res));
  }

  // The ids of every pin in the thread around pinId, pinId itself included.
  static async threadIds(pinId: number): Promise<number[]> {
    return (await queryThreadOrder(pinId)).map((o) => o.id);
  }

  // The thread around a pin: its whole tree, top pin first, each pin's
  // responses under it (see queryThreadOrder). Two steps, as a page and a
  // search take: the thread is walked on "Pin", then those pins are read out
  // of the view by id. Joining the view to the walk instead left Postgres
  // building all of it - every pin's references, ratings, views and duplicate
  // group - before keeping the handful the thread names: 44ms to answer with
  // a single pin.
  static async getThreadPins(pinId: number) {
    const order = await queryThreadOrder(pinId);
    if (!order.length) {
      return new Pins({ pins: [], queryCount: 0 });
    }
    const rows = await db.query(
      `
      SELECT "Pin".*
      FROM "PinBaseCache" AS "Pin"
      WHERE "Pin"."id" = ANY($1::integer[])
        AND "Pin"."utcDeletedDateTime" IS NULL
      ORDER BY "Pin"."id", "Pin"."Media.id", "Pin"."Merchant.id"`,
      [order.map((o) => o.id)],
    );
    const place = new Map(order.map((o) => [o.id, o]));
    rows.forEach((row) => {
      row.reverseOrder = place.get(row.id)?.reverseOrder;
      row.threadLevel = place.get(row.id)?.level;
    });
    return new Pins().setPinsSortBy(rows, 'reverseOrder', true);
  }

  // The search results after `order`'s cursor, best first (or in date order
  // the way it walks), at most limit pins - every one when limit is null.
  // Only ids and sort keys: querySearchRanked loads the pins themselves.
  static async rankSearch(filter: SearchFilter, order: SearchOrder, limit: number | null): Promise<SearchRank[]> {
    if (filter.holidays.length) await loadAstronomy();
    const { ctes, from, where, params, score } = searchClauses(filter);
    const add = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };
    const start = `"Pin"."utcStartDateTime"`;
    let orderBy: string;
    if (order.sort === 'relevance') {
      if (order.after) {
        const [s, t, i] = [add(order.after.score), add(order.after.start), add(order.after.id)];
        where.push(`(${score} < ${s}::float8 OR (${score} = ${s}::float8 AND (${start}, "Pin"."id") > (${t}::timestamptz, ${i}::integer)))`);
      }
      orderBy = `${score} DESC, ${start}, "Pin"."id"`;
    } else {
      const forward = order.direction === 'next';
      if (order.after) {
        where.push(`(${start}, "Pin"."id") ${forward ? '>' : '<'} (${add(order.after.start)}::timestamptz, ${add(order.after.id)}::integer)`);
      }
      orderBy = forward ? `${start}, "Pin"."id"` : `${start} DESC, "Pin"."id" DESC`;
    }
    // The start as Postgres writes it, to the microsecond: a cursor rounded to
    // JavaScript's milliseconds would hand the same pin back page after page.
    return db.query<SearchRank>(
      `
      ${withCtes(...ctes)}
      SELECT "Pin"."id", ${score} AS "score", to_json(${start}) #>> '{}' AS "start"
      ${from}
      WHERE ${where.join('\n        AND ')}
      ORDER BY ${orderBy}
      ${limit == null ? '' : `LIMIT ${add(limit)}`}`,
      params,
    );
  }

  // The pins rankSearch picked, each with its search score, in rank order.
  static async querySearchRanked(ranked: SearchRank[], userId: number): Promise<Pins> {
    if (!ranked.length) {
      return new Pins({ pins: [], queryCount: 0 });
    }
    const rows = await db.query(
      `
      SELECT ${PAGE_COLUMNS}
      FROM "PinBaseCache" AS "Pin"
      WHERE "Pin"."id" = ANY($2::integer[])
      ORDER BY "Pin"."id", "Pin"."Media.id", "Pin"."Merchant.id"`,
      [userId, ranked.map((r) => r.id)],
    );
    const pins = new Pins({ pins: rows, queryCount: ranked.length });
    const rank = new Map(ranked.map((r, index) => [r.id, { index, score: r.score }]));
    pins.pins.sort((a, b) => rank.get(a.id)!.index - rank.get(b.id)!.index);
    pins.pins.forEach((pin) => {
      pin.searchScore = rank.get(pin.id)!.score;
    });
    return pins;
  }

  // Search results' tags with how many results carry each, busiest first.
  static async countSearchTags(filter: SearchFilter, limit: number) {
    if (filter.holidays.length) await loadAstronomy();
    const { ctes, from, where, params } = searchClauses(filter);
    return countTags(from, where, params, limit, ctes, filter.timeZone || 'UTC');
  }

  // Tags across the whole timeline: the pins its pages walk (live, confident
  // enough, created since the cutoff).
  static countTimelineTags(createdSince: Date | null | undefined, minConfidence: number | null, limit: number) {
    return countTags(
      'FROM "Pin"',
      [
        '"Pin"."utcDeletedDateTime" IS NULL',
        '($1::timestamptz IS NULL OR "Pin"."utcCreatedDateTime" >= $1)',
        `($2::integer IS NULL OR COALESCE(${pinConfidenceOf('Pin')}, $2) >= $2)`,
      ],
      [createdSince || null, minConfidence],
      limit,
    );
  }

  // Every live pin's id and last change, oldest first, for the sitemap; with
  // skipThin, not the thin pins that ask not to be indexed (src/lib/searchQuality.ts),
  // and `translatable` says whether its translated pages are indexed (and so listed).
  static async listForSitemap(offset: number, limit: number, skipThin = false) {
    return db.query<{ id: number; title: string; lastModified: Date; translatable: boolean }>(
      `
      SELECT "id", "title", COALESCE("utcUpdatedDateTime", "utcCreatedDateTime") AS "lastModified",
        ${skipThin ? TRANSLATABLE_PIN_SQL('"Pin"') : 'true'} AS "translatable"
      FROM "Pin"
      WHERE "utcDeletedDateTime" IS NULL${skipThin ? ` AND NOT ${THIN_PIN_SQL('"Pin"')}` : ''}
      ORDER BY "id"
      OFFSET $1 LIMIT $2`,
      [offset, limit],
    );
  }

  // Every live pin's confidence (null when unscored) with its main category
  // (its first category tag) and author, for the admin statistics on what the timeline hides. Read off
  // "Pin" rather than the view, which had to be deduplicated with a DISTINCT
  // ON after multiplying each pin by its media and merchants.
  static async listConfidence() {
    return db.query<{ id: number; category: string | null; userName: string | null; utcCreatedDateTime: Date; confidence: number | null }>(
      `
      SELECT "p"."id", ${MAIN_CATEGORY} AS "category", "User"."userName" AS "userName", "p"."utcCreatedDateTime",
        ${pinConfidenceOf('p')} AS "confidence"
      FROM "Pin" AS "p"
        LEFT JOIN "User" ON "User"."id" = "p"."userId"
      WHERE "p"."utcDeletedDateTime" IS NULL
      ORDER BY "p"."id"`,
    );
  }

  // The most recently added live pins, newest first, with their authors'
  // handles and the links (source, references) that may name a prediction
  // market. Pins the timeline hides for confidence (minConfidence, null for
  // none) are left out here too.
  static async newest(limit: number, minConfidence: number | null) {
    return db.query<{ id: number; title: string; category: string | null; address: string | null; utcStartDateTime: Date; allDay: boolean; utcCreatedDateTime: Date; sourceUrl: string | null; referenceUrls: string[] }>(
      `
      SELECT "p"."id", "p"."title", ${MAIN_CATEGORY} AS "category", "p"."address", "p"."utcStartDateTime", "p"."allDay", "p"."utcCreatedDateTime", "p"."sourceUrl",
        ARRAY(SELECT "r"."url" FROM "PinReference" AS "r" WHERE "r"."pinId" = "p"."id") AS "referenceUrls"
      FROM "Pin" AS "p"
      WHERE "p"."utcDeletedDateTime" IS NULL
        AND ($2::integer IS NULL OR COALESCE(${pinConfidenceOf('p')}, $2) >= $2)
      ORDER BY "p"."utcCreatedDateTime" DESC, "p"."id" DESC
      LIMIT $1`,
      [limit, minConfidence],
    );
  }

  // The live pins starting from `from` on, soonest first, with their one-line
  // descriptions: the upcoming dates /llms.txt lists for answer engines. Pins
  // the timeline hides for confidence (minConfidence, null for none) are left
  // out here too.
  static async upcoming(from: Date, limit: number, minConfidence: number | null) {
    return db.query<{ id: number; title: string; description: string | null; category: string | null; utcStartDateTime: Date; allDay: boolean }>(
      `
      SELECT "p"."id", "p"."title", "p"."description", ${MAIN_CATEGORY} AS "category", "p"."utcStartDateTime", "p"."allDay"
      FROM "Pin" AS "p"
      WHERE "p"."utcDeletedDateTime" IS NULL
        AND "p"."utcStartDateTime" >= $1::timestamptz
        AND ($3::integer IS NULL OR COALESCE(${pinConfidenceOf('p')}, $3) >= $3)
      ORDER BY "p"."utcStartDateTime", "p"."id"
      LIMIT $2`,
      [from, limit, minConfidence],
    );
  }

  // Every located pin a map marker needs, in one answer rather than a walk
  // through the timeline's pages. The map used to page /api/main outward from
  // now until it passed each boundary - about fifteen round trips for the
  // default year either side - and threw away both the four fifths of each
  // payload a marker never reads and the half of all pins that have no place
  // at all. from/to bound when the pins start (null for unbounded).
  static async queryForMap(bounds: {
    from: Date | null;
    to: Date | null;
    createdSince: Date | null;
    minConfidence: number | null;
    favoriteUserId: number | null;
    restaurantsOnly?: boolean;
  }): Promise<Row[]> {
    return db.query(
      `
      ${MAP_SELECT}
      WHERE ${MAP_WHERE}
        AND ($5::integer IS NULL OR "p"."id" IN (${watchedPinIdsOf('$5')}))
        AND ($4::integer IS NULL OR COALESCE(${pinConfidenceOf('p')}, $4) >= $4)
      ORDER BY "p"."utcStartDateTime", "p"."id"`,
      [bounds.from, bounds.to, bounds.createdSince, bounds.minConfidence, bounds.favoriteUserId, bounds.restaurantsOnly ?? false],
    );
  }

  // The same marker rows for pins a search already picked, narrowed by the
  // map's window in SQL. Saves hydrating whole timeline pins to read a
  // tenth of each, and the second load a restaurant-only map needed for tags.
  static async queryForMapByIds(ids: number[], bounds: { from: Date | null; to: Date | null; createdSince: Date | null; restaurantsOnly?: boolean }): Promise<Row[]> {
    if (!ids.length) return [];
    return db.query(
      `
      ${MAP_SELECT}
      WHERE ${MAP_WHERE}
        AND $4::integer IS NULL AND $5::integer IS NULL
        AND "p"."id" = ANY($7::integer[])
      ORDER BY "p"."utcStartDateTime", "p"."id"`,
      [bounds.from, bounds.to, bounds.createdSince, null, null, bounds.restaurantsOnly ?? false, ids],
    );
  }

  static async countLive(): Promise<number> {
    const rows = await db.query<{ count: number }>(`SELECT COUNT(*) AS "count" FROM "Pin" WHERE "utcDeletedDateTime" IS NULL`);
    return rows[0].count;
  }
}

function result(rows: Row[]): PageResult {
  return { pins: rows, queryCount: rows.length };
}

// A marker's media in the order the pin shows them (Medium's byWeight):
// heaviest first, then lowest id.
// A popup shows one picture - a video's still if the pin has one, else its
// first medium - so only what picking and drawing that needs is sent.
const MAP_MEDIA = `
  (SELECT COALESCE(json_agg(json_build_object(
            'type', "m"."type",
            'thumbName', "m"."thumbName",
            'originalUrl', "m"."originalUrl"
          ) ORDER BY "pm"."weight" DESC, "m"."id"), '[]'::json)
   FROM "PinMedium" AS "pm"
     JOIN "Medium" AS "m" ON "m"."id" = "pm"."mediumId"
   WHERE "pm"."pinId" = "p"."id" AND "pm"."utcDeletedDateTime" IS NULL)`;

// A map marker's columns, and the filters both map queries share ($1 from,
// $2 to, $3 created since, $6 restaurants only).
const MAP_SELECT = `
  SELECT "p"."id", "p"."title", "p"."address", ${CATEGORIES} AS "categories", "p"."allDay",
    "p"."utcStartDateTime", "p"."utcEndDateTime", "p"."utcCreatedDateTime",
    ST_Y("p"."location"::geometry) AS "latitude",
    ST_X("p"."location"::geometry) AS "longitude",
    "p"."price", "p"."priceCurrency", "p"."sourceUrl",
    (SELECT "pw"."megawatts"::float8 FROM "PinPower" AS "pw" WHERE "pw"."pinId" = "p"."id") AS "megawatts",
    ${MAP_MEDIA} AS "media"
  FROM "Pin" AS "p"`;

const MAP_WHERE = `"p"."location" IS NOT NULL
        AND "p"."utcDeletedDateTime" IS NULL
        AND ($1::timestamptz IS NULL OR "p"."utcStartDateTime" >= $1)
        AND ($2::timestamptz IS NULL OR "p"."utcStartDateTime" <= $2)
        AND ($3::timestamptz IS NULL OR "p"."utcCreatedDateTime" >= $3)
        AND (NOT $6::boolean OR (
          EXISTS (SELECT 1 FROM "PinTag" AS "t" WHERE "t"."pinId" = "p"."id" AND "t"."name" = 'Food' AND "t"."kind" = 'category')
          AND EXISTS (SELECT 1 FROM "PinTag" AS "t" WHERE "t"."pinId" = "p"."id" AND "t"."name" IN ('Restaurant Opening', 'Restaurant', 'Restaurants'))))`;

// The reference fields that matter anywhere but a pin's own References
// panel: what a card's confidence badge and its [n] citations read, and
// exactly what the SQL "pinConfidence" weighs. The view's own "references"
// carries the rest - each one's reasoning, title, claimed dates and who added
// it - and that is most of a page: reasoning alone was half the reference
// bytes and a sixth of the whole payload, none of it read away from a pin's
// page. Read off "PinReference" rather than trimmed out of the view's json,
// which also keeps these paths off the view's join to "User".
//
// `as` is the alias of the row they belong to. Anything a card comes to show
// from a reference has to be added here first.
const leanReferences = (as: string) => `
  (SELECT COALESCE(json_agg(json_build_object(
            'url', "r"."url",
            'confidence', "r"."confidence",
            'publishedDate', to_char("r"."publishedDate", 'YYYY-MM-DD'),
            'utcCreatedDateTime', "r"."utcCreatedDateTime"
          ) ORDER BY "r"."id"), '[]'::json)
   FROM "PinReference" AS "r"
   WHERE "r"."pinId" = "${as}"."id")`;

// The tag cloud's counts over a set of pins (the FROM and WHERE of a search
// or of the timeline): the site's own reserved filters first, then the tags
// people wrote, busiest first.
//
// The two are counted apart because the reserved ones are no rows: a pin's
// date confidence is a column and its score is read off its references, and
// neither is in "PinTagView". They also sit outside the tag `limit`, so the
// cloud's strip of site filters is the same few every time.
async function countTags(from: string, where: string[], params: unknown[], limit: number, ctes: string[] = [], zone = 'UTC'): Promise<TagCount[]> {
  const [reserved, tags] = await Promise.all([countReserved(from, where, params, ctes, zone), PinTag.count(from, where, params, limit, ctes)]);
  return [...reserved, ...tags];
}

// How many of these pins each reserved filter holds: the derived reserved
// tags ("Thread" and "Predicted"), each date confidence level, and each band of the pin's
// own score - the same width_bucket the confidence: term filters by, so a
// count and the search it starts agree. A pin with no score is in no band.
async function countReserved(from: string, where: string[], params: unknown[], ctes: string[], zone = 'UTC'): Promise<TagCount[]> {
  const bars = `$${params.length + 1}`;
  // NEW and UPDATED, as the card's pills and their searches read them in the viewer's zone: posted today, and updated since the day 24 hours back.
  const now = Date.now();
  const postedSince = new Date(dayStartIn(dayKeyIn(now, zone), zone));
  const updatedSince = new Date(dayStartIn(dayKeyIn(now - UPDATED_WITHIN_MS, zone), zone));
  const rows = await db.query<{ field: 'tag' | 'confidence' | 'band'; value: string; count: number }>(
    `
      ${withCtes(
        ...ctes,
        `"hits" AS (
        SELECT DISTINCT "Pin"."id",
          "Pin"."dateConfidence"::text AS "level",
          width_bucket(${pinConfidenceOf('Pin')}, ${bars}::integer[]) AS "band"
        ${from}
        WHERE ${where.join('\n          AND ')}
      )`,
      )}
      SELECT 'tag' AS "field", "tg"."name"::text AS "value", COUNT(DISTINCT "hits"."id")::integer AS "count"
      FROM "hits"
        INNER JOIN "PinTagView" AS "tg" ON "tg"."pinId" = "hits"."id" AND "tg"."kind" = 'reserved' AND "tg"."name" <> '${PREDICTED_TAG}'::citext
      GROUP BY "tg"."name"
      UNION ALL
      SELECT 'tag' AS "field", '${PREDICTED_TAG}' AS "value", COUNT(DISTINCT "hits"."id")::integer AS "count"
      FROM "hits"
      WHERE EXISTS (
        SELECT 1 FROM "PinTagView" AS "pt"
        WHERE "pt"."pinId" = "hits"."id"
          AND ("pt"."name" = '${PREDICTED_TAG}'::citext OR ("hits"."level" = 'estimated' AND "pt"."name" = 'Prediction Market'::citext))
      )
      UNION ALL
      SELECT 'tag', '${NEW_TAG}', COUNT(*)::integer FROM "hits" INNER JOIN "Pin" AS "np" ON "np"."id" = "hits"."id" WHERE "np"."utcCreatedDateTime" >= $${params.length + 2}::timestamptz
      UNION ALL
      SELECT 'tag', '${UPDATED_TAG}', COUNT(*)::integer FROM "hits"
      WHERE EXISTS (SELECT 1 FROM "PinUpdate" AS "u" WHERE "u"."pinId" = "hits"."id" AND "u"."utcCreatedDateTime" >= $${params.length + 3}::timestamptz)
      UNION ALL
      SELECT 'confidence', "level", COUNT(*)::integer FROM "hits" WHERE "level" IS NOT NULL GROUP BY "level"
      UNION ALL
      SELECT 'band', "band"::text, COUNT(*)::integer FROM "hits" WHERE "band" IS NOT NULL GROUP BY "band"`,
    [...params, CONFIDENCE_BARS, postedSince, updatedSince],
  );
  const counted = new Map<string, number>();
  for (const row of rows) {
    // A bucket is CONFIDENCE_BANDS' own index (the bars' gaps in order), and
    // a name the site no longer reserves (a tag left in the view) is dropped.
    const band = row.field === 'band' ? CONFIDENCE_BANDS[Number(row.value)]?.band : null;
    const name = row.field === 'tag' ? row.value : reservedName(row.field, band ?? row.value);
    if (name) counted.set(name, (counted.get(name) ?? 0) + row.count);
  }
  return [...counted].map(([name, count]) => ({ name, kind: 'reserved' as const, count }));
}

// How well the rest of a pin's thread is sourced: the mean confidence of the
// other pins in its chain, which the bag weight leans on (src/lib/bagSample.ts)
// so a pin in a well-evidenced story weighs more than a lone one. Null for a
// pin in no thread, and for a chain whose other pins are all unscored - avg
// skips nulls, and a pin weighs 1 for either.
//
// Seeded by the page's own ids rather than computed over the whole table, so
// the cost follows the page and not the corpus: the walk goes both ways from
// each seed (up through parentId, down through its answers) over IX_Pin_parentId,
// and a page of 40 across the longest chains here measures under 5ms. The pin's
// own confidence is left out of its thread's - it is already counted on its own.
export async function threadConfidenceOf(ids: number[]): Promise<Map<number, number>> {
  const seeds = ids.filter((id) => Number.isInteger(id));
  if (!seeds.length) return new Map();
  const rows = await db.query<{ id: number; threadConfidence: number | null }>(
    `
    WITH RECURSIVE "thread" ("seed", "id", "parentId") AS (
        SELECT "id", "id", "parentId"
        FROM "Pin"
        WHERE "id" = ANY($1::integer[]) AND "utcDeletedDateTime" IS NULL
      UNION
        SELECT "t"."seed", "p"."id", "p"."parentId"
        FROM "thread" AS "t"
          JOIN "Pin" AS "p" ON ("p"."id" = "t"."parentId" OR "p"."parentId" = "t"."id")
        WHERE "p"."utcDeletedDateTime" IS NULL
    )
    SELECT "t"."seed" AS "id", round(avg(${pinConfidenceOf('p')}))::integer AS "threadConfidence"
    FROM "thread" AS "t"
      JOIN "Pin" AS "p" ON "p"."id" = "t"."id"
    WHERE "t"."id" <> "t"."seed"
    GROUP BY "t"."seed"`,
    [seeds],
  );
  return new Map(rows.filter((r) => r.threadConfidence != null).map((r) => [Number(r.id), Number(r.threadConfidence)]));
}

// Fills in each pin's threadConfidence, for the pages the timeline samples.
// Left off search and the thread view, which show every match rather than
// picking among them.
async function withThreadConfidence(pins: Pins): Promise<Pins> {
  const byId = await threadConfidenceOf(pins.pins.map((pin) => Number(pin.id)));
  if (byId.size) pins.pins.forEach((pin) => {
    const confidence = byId.get(Number(pin.id));
    if (confidence != null) pin.threadConfidence = confidence;
  });
  return pins;
}

// A pin's confidence, read from "PinConfidence" (0147), which triggers keep
// current as its references, source and date confidence change. Scoring it
// off "PinReference" per row (what this used to do, and what "pinConfidence"
// still computes for the table) meant a page of the newest N pins had to score
// every live pin before it could stop: 1-2 s a call in production. As a
// primary-key lookup per candidate row the planner walks the date index and
// stops when the page is full.
export const pinConfidenceOf = (as: string) =>
  `(SELECT "pcs"."score" FROM "PinConfidence" AS "pcs" WHERE "pcs"."pinId" = "${as}"."id")`;

// Pin "as" inside the viewer's ring: the EWKT point at $point and the radius
// in metres at $meters, both null when the request named no ring. A pin with
// no place on the map is not near anywhere, so a ring leaves it out -
// ST_DWithin answers NULL for such a pin, which the filter drops.
const withinRing = (as: string, point: number, meters: number) =>
  `($${point}::text IS NULL OR ST_DWithin("${as}"."location", $${point}::geography, $${meters}::double precision))`;

// Whether pin "as" is a predicted pin: tagged 'Predicted', or an estimated-date
// pin citing a prediction market ('Prediction Market' in PinTagView).
const predictedPinOf = (as: string) =>
  `EXISTS (SELECT 1 FROM "PinTagView" AS "pt" WHERE "pt"."pinId" = "${as}"."id" AND ("pt"."name" = 'Predicted'::citext OR ("${as}"."dateConfidence" = 'estimated' AND "pt"."name" = 'Prediction Market'::citext)))`;

// Every pin id a user's Watch view shows: the pins they watch directly, plus
// (unless excludePredicted is true) predicted pins of companies they follow.
const watchedPinIdsOf = (userParam: string, excludePredicted = false) =>
  excludePredicted
    ? `SELECT "Favorites"."pinId" FROM "Favorite" AS "Favorites"
       WHERE "Favorites"."utcDeletedDateTime" IS NULL AND "Favorites"."userId" = ${userParam}`
    : `SELECT "Favorites"."pinId" FROM "Favorite" AS "Favorites"
       WHERE "Favorites"."utcDeletedDateTime" IS NULL AND "Favorites"."userId" = ${userParam}
       UNION
       SELECT "p"."id" FROM "CompanyFollow" AS "cf"
         INNER JOIN "Pin" AS "p" ON "p"."companyId" = "cf"."companyId" AND "p"."utcDeletedDateTime" IS NULL
         INNER JOIN "PinTagView" AS "pt" ON "pt"."pinId" = "p"."id"
           AND ("pt"."name" = 'Predicted'::citext OR ("p"."dateConfidence" = 'estimated' AND "pt"."name" = 'Prediction Market'::citext))
       WHERE "cf"."utcDeletedDateTime" IS NULL AND "cf"."userId" = ${userParam}`;

// The columns a timeline page returns. Deliberately narrower than "Pin".*:
// no longFormSummary (detail page only) and no utcDeletedDateTime (always
// null here), and references only as far as a card reads them. "Media.type"
// is an integer on this path, as it always has been.
const PAGE_COLUMNS = `
  "Pin"."id",
  "Pin"."parentId",
  "Pin"."title",
  "Pin"."description",
  "Pin"."sourceUrl",
  "Pin"."address",
  "Pin"."latitude",
  "Pin"."longitude",
  "Pin"."priceLowerBound",
  "Pin"."priceUpperBound",
  "Pin"."price",
  "Pin"."priceCurrency",
  "Pin"."tip",
  "Pin"."dateConfidence",
  "Pin"."dateConfidenceReasoning",
  "Pin"."companyId",
  "Pin"."company",
  "Pin"."companyWikiUrl",
  "Pin"."companyLogoUrl",
  "Pin"."categories",
  "Pin"."utcStartDateTime",
  "Pin"."utcEndDateTime",
  "Pin"."sourceStartDateTime",
  "Pin"."sourceEndDateTime",
  "Pin"."originalStartDate",
  "Pin"."delayReasoning",
  "Pin"."episodeCount",
  "Pin"."episodeStatus",
  -- The dollars on the markets it cites: the bag weight leans on it
  -- (src/lib/bagSample.ts), so a page of cards has to carry it.
  "Pin"."marketVolume",
  "Pin"."allDay",
  "Pin"."userId",
  "Pin"."utcCreatedDateTime",
  "Pin"."utcUpdatedDateTime",
  -- Its newest update (PinUpdate, 0081), for the card's UPDATED pill.
  -- utcUpdatedDateTime is no use there: translations, episode counts and
  -- summary rebuilds all touch it.
  (SELECT max("u"."utcCreatedDateTime") FROM "PinUpdate" AS "u" WHERE "u"."pinId" = "Pin"."id") AS "utcLastUpdateDateTime",
  -- In the curated section (Products: has a ProductBlurb; Restaurants: tagged
  -- Top Restaurants), for the card's CURATED pill.
  ${CURATED} AS "curated",
  "Pin"."favoriteCount",
  "Pin"."likeCount",
  "Pin"."rootThread",
  ${leanReferences('Pin')} AS "references",
  "Pin"."ratings",
  "Pin"."stocks",
  "Pin"."tags",
  "Pin"."viewCount",
  (SELECT COUNT(*)::integer FROM "PinImpression" AS "i" WHERE "i"."pinId" = "Pin"."id") AS "impressionCount",
  -- Its company's market value: the bag weight leans on it too.
  (SELECT "c"."marketCap"::double precision FROM "Company" AS "c" WHERE "c"."id" = "Pin"."companyId") AS "companyMarketCap",
  "Pin"."duplicateGroup",
  EXISTS (SELECT 1 FROM "Favorite" AS "f"
          WHERE "f"."userId" = $1 AND "f"."pinId" = "Pin"."id" AND "f"."utcDeletedDateTime" IS NULL) AS "hasFavorite",
  EXISTS (SELECT 1 FROM "Like" AS "l"
          WHERE "l"."userId" = $1 AND "l"."pinId" = "Pin"."id" AND "l"."utcDeletedDateTime" IS NULL) AS "hasLike",
  "Pin"."Media.id",
  "Pin"."Media.thumbName",
  "Pin"."Media.thumbWidth",
  "Pin"."Media.thumbHeight",
  "Pin"."Media.originalUrl",
  "Pin"."Media.originalWidth",
  "Pin"."Media.originalHeight",
  "Pin"."Media.type"::integer AS "Media.type",
  "Pin"."Media.authorName",
  "Pin"."Media.authorUrl",
  "Pin"."Media.html",
  "Pin"."User.userName",
  "Pin"."User.pictureUrl",
  "Pin"."Merchant.id",
  "Pin"."Merchant.label",
  "Pin"."Merchant.url",
  "Pin"."Merchant.price"`;

// One page of the timeline, walking forward (later pins) or backward from
// (fromDateTime, lastPinId). The whole timeline leaves out pins scored below
// minConfidence (the admin setting; null shows every pin), filtered while the
// page is picked rather than after it so pages stay full; a watched list keeps
// every pin.
//
// Two steps, the ones search takes (rankSearch, then querySearchRanked): the
// page's pin ids off "Pin", and then those pins out of the view. Limiting the
// view directly cannot work - it groups and carries correlated subqueries, so
// the limit stays above them and every pin past the cursor is built in full
// before all but a page is thrown away, which made a page cost with the size
// of the table rather than with the size of the page.
//
// The ids have to arrive as ARRAY(...), not as a CTE joined to the view: a
// join leaves Postgres materialising the whole view and then filtering it,
// while "id" = ANY(...) pushes down into the view's own scan of "Pin". The
// cursor has to compare as a row, the way rankSearch does, rather than as
// "start > $2 OR (start = $2 AND id > $3)": the OR costs the walk its ordered
// scan of IX_Pin_utcStartDateTime, and with it the chance to stop at a full
// page rather than score every pin past the cursor and then sort.
//
// pageSize counts pins; it counted the view's pin x medium x merchant rows
// until the page stopped coming out of the view, which let a page end midway
// through a pin's media and leave the rest of them unreachable.
function queryPage(
  queryForward: boolean,
  onlyFavorites: boolean,
  fromDateTime: Date | string,
  userId: number,
  lastPinId: number,
  pageSize: number,
  createdSince?: Date | null,
  minConfidence: number | null = null,
  near?: NearFilter | null,
  timeZone = 'UTC',
  focusId = 0,
): Promise<PageResult> {
  const after = queryForward ? '>' : '<';
  const direction = queryForward ? 'ASC' : 'DESC';
  return db
    .query(
      `
    SELECT ${PAGE_COLUMNS}
    FROM "PinBaseCache" AS "Pin"
    WHERE "Pin"."id" = ANY(ARRAY(
      SELECT "p"."id"
      FROM "Pin" AS "p"
      WHERE ("p"."utcStartDateTime", "p"."id") ${after} ($2::timestamptz, $3::integer)
        AND "p"."utcDeletedDateTime" IS NULL
        ${onlyFavorites ? `AND "p"."id" IN (${watchedPinIdsOf('$1')})` : ''}
        AND ($4::timestamptz IS NULL OR "p"."utcCreatedDateTime" >= $4)
        AND ($6::integer IS NULL OR COALESCE(${pinConfidenceOf('p')}, $6) >= $6)
        AND ${withinRing('p', 7, 8)}
        ${onlyFavorites ? '' : `AND ("p"."id" = $10 OR ${restaurantTimelineClause('p', '$9', `($4::timestamptz IS NULL OR "timelineOther"."utcCreatedDateTime" >= $4) AND ($6::integer IS NULL OR COALESCE(${pinConfidenceOf('timelineOther')}, $6) >= $6) AND ${withinRing('timelineOther', 7, 8)}`)})`}
      ORDER BY "p"."utcStartDateTime" ${direction}, "p"."id" ${direction}
      LIMIT $5))
    ORDER BY "Pin"."utcStartDateTime" ${direction}, "Pin"."id" ${direction},
      "Pin"."Media.id" ${direction}, "Pin"."Merchant.id" ${direction}`,
      [userId, fromDateTime, lastPinId, createdSince || null, pageSize, onlyFavorites ? null : minConfidence, near?.point ?? null, near?.meters ?? null, ...(onlyFavorites ? [] : [timeZone, focusId])],
    )
    .then(result);
}

// The pins starting in [start, end), the two steps queryPage takes.
function queryBetween(start: Date, end: Date, userId: number, limit: number, createdSince: Date | null | undefined, minConfidence: number | null, near?: NearFilter | null): Promise<PageResult> {
  return db
    .query(
      `
    SELECT ${PAGE_COLUMNS}
    FROM "PinBaseCache" AS "Pin"
    WHERE "Pin"."id" = ANY(ARRAY(
      SELECT "p"."id"
      FROM "Pin" AS "p"
      WHERE "p"."utcStartDateTime" >= $2::timestamptz AND "p"."utcStartDateTime" < $3::timestamptz
        AND "p"."utcDeletedDateTime" IS NULL
        AND ($4::timestamptz IS NULL OR "p"."utcCreatedDateTime" >= $4)
        AND ($6::integer IS NULL OR COALESCE(${pinConfidenceOf('p')}, $6) >= $6)
        AND ${withinRing('p', 7, 8)}
      ORDER BY "p"."utcStartDateTime", "p"."id"
      LIMIT $5))
    ORDER BY "Pin"."utcStartDateTime", "Pin"."id", "Pin"."Media.id", "Pin"."Merchant.id"`,
      [userId, start, end, createdSince || null, limit, minConfidence, near?.point ?? null, near?.meters ?? null],
    )
    .then(result);
}

// The first page: the pageSizePrev pins before fromDateTime and the
// pageSizeNext pins from it on, oldest first. With aroundPinId the split is at
// that pin, which leads the later half.
async function queryInitialPage(
  onlyFavorites: boolean,
  fromDateTime: Date,
  userId: number,
  pageSizePrev: number,
  pageSizeNext: number,
  createdSince?: Date | null,
  minConfidence: number | null = null,
  aroundPinId = 0,
  near?: NearFilter | null,
  timeZone = 'UTC',
): Promise<PageResult> {
  const [prev, next] = await Promise.all([
    queryPage(false, onlyFavorites, fromDateTime, userId, aroundPinId, pageSizePrev, createdSince, minConfidence, near, timeZone, aroundPinId),
    queryPage(true, onlyFavorites, fromDateTime, userId, aroundPinId ? aroundPinId - 1 : 0, pageSizeNext, createdSince, minConfidence, near, timeZone, aroundPinId),
  ]);
  return {
    pins: prev.pins.reverse().concat(next.pins),
    queryCount: prev.queryCount + next.queryCount,
  };
}

function queryPinByIds(ids: number[]): Promise<PageResult> {
  return db
    .query(
      `
    SELECT "Pin".*
    FROM "PinBaseCache" AS "Pin"
    WHERE "Pin"."id" = ANY($1::integer[])
      AND "Pin"."utcDeletedDateTime" IS NULL
    ORDER BY "Pin"."utcStartDateTime", "Pin"."id", "Pin"."Media.id", "Pin"."Merchant.id"`,
      [ids],
    )
    .then(result);
}

// A pin's whole thread as a tree, in the order it reads: the top pin first,
// then each pin's responses under it, depth first, siblings oldest first. The
// tree is the pin's ancestors (any author) with, under every one of them and
// under the pin itself, each reply by the same author as the pin it answers.
// A reader on any branch therefore sees the other branches too, not just the
// line down to the top.
//
// level is how far a row is nested: it steps in only below a pin that has
// more than one response, so a long unbranched chain stays flush left however
// deep it runs. reverseOrder keeps its old meaning - 0 for pinId, positive
// above it, negative below - so the flat API order is unchanged for a chain.
// Ids and places only; getThreadPins reads the pins themselves.
async function queryThreadOrder(pinId: number): Promise<{ id: number; reverseOrder: number; level: number }[]> {
  // UNION, not UNION ALL, so a parentId cycle ends instead of looping.
  const rows = await db.query<{ id: number; parentId: number | null; start: Date | string }>(
    `
    WITH RECURSIVE
      "above" ("id", "parentId", "userId", "start") AS (
          SELECT "id", "parentId", "userId", "utcStartDateTime"
          FROM "Pin"
          WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL
        UNION
          SELECT "Pin"."id", "Pin"."parentId", "Pin"."userId", "Pin"."utcStartDateTime"
          FROM "Pin"
            JOIN "above" ON "Pin"."id" = "above"."parentId"
          WHERE "Pin"."utcDeletedDateTime" IS NULL
      ),
      "tree" ("id", "parentId", "userId", "start") AS (
          SELECT "id", "parentId", "userId", "start" FROM "above"
        UNION
          SELECT "Pin"."id", "Pin"."parentId", "Pin"."userId", "Pin"."utcStartDateTime"
          FROM "Pin"
            JOIN "tree" ON "Pin"."parentId" = "tree"."id"
          WHERE "Pin"."utcDeletedDateTime" IS NULL
            AND "tree"."userId" = "Pin"."userId"
      )
    SELECT "id", "parentId", "start" FROM "tree"`,
    [pinId],
  );
  if (!rows.length) return [];

  const byId = new Set(rows.map((r) => Number(r.id)));
  const children = new Map<number, typeof rows>();
  const tops: typeof rows = [];
  for (const row of rows) {
    const parent = row.parentId == null ? null : Number(row.parentId);
    if (parent === null || !byId.has(parent)) {
      tops.push(row);
    } else {
      children.set(parent, [...(children.get(parent) ?? []), row]);
    }
  }
  const oldestFirst = (a: (typeof rows)[number], b: (typeof rows)[number]) => new Date(a.start).getTime() - new Date(b.start).getTime() || Number(a.id) - Number(b.id);

  // Depth first, with an explicit stack: a chain can run to hundreds of pins.
  const ordered: { id: number; level: number }[] = [];
  const seen = new Set<number>();
  const stack = tops.sort(oldestFirst).reverse().map((row) => ({ row, level: 0 }));
  while (stack.length) {
    const { row, level } = stack.pop()!;
    const id = Number(row.id);
    if (seen.has(id)) continue;
    seen.add(id);
    ordered.push({ id, level });
    const below = (children.get(id) ?? []).sort(oldestFirst);
    const next = below.length > 1 ? level + 1 : level;
    for (let i = below.length - 1; i >= 0; i--) stack.push({ row: below[i], level: next });
  }

  const at = Math.max(0, ordered.findIndex((o) => o.id === pinId));
  return ordered.map((o, index) => ({ ...o, reverseOrder: at - index }));
}

// The SQL for each rating: and delay: comparison, so nothing typed reaches the query.
const RATING_OPS: Record<RatingBound['op'], string> = { '>': '>', '>=': '>=', '<': '<', '<=': '<=', '=': '=' };

// A pin's delay in days or in calendar months, as the badge counts them
// (lib/delay.ts): from Pin.originalStartDate, a date, to the UTC day its
// start falls on. NULL where it has not slipped, so it meets no delay: bound.
const START_DAY = `("Pin"."utcStartDateTime" AT TIME ZONE 'UTC')::date`;
const DELAY_AMOUNT: Record<DelayBound['unit'], string> = {
  days: `(${START_DAY} - "Pin"."originalStartDate")`,
  months: `((EXTRACT(YEAR FROM ${START_DAY}) * 12 + EXTRACT(MONTH FROM ${START_DAY})) - (EXTRACT(YEAR FROM "Pin"."originalStartDate") * 12 + EXTRACT(MONTH FROM "Pin"."originalStartDate")))`,
};

// The FROM and WHERE a search's filter makes, on the Pin table itself rather
// than the view, so a page counts pins instead of pin x medium x merchant rows.
// Each label list widens its own field (any of these companies) and an empty
// list leaves it unfiltered; the fields narrow each other. citext columns make
// the matches case-insensitive. With free-text hits, only those pins are
// candidates and each scores as the search service said; without, every pin
// scores 1.
export function searchClauses(filter: SearchFilter) {
  const params: unknown[] = [];
  const add = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };
  // Named subqueries the query goes on to join, for withCtes to write first.
  const ctes: string[] = [];
  const joins: string[] = [];
  const where = ['"Pin"."utcDeletedDateTime" IS NULL'];

  // Where a pin stands: its address line, matched a whole word at a time so
  // that a city, a state, a postal code or a country picks it out (placeMatch).
  const addressMatches = (patterns: string[]) => `("Pin"."address" ~* ANY(${add(patterns)}::text[]))`;

  // Free text is the search service's pool of best matches, widened by every
  // pin whose address names it: someone typing "chicago" wants what happened
  // in Chicago, whether or not the words say so, and those pins can stand
  // well outside the pool the semantic ranking keeps.
  const typed = filter.hits && filter.text && looksLikePlaceText(filter.text) ? filter.text : null;
  let score = '1::float8';
  if (filter.hits) {
    const hit = `unnest(${add(filter.hits.map((h) => h.id))}::integer[], ${add(filter.hits.map((h) => h.score))}::float8[]) AS "hit" ("id", "score") ON "hit"."id" = "Pin"."id"`;
    if (typed) {
      // Every pin that says the text, worked out once ("said") and joined, as
      // the filter, the score and the pool's trim below all ask it: written
      // as conditions on each pin, Postgres ran every scan three times, and
      // each pass over the translated titles reads all of "PinTranslation".
      // A pin's address naming it (a city, a state, a postal code).
      const place = add([wholeWordPattern(typed)]);
      // Its title in any language it is translated into, whatever the page's
      // language: a name typed as a card in that language writes it (台积电,
      // 風の谷のナウシカ) is then found however the semantic ranking scored it.
      // One condition a pattern, not ~* ALL(...): the trigram index (0104) can
      // answer only the plain form.
      const title = typedTextPatterns(typed)
        .map((pattern) => `"tr"."title" ~* ${add(pattern)}::text`)
        .join(' AND ');
      // Every word typed in its own title and description, or one of its
      // tags, so a pin that says what was searched for is found however far
      // down the semantic ranking it fell, or past the pool's end.
      // One condition a word, as for the titles: ~* ALL(...) cannot use a
      // trigram index (0195), a run of plain ~* ANDed together can.
      const wordPatterns = typedWordPatterns(typed).map((pattern) => add(pattern));
      const ownWords = wordPatterns.length ? wordPatterns.map((word) => `("p"."title" || ' ' || COALESCE("p"."description", '')) ~* ${word}::text`).join(' AND ') : 'false';
      ctes.push(`"said" AS (
        SELECT "m"."id", bool_or("m"."place") AS "place", bool_or("m"."title") AS "title", bool_or("m"."words") AS "words"
        FROM (
          SELECT "p"."id", "p"."address" ~* ANY(${place}::text[]) AS "place", false AS "title", (${ownWords}) AS "words"
          FROM "Pin" AS "p"
          WHERE "p"."address" ~* ANY(${place}::text[]) OR (${ownWords})
          UNION ALL
          SELECT "tr"."pinId", false, true, false FROM "PinTranslation" AS "tr" WHERE ${title}${
            wordPatterns.length
              ? `
          UNION ALL
          SELECT "wt"."pinId", false, false, true FROM "PinTagView" AS "wt" WHERE ${wordPatterns.map((word) => `"wt"."name"::text ~* ${word}::text`).join(' AND ')}`
              : ''
          }
        ) AS "m"
          INNER JOIN "Pin" AS "says" ON "says"."id" = "m"."id" AND "says"."utcDeletedDateTime" IS NULL
        GROUP BY "m"."id")`);
      joins.push(`LEFT JOIN ${hit}`, 'LEFT JOIN "said" ON "said"."id" = "Pin"."id"');
      // Once any pin says the text, the semantic pool keeps only its strong
      // matches (SEMANTIC_ALONE_SCORE): the rest of it is whatever the model
      // put nearest a word it had little to go on for.
      where.push(
        `("said"."id" IS NOT NULL OR "hit"."score" >= ${SEMANTIC_ALONE_SCORE}::float8
          OR ("hit"."id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "said")))`,
      );
      const titleScore = isCjkText(typed) ? `${TITLE_TEXT_SCORE}::float8 + COALESCE("hit"."score", 0)` : `${PLACE_TEXT_SCORE}::float8`;
      score = `GREATEST(COALESCE("hit"."score", 0), CASE WHEN "said"."place" THEN ${PLACE_TEXT_SCORE}::float8 ELSE 0 END, CASE WHEN "said"."title" THEN ${titleScore} ELSE 0 END, CASE WHEN "said"."words" THEN ${SEMANTIC_ALONE_SCORE}::float8 ELSE 0 END)`;
    } else {
      joins.push(`INNER JOIN ${hit}`);
      score = '"hit"."score"';
    }
  }
  // Days as instant ranges, so the start and created indexes serve them (and
  // BC days need no date arithmetic in SQL). A date: day is the timeline's:
  // an all-day pin on its UTC date, a timed one on its date in the zone.
  const zone = filter.timeZone || 'UTC';
  const between = (column: string, from: number, to: number) => `(${column} >= ${add(new Date(from))} AND ${column} < ${add(new Date(to))})`;
  // today and yesterday (posted:today, updated:>=yesterday) are read when the search runs, in the viewer's zone; yesterday is the day 24 hours back, as the UPDATED pill reads it.
  const resolveDay = (day: string) => (day === 'today' ? dayKeyIn(Date.now(), zone) : day === 'yesterday' ? dayKeyIn(Date.now() - UPDATED_WITHIN_MS, zone) : day);
  const localDay = (column: string, rawDay: string) => {
    const day = resolveDay(rawDay);
    return between(column, dayStartIn(day, zone), dayStartIn(nextDayKey(day), zone));
  };
  // Every label field a query can hold, as conditions a pin must all meet.
  const labelWhere = (filter: PinSearchFilters): string[] => {
    const where: string[] = [];
    // Named pins and no others, however they were found (a notification batch).
    if (filter.ids.length) {
      where.push(`"Pin"."id" = ANY(${add(filter.ids)}::integer[])`);
    }
    if (filter.userNames.length) {
      where.push(`"Pin"."userId" IN (SELECT "User"."id" FROM "User" WHERE "User"."userName" = ANY(${add(filter.userNames)}::citext[]))`);
    }
    if (filter.companies.length) {
      where.push(`"Pin"."companyId" IN (SELECT "Company"."id" FROM "Company" WHERE "Company"."name" = ANY(${add(filter.companies)}::citext[]))`);
    }
    // Any of these tickers ($NKE): the pin's company is listed under one, or
    // the pin carries one as its company's stock (0029) and it was not taken off.
    if (filter.tickers.length) {
      const tickers = add(filter.tickers);
      where.push(`(EXISTS (SELECT 1 FROM "Company" AS "listed" WHERE "listed"."id" = "Pin"."companyId" AND upper("listed"."tickerSymbol") = ANY(${tickers}::text[]))
            OR EXISTS (SELECT 1 FROM "PinTicker" AS "stock" WHERE "stock"."pinId" = "Pin"."id" AND "stock"."relation" = 'company'
              AND "stock"."utcRemovedDateTime" IS NULL AND upper("stock"."symbol") = ANY(${tickers}::text[])))`);
    }
    // One confidence: field, so its levels and its score bands widen each other.
    // A band is read off the score in one pass with width_bucket, which drops a
    // score into the bar list's gaps ([50, 75] -> 0 low, 1 medium, 2 high) -
    // CONFIDENCE_BANDS' own order. An unscored pin buckets to NULL and is in no
    // band, as it is on the timeline.
    const confidence: string[] = [];
    if (filter.confidences.length) {
      confidence.push(`"Pin"."dateConfidence"::citext = ANY(${add(filter.confidences)}::citext[])`);
    }
    if (filter.confidenceBands.length) {
      const buckets = filter.confidenceBands.map((band) => CONFIDENCE_BANDS.findIndex((b) => b.band === band));
      confidence.push(`width_bucket(${pinConfidenceOf('Pin')}, ${add(CONFIDENCE_BARS)}::integer[]) = ANY(${add(buckets)}::integer[])`);
    }
    if (confidence.length) {
      where.push(`(${confidence.join(' OR ')})`);
    }
    // Any of these places: a US state under either its name or its code.
    if (filter.places.length) {
      where.push(addressMatches(placePatterns(filter.places)));
    }
    // A game on any of these platforms (platform:), or rated any of these
    // (rated:, the board then its label), from PinGameInfo.
    if (filter.platforms.length) {
      where.push(`EXISTS (SELECT 1 FROM "PinGameInfo" AS "g" WHERE "g"."pinId" = "Pin"."id" AND "g"."platforms" ?| ${add(filter.platforms)}::text[])`);
    }
    // taste: a product whose taste profile scores every one of these axes strongly.
    // The axis names are TASTE_KEYS, so they are safe as column names.
    if (filter.tastes.length) {
      // taste:any asks only for a profile; axes ask for a strong score.
      const scored = filter.tastes.filter((axis): axis is TasteAxis => axis !== 'any' && TASTE_KEYS.includes(axis)).map((axis) => `"t"."${axis}" >= ${TASTE_STRONG}`);
      if (!scored.length && filter.tastes.includes('any')) scored.push('TRUE');
      if (scored.length) where.push(`EXISTS (SELECT 1 FROM "PinTaste" AS "t" WHERE "t"."pinId" = "Pin"."id" AND ${scored.join(' AND ')})`);
    }
    // carperf: a car whose performance rubric scores every one of these axes
    // strongly (a null axis, no published spec, never does). The axis names are
    // CAR_PERF_KEYS, so they are safe as column names.
    // rubric: a pin with an engineering rubric scored against any of these
    // years' criteria (rubricYearClause: any rubric table). Beside carperf: the
    // year is read off that same car rubric, so "carperf:range rubric:2026" is
    // a car scoring range strongly under the 2026 criteria.
    const years = filter.rubricYears.filter(isRubricYear);
    const yearsParam = years.length ? add(years) : null;
    let yearApplied = false;
    if (filter.carPerfs.length) {
      const scored = filter.carPerfs.filter((axis): axis is CarPerfAxis => axis !== 'any' && CAR_PERF_KEYS.includes(axis)).map((axis) => `"c"."${axis}" >= ${CAR_PERF_STRONG}`);
      if (!scored.length && filter.carPerfs.includes('any')) scored.push('TRUE');
      if (yearsParam && scored.length) {
        scored.push(`"c"."rubricYear" = ANY(${yearsParam}::integer[])`);
        yearApplied = true;
      }
      if (scored.length) where.push(`EXISTS (SELECT 1 FROM "PinCarPerf" AS "c" WHERE "c"."pinId" = "Pin"."id" AND ${scored.join(' AND ')})`);
    }
    if (yearsParam && !yearApplied) where.push(rubricYearClause(yearsParam));
    // dining: a restaurant whose dining rubric scores every one of these axes
    // strongly (a null axis, no published figure, never does). The axis names
    // are DINING_KEYS, so they are safe as column names.
    if (filter.dinings.length) {
      const scored = filter.dinings.filter((axis): axis is DiningAxis => axis !== 'any' && DINING_KEYS.includes(axis)).map((axis) => `"d"."${axis}" >= ${DINING_STRONG}`);
      if (!scored.length && filter.dinings.includes('any')) scored.push('TRUE');
      if (scored.length) where.push(`EXISTS (SELECT 1 FROM "PinDining" AS "d" WHERE "d"."pinId" = "Pin"."id" AND ${scored.join(' AND ')})`);
    }
    // hotel: a property whose hotel rubric scores every one of these axes
    // HOTEL_STRONG or more; 'any' is any property with a rubric. The axes are
    // HOTEL_KEYS, so they are safe as column names.
    if (filter.hotels.length) {
      const scored = filter.hotels.filter((axis): axis is HotelAxis => axis !== 'any' && HOTEL_KEYS.includes(axis)).map((axis) => `"h"."${axis}" >= ${HOTEL_STRONG}`);
      if (!scored.length && filter.hotels.includes('any')) scored.push('TRUE');
      if (scored.length) where.push(`EXISTS (SELECT 1 FROM "PinHotel" AS "h" WHERE "h"."pinId" = "Pin"."id" AND ${scored.join(' AND ')})`);
    }
    // person: and the radar-axis bounds (misconduct:>3): a pin linked to a
    // person who is any of the names given and whose best score across their
    // life phases meets every bound. The axis names are OCTAGON_AXES, so they
    // are safe as JSON keys here only because they are bound as parameters.
    if (filter.people.length || filter.personAxes.length) {
      const who: string[] = [];
      if (filter.people.length) {
        const names = add(filter.people.map((name) => name.toLowerCase()));
        who.push(`(lower("pe"."name") = ANY(${names}::text[]) OR "pe"."slug" = ANY(${names}::text[]))`);
      }
      for (const { axis, op, value } of filter.personAxes) {
        who.push(`(SELECT max(("ph"."axes" -> ${add(axis)}::text ->> 'score')::numeric) FROM "PersonPhase" AS "ph" WHERE "ph"."personId" = "pe"."id") ${RATING_OPS[op]} ${add(value)}::numeric`);
      }
      where.push(`EXISTS (SELECT 1 FROM "PinPerson" AS "pp" JOIN "Person" AS "pe" ON "pe"."id" = "pp"."personId" WHERE "pp"."pinId" = "Pin"."id" AND ${who.join(' AND ')})`);
    }
    if (filter.rated.length) {
      where.push(`EXISTS (SELECT 1 FROM "PinGameInfo" AS "g" WHERE "g"."pinId" = "Pin"."id" AND lower("g"."maturityBoard" || ' ' || "g"."maturityRating") = ANY(${add(filter.rated.map((r) => r.toLowerCase()))}::text[]))`);
    }
    // Every rating: bound, on the pin's headline rating as its card shows it
    // (format.ts averageRating): its review scores as percentages of their own
    // maximums, averaged and rounded - a market's forecast left out. A pin
    // without ratings averages to NULL and meets no bound.
    if (filter.ratings.length) {
      const bounds = filter.ratings.map(({ op, value }) => `"rated"."percent" ${RATING_OPS[op]} ${add(value)}::numeric`);
      where.push(`EXISTS (
            SELECT 1 FROM (
              SELECT round(avg("r"."score" / "r"."scoreMax" * 100)) AS "percent"
              FROM "PinRating" AS "r"
              WHERE "r"."pinId" = "Pin"."id" AND "r"."scoreMax" > 0 AND "r"."source" !~* '\\yforecast$'
            ) AS "rated"
            WHERE ${bounds.join(' AND ')})`);
    }
    // Every delay: bound, on how far the start has slipped from the day first
    // promised. A pin whose start is no later than that day has not slipped and
    // meets none.
    if (filter.delays.length) {
      const bounds = filter.delays.map(({ op, unit, value }) => `${DELAY_AMOUNT[unit]} ${RATING_OPS[op]} ${add(value)}::numeric`);
      where.push(`("Pin"."originalStartDate" IS NOT NULL AND "Pin"."utcStartDateTime" IS NOT NULL AND ${START_DAY} > "Pin"."originalStartDate" AND ${bounds.join(' AND ')})`);
    }
    // Any of these tags (PinTagView: the form's, its categories, the prose's
    // and the awards').
    if (filter.tags.length) {
      const curated = filter.tags.some((tag) => tag.toLowerCase() === 'curated');
      const predicted = filter.tags.some((tag) => tag.toLowerCase() === 'predicted');
      const expandedTags = expandTagGroups(filter.tags);
      where.push(`(EXISTS (SELECT 1 FROM "PinTagView" AS "tagged" WHERE "tagged"."pinId" = "Pin"."id" AND ("tagged"."name" = ANY(${add(expandedTags ?? filter.tags)}::citext[])${expandedTags ? '' : ` OR "tagged"."name"::text ~* ANY(${add(tagGroupPatterns(filter.tags))}::text[])`}))${curated ? ` OR ${CURATED}` : ''}${predicted ? ` OR ${predictedPinOf('Pin')}` : ''})`);
    }
    // None of these (-tag:), each read as a tag: term is, so leaving out an
    // award body leaves out every year of it.
    if (filter.excludeTags.length) {
      const expandedExcluded = expandTagGroups(filter.excludeTags);
      const excludePredicted = filter.excludeTags.some((tag) => tag.toLowerCase() === 'predicted');
      where.push(`NOT EXISTS (SELECT 1 FROM "PinTagView" AS "untagged" WHERE "untagged"."pinId" = "Pin"."id" AND ("untagged"."name" = ANY(${add(expandedExcluded ?? filter.excludeTags)}::citext[])${expandedExcluded ? '' : ` OR "untagged"."name"::text ~* ANY(${add(tagGroupPatterns(filter.excludeTags))}::text[])`}))`);
      if (excludePredicted) {
        where.push(`NOT ${predictedPinOf('Pin')}`);
      }
    }
    if (filter.dates.length) {
      const days = filter.dates.map((day) => {
        const utc = between('"Pin"."utcStartDateTime"', dayKeyToMs(day), dayKeyToMs(nextDayKey(day)));
        return `(("Pin"."allDay" AND ${utc}) OR (NOT "Pin"."allDay" AND ${localDay('"Pin"."utcStartDateTime"', day)}))`;
      });
      where.push(`(${days.join(' OR ')})`);
    }
    // holiday: - the days its names fall on (every year), read as date: reads a
    // day, and narrowing the other date terms. A name nobody keeps matches nothing.
    if (filter.holidays.length) {
      const runs = holidayRanges(filter.holidays, zone);
      const days = runs.map(({ from, to }) => {
        const after = nextDayKey(to);
        const utc = between('"Pin"."utcStartDateTime"', dayKeyToMs(from), dayKeyToMs(after));
        const local = between('"Pin"."utcStartDateTime"', dayStartIn(from, zone), dayStartIn(after, zone));
        return `(("Pin"."allDay" AND ${utc}) OR (NOT "Pin"."allDay" AND ${local}))`;
      });
      where.push(days.length ? `(${days.join(' OR ')})` : 'FALSE');
    }
    if (filter.postedDays.length) {
      where.push(`(${filter.postedDays.map((day) => localDay('"Pin"."utcCreatedDateTime"', day)).join(' OR ')})`);
    }
    // Comparisons on those days (date:>=, posted:<, ranges), every one of them,
    // each against the instant its day begins - UTC for an all-day pin's start,
    // the zone otherwise.
    for (const { op, day } of filter.dateBounds) {
      const utc = `"Pin"."utcStartDateTime" ${op} ${add(new Date(dayKeyToMs(day)))}`;
      const local = `"Pin"."utcStartDateTime" ${op} ${add(new Date(dayStartIn(day, zone)))}`;
      where.push(`(("Pin"."allDay" AND ${utc}) OR (NOT "Pin"."allDay" AND ${local}))`);
    }
    for (const { op, day } of filter.postedBounds) {
      where.push(`"Pin"."utcCreatedDateTime" ${op} ${add(new Date(dayStartIn(resolveDay(day), zone)))}`);
    }
    // updated: matches a pin with any update (PinUpdate) on one of the days and
    // within every bound - one update has to meet them all, as the card's
    // UPDATED pill reads its newest one.
    if (filter.updatedDays.length || filter.updatedBounds.length) {
      const on = [
        ...(filter.updatedDays.length ? [`(${filter.updatedDays.map((day) => localDay('"u"."utcCreatedDateTime"', day)).join(' OR ')})`] : []),
        ...filter.updatedBounds.map(({ op, day }) => `"u"."utcCreatedDateTime" ${op} ${add(new Date(dayStartIn(resolveDay(day), zone)))}`),
      ];
      where.push(`EXISTS (SELECT 1 FROM "PinUpdate" AS "u" WHERE "u"."pinId" = "Pin"."id" AND ${on.join(' AND ')})`);
    }
    return where;
  };
  const groups = (filter.alternatives?.length ?? 0) > 1 ? filter.alternatives!.map(labelWhere) : null;
  if (groups) where.push(`(${groups.map((g) => `(${g.length ? g.join(' AND ') : 'TRUE'})`).join(' OR ')})`);
  else where.push(...labelWhere(filter));
  // The Watch search choice: pins this user watches, and (unless predicted
  // pins are turned off) predicted pins of any company this user follows.
  if (filter.favoriteUserId != null) {
    const user = add(filter.favoriteUserId);
    where.push(`"Pin"."id" IN (${watchedPinIdsOf(user, filter.excludePredicted)})`);
    if (filter.excludePredicted) {
      where.push(`NOT ${predictedPinOf('Pin')}`);
    }
  }
  if (filter.createdSince) {
    where.push(`"Pin"."utcCreatedDateTime" >= ${add(filter.createdSince)}`);
  }
  if (filter.startFrom) {
    where.push(`"Pin"."utcStartDateTime" >= ${add(filter.startFrom)}`);
  }
  if (filter.startTo) {
    where.push(`"Pin"."utcStartDateTime" <= ${add(filter.startTo)}`);
  }
  if (filter.hasLocation) {
    where.push(`"Pin"."location" IS NOT NULL`);
  }

  return {
    ctes,
    from: ['FROM "Pin"', ...joins].join('\n      '),
    where,
    params,
    score,
  };
}

// A WITH clause naming searchClauses' subqueries and then the caller's own.
export function withCtes(...ctes: string[]): string {
  return ctes.length ? `WITH ${ctes.join(',\n      ')}` : '';
}
