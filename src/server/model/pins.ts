import _ from 'lodash';
import * as db from '../db';
import type { Row } from '../db';
import BasePins from './basePins';
import Pin from './pin';
import { dayKeyToMs, dayStartIn, nextDayKey } from '@/lib/format';

export type PinSearchFilters = { userNames: string[]; companies: string[]; categories: string[]; confidences: string[]; dates: string[]; postedDays: string[] };

// Everything a search narrows pins to. hits are a free-text search's matches
// with their scores (null when the search has no free text).
export type SearchFilter = PinSearchFilters & {
  hits: { id: number; score: number }[] | null;
  favoriteUserId?: number | null;
  createdSince?: Date | null;
  startFrom?: Date | null;
  startTo?: Date | null;
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
  static queryForwardByDate(fromDateTime: Date | string, userId: number, lastPinId: number, pageSize: number, createdSince: Date | null | undefined, minConfidence: number | null) {
    return queryPage(true, false, fromDateTime, userId, lastPinId, pageSize, createdSince, minConfidence).then((res) => new Pins(res));
  }

  static queryBackwardByDate(fromDateTime: Date | string, userId: number, lastPinId: number, pageSize: number, createdSince: Date | null | undefined, minConfidence: number | null) {
    return queryPage(false, false, fromDateTime, userId, lastPinId, pageSize, createdSince, minConfidence).then((res) => new Pins(res));
  }

  // aroundPinId splits the page at that pin (starting at fromDateTime) rather
  // than at the instant, so it is on the page however many pins share its start.
  static queryInitialByDate(fromDateTime: Date, userId: number, pageSizePrev: number, pageSizeNext: number, createdSince: Date | null | undefined, minConfidence: number | null, aroundPinId = 0) {
    return queryInitialPage(false, fromDateTime, userId, pageSizePrev, pageSizeNext, createdSince, minConfidence, aroundPinId).then((res) => new Pins(res));
  }

  // Every pin starting in [start, end), oldest first, at most limit of them:
  // a crowded day's "View all" popup. Filtered as the timeline is.
  static queryBetween(start: Date, end: Date, userId: number, limit: number, createdSince: Date | null | undefined, minConfidence: number | null) {
    return queryBetween(start, end, userId, limit, createdSince, minConfidence).then((res) => new Pins(res));
  }

  // Just the start of every pin in [start, end), filtered as the timeline
  // is: enough to tell which day each falls on, to count a day's pins.
  static listStartsBetween(start: Date, end: Date, createdSince: Date | null | undefined, minConfidence: number | null) {
    return db.query<{ utcStartDateTime: Date; allDay: boolean }>(
      `
      SELECT "p"."utcStartDateTime", "p"."allDay"
      FROM "Pin" AS "p"
      WHERE "p"."utcStartDateTime" >= $1::timestamptz AND "p"."utcStartDateTime" < $2::timestamptz
        AND "p"."utcDeletedDateTime" IS NULL
        AND ($3::timestamptz IS NULL OR "p"."utcCreatedDateTime" >= $3)
        AND ($4::integer IS NULL OR COALESCE(${pinConfidenceOf('p')}, $4) >= $4)`,
      [start, end, createdSince || null, minConfidence],
    );
  }

  static queryForwardByDateFilterByHasFavorite(fromDateTime: Date | string, userId: number, lastPinId: number, pageSize: number, createdSince?: Date | null) {
    return queryPage(true, true, fromDateTime, userId, lastPinId, pageSize, createdSince).then((res) => new Pins(res));
  }

  static queryBackwardByDateFilterByHasFavorite(fromDateTime: Date | string, userId: number, lastPinId: number, pageSize: number, createdSince?: Date | null) {
    return queryPage(false, true, fromDateTime, userId, lastPinId, pageSize, createdSince).then((res) => new Pins(res));
  }

  static queryInitialByDateFilterByHasFavorite(fromDateTime: Date, userId: number, pageSizePrev: number, pageSizeNext: number, createdSince?: Date | null) {
    return queryInitialPage(true, fromDateTime, userId, pageSizePrev, pageSizeNext, createdSince).then((res) => new Pins(res));
  }

  static queryPinByIds(pins: BasePins) {
    return queryPinByIds(pins.getAllIds()).then((res) => new Pins(res));
  }

  static queryByIds(ids: number[]) {
    return queryPinByIds(ids).then((res) => new Pins(res));
  }

  // The thread around a pin, its own place in it first. Two steps, as a page
  // and a search take: the thread is walked on "Pin", then those pins are read
  // out of the view by id. Joining the view to the walk instead left Postgres
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
      FROM "PinBaseView" AS "Pin"
      WHERE "Pin"."id" = ANY($1::integer[])
        AND "Pin"."utcDeletedDateTime" IS NULL
      ORDER BY "Pin"."id", "Pin"."Media.id", "Pin"."Merchant.id"`,
      [order.map((o) => o.id)],
    );
    const place = new Map(order.map((o) => [o.id, o.reverseOrder]));
    rows.forEach((row) => {
      row.reverseOrder = place.get(row.id);
    });
    return new Pins().setPinsSortBy(rows, 'reverseOrder', true);
  }

  // The search results after `order`'s cursor, best first (or in date order
  // the way it walks), at most limit pins - every one when limit is null.
  // Only ids and sort keys: querySearchRanked loads the pins themselves.
  static rankSearch(filter: SearchFilter, order: SearchOrder, limit: number | null): Promise<SearchRank[]> {
    const { from, where, params, score } = searchClauses(filter);
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
      FROM "PinBaseView" AS "Pin"
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

  // Search results per lowercased category.
  static async countSearchByCategory(filter: SearchFilter) {
    const { from, where, params } = searchClauses(filter);
    return db.query<{ category: string | null; count: number }>(
      `
      SELECT lower("Pin"."category") AS "category", COUNT(*)::integer AS "count"
      ${from}
      WHERE ${where.join('\n        AND ')}
      GROUP BY 1`,
      params,
    );
  }

  // Every live pin's id and last change, oldest first, for the sitemap.
  static async listForSitemap(offset: number, limit: number) {
    return db.query<{ id: number; title: string; lastModified: Date }>(
      `
      SELECT "id", "title", COALESCE("utcUpdatedDateTime", "utcCreatedDateTime") AS "lastModified"
      FROM "Pin"
      WHERE "utcDeletedDateTime" IS NULL
      ORDER BY "id"
      OFFSET $1 LIMIT $2`,
      [offset, limit],
    );
  }

  // Every live pin's confidence (null when unscored) with its category and
  // author, for the admin statistics on what the timeline hides. Read off
  // "Pin" rather than the view, which had to be deduplicated with a DISTINCT
  // ON after multiplying each pin by its media and merchants.
  static async listConfidence() {
    return db.query<{ id: number; category: string | null; userName: string | null; utcCreatedDateTime: Date; confidence: number | null }>(
      `
      SELECT "p"."id", "p"."category", "User"."userName" AS "userName", "p"."utcCreatedDateTime",
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
    return db.query<{ id: number; title: string; userName: string | null; utcCreatedDateTime: Date; sourceUrl: string | null; referenceUrls: string[] }>(
      `
      SELECT "p"."id", "p"."title", "User"."userName" AS "userName", "p"."utcCreatedDateTime", "p"."sourceUrl",
        ARRAY(SELECT "r"."url" FROM "PinReference" AS "r" WHERE "r"."pinId" = "p"."id") AS "referenceUrls"
      FROM "Pin" AS "p"
        LEFT JOIN "User" ON "User"."id" = "p"."userId"
      WHERE "p"."utcDeletedDateTime" IS NULL
        AND ($2::integer IS NULL OR COALESCE(${pinConfidenceOf('p')}, $2) >= $2)
      ORDER BY "p"."utcCreatedDateTime" DESC, "p"."id" DESC
      LIMIT $1`,
      [limit, minConfidence],
    );
  }

  // Pins per lowercased category across the whole timeline: the same pins
  // its pages walk (live, confident enough, created since the cutoff).
  // Counted on "Pin" rather than the view, which multiplies each pin by its
  // media and merchants only for the COUNT(DISTINCT) to undo it, and builds
  // every pin's references, ratings, views and duplicate group on the way.
  static async countTimelineByCategory(createdSince: Date | null | undefined, minConfidence: number | null) {
    return db.query<{ category: string | null; count: number }>(
      `
      SELECT lower("p"."category") AS "category", COUNT(*)::integer AS "count"
      FROM "Pin" AS "p"
      WHERE "p"."utcDeletedDateTime" IS NULL
        AND ($1::timestamptz IS NULL OR "p"."utcCreatedDateTime" >= $1)
        AND ($2::integer IS NULL OR COALESCE(${pinConfidenceOf('p')}, $2) >= $2)
      GROUP BY 1`,
      [createdSince || null, minConfidence],
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
  }): Promise<Row[]> {
    return db.query(
      `
      SELECT "p"."id", "p"."title", "p"."address", "p"."category", "p"."allDay",
        "p"."utcStartDateTime", "p"."utcCreatedDateTime",
        ST_Y("p"."location"::geometry) AS "latitude",
        ST_X("p"."location"::geometry) AS "longitude",
        ${MAP_MEDIA} AS "media"
      FROM "Pin" AS "p"
      WHERE "p"."location" IS NOT NULL
        AND "p"."utcDeletedDateTime" IS NULL
        AND ($1::timestamptz IS NULL OR "p"."utcStartDateTime" >= $1)
        AND ($2::timestamptz IS NULL OR "p"."utcStartDateTime" <= $2)
        AND ($3::timestamptz IS NULL OR "p"."utcCreatedDateTime" >= $3)
        AND ($4::integer IS NULL OR COALESCE(${pinConfidenceOf('p')}, $4) >= $4)
        AND ($5::integer IS NULL OR EXISTS (
          SELECT 1 FROM "Favorite" AS "f"
          WHERE "f"."pinId" = "p"."id" AND "f"."userId" = $5 AND "f"."utcDeletedDateTime" IS NULL))
      ORDER BY "p"."utcStartDateTime", "p"."id"`,
      [bounds.from, bounds.to, bounds.createdSince, bounds.minConfidence, bounds.favoriteUserId],
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

// A marker's media, lowest id first, the order the view hands them over in.
// A popup shows one picture - a video's still if the pin has one, else its
// first medium - so only what picking and drawing that needs is sent.
const MAP_MEDIA = `
  (SELECT COALESCE(json_agg(json_build_object(
            'type', "m"."type",
            'thumbName', "m"."thumbName",
            'originalUrl', "m"."originalUrl"
          ) ORDER BY "m"."id"), '[]'::json)
   FROM "PinMedium" AS "pm"
     JOIN "Medium" AS "m" ON "m"."id" = "pm"."mediumId"
   WHERE "pm"."pinId" = "p"."id" AND "pm"."utcDeletedDateTime" IS NULL)`;

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

// A pin's confidence scored straight off "PinReference", for the queries that
// filter by it before the view is involved. Spelled out here rather than
// wrapped in a SQL function of its own: a function whose body calls
// "pinConfidence" cannot be inlined, and the planner then scores every
// candidate row instead of stopping once a page is full - three times the
// cost of this on a page, five times on a whole-table count.
export const pinConfidenceOf = (as: string) =>
  `"pinConfidence"(${leanReferences(as)}, "${as}"."sourceUrl", "${as}"."dateConfidence", "${as}"."utcCreatedDateTime")`;

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
  "Pin"."category",
  "Pin"."utcStartDateTime",
  "Pin"."utcEndDateTime",
  "Pin"."sourceStartDateTime",
  "Pin"."sourceEndDateTime",
  "Pin"."allDay",
  "Pin"."userId",
  "Pin"."utcCreatedDateTime",
  "Pin"."utcUpdatedDateTime",
  "Pin"."favoriteCount",
  "Pin"."likeCount",
  "Pin"."rootThread",
  ${leanReferences('Pin')} AS "references",
  "Pin"."ratings",
  "Pin"."stocks",
  "Pin"."viewCount",
  (SELECT COUNT(*)::integer FROM "PinImpression" AS "i" WHERE "i"."pinId" = "Pin"."id") AS "impressionCount",
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
): Promise<PageResult> {
  const after = queryForward ? '>' : '<';
  const direction = queryForward ? 'ASC' : 'DESC';
  return db
    .query(
      `
    SELECT ${PAGE_COLUMNS}
    FROM "PinBaseView" AS "Pin"
    WHERE "Pin"."id" = ANY(ARRAY(
      SELECT "p"."id"
      FROM "Pin" AS "p"
      ${
        onlyFavorites
          ? `
        INNER JOIN "Favorite" AS "Favorites"
          ON "p"."id" = "Favorites"."pinId" AND "Favorites"."utcDeletedDateTime" IS NULL AND "Favorites"."userId" = $1`
          : ''
      }
      WHERE ("p"."utcStartDateTime", "p"."id") ${after} ($2::timestamptz, $3::integer)
        AND "p"."utcDeletedDateTime" IS NULL
        AND ($4::timestamptz IS NULL OR "p"."utcCreatedDateTime" >= $4)
        AND ($6::integer IS NULL OR COALESCE(${pinConfidenceOf('p')}, $6) >= $6)
      ORDER BY "p"."utcStartDateTime" ${direction}, "p"."id" ${direction}
      LIMIT $5))
    ORDER BY "Pin"."utcStartDateTime" ${direction}, "Pin"."id" ${direction},
      "Pin"."Media.id" ${direction}, "Pin"."Merchant.id" ${direction}`,
      [userId, fromDateTime, lastPinId, createdSince || null, pageSize, onlyFavorites ? null : minConfidence],
    )
    .then(result);
}

// The pins starting in [start, end), the two steps queryPage takes.
function queryBetween(start: Date, end: Date, userId: number, limit: number, createdSince: Date | null | undefined, minConfidence: number | null): Promise<PageResult> {
  return db
    .query(
      `
    SELECT ${PAGE_COLUMNS}
    FROM "PinBaseView" AS "Pin"
    WHERE "Pin"."id" = ANY(ARRAY(
      SELECT "p"."id"
      FROM "Pin" AS "p"
      WHERE "p"."utcStartDateTime" >= $2::timestamptz AND "p"."utcStartDateTime" < $3::timestamptz
        AND "p"."utcDeletedDateTime" IS NULL
        AND ($4::timestamptz IS NULL OR "p"."utcCreatedDateTime" >= $4)
        AND ($6::integer IS NULL OR COALESCE(${pinConfidenceOf('p')}, $6) >= $6)
      ORDER BY "p"."utcStartDateTime", "p"."id"
      LIMIT $5))
    ORDER BY "Pin"."utcStartDateTime", "Pin"."id", "Pin"."Media.id", "Pin"."Merchant.id"`,
      [userId, start, end, createdSince || null, limit, minConfidence],
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
): Promise<PageResult> {
  const [prev, next] = await Promise.all([
    queryPage(false, onlyFavorites, fromDateTime, userId, aroundPinId, pageSizePrev, createdSince, minConfidence),
    queryPage(true, onlyFavorites, fromDateTime, userId, aroundPinId ? aroundPinId - 1 : 0, pageSizeNext, createdSince, minConfidence),
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
    FROM "PinBaseView" AS "Pin"
    WHERE "Pin"."id" = ANY($1::integer[])
      AND "Pin"."utcDeletedDateTime" IS NULL
    ORDER BY "Pin"."utcStartDateTime", "Pin"."id", "Pin"."Media.id", "Pin"."Merchant.id"`,
      [ids],
    )
    .then(result);
}

// Every pin in the thread around pinId with its place in it: the pin's
// ancestors (reverseOrder 1, 2... walking up) and the same author's replies
// below it (-1, -2...), with pinId itself at 0. Ids and places only;
// getThreadPins reads the pins themselves.
function queryThreadOrder(pinId: number): Promise<{ id: number; reverseOrder: number }[]> {
  return db.query<{ id: number; reverseOrder: number }>(
    `
    WITH RECURSIVE
      "previous" ("id", "parentId", "userId", "reverseOrder") AS (
          SELECT "id", "parentId", "userId", 0
          FROM "Pin"
          WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL
        UNION ALL
          SELECT "Pin"."id", "Pin"."parentId", "Pin"."userId", "previous"."reverseOrder" + 1
          FROM "Pin"
            JOIN "previous" ON "Pin"."id" = "previous"."parentId"
          WHERE "Pin"."utcDeletedDateTime" IS NULL
      ),
      "next" ("id", "parentId", "userId", "reverseOrder") AS (
          SELECT "id", "parentId", "userId", 0
          FROM "Pin"
          WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL
        UNION ALL
          SELECT "Pin"."id", "Pin"."parentId", "Pin"."userId", "next"."reverseOrder" - 1
          FROM "Pin"
            JOIN "next" ON "Pin"."parentId" = "next"."id"
          WHERE "Pin"."utcDeletedDateTime" IS NULL
            AND "next"."userId" = "Pin"."userId"
      )
    SELECT "id", "reverseOrder" FROM "previous"
    UNION
    SELECT "id", "reverseOrder" FROM "next"`,
    [pinId],
  );
}

// The FROM and WHERE a search's filter makes, on the Pin table itself rather
// than the view, so a page counts pins instead of pin x medium x merchant rows.
// Each label list widens its own field (any of these companies) and an empty
// list leaves it unfiltered; the fields narrow each other. citext columns make
// the matches case-insensitive. With free-text hits, only those pins are
// candidates and each scores as the search service said; without, every pin
// scores 1.
function searchClauses(filter: SearchFilter) {
  const params: unknown[] = [];
  const add = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };
  const joins: string[] = [];
  const where = ['"Pin"."utcDeletedDateTime" IS NULL'];

  if (filter.hits) {
    joins.push(
      `INNER JOIN unnest(${add(filter.hits.map((h) => h.id))}::integer[], ${add(filter.hits.map((h) => h.score))}::float8[]) AS "hit" ("id", "score") ON "hit"."id" = "Pin"."id"`,
    );
  }
  if (filter.userNames.length) {
    joins.push('INNER JOIN "User" ON "User"."id" = "Pin"."userId"');
    where.push(`"User"."userName" = ANY(${add(filter.userNames)}::citext[])`);
  }
  if (filter.companies.length) {
    joins.push('INNER JOIN "Company" ON "Company"."id" = "Pin"."companyId"');
    where.push(`"Company"."name" = ANY(${add(filter.companies)}::citext[])`);
  }
  if (filter.categories.length) {
    where.push(`"Pin"."category" = ANY(${add(filter.categories)}::citext[])`);
  }
  if (filter.confidences.length) {
    where.push(`"Pin"."dateConfidence"::citext = ANY(${add(filter.confidences)}::citext[])`);
  }
  // Days as instant ranges, so the start and created indexes serve them (and
  // BC days need no date arithmetic in SQL). A date: day is the timeline's:
  // an all-day pin on its UTC date, a timed one on its date in the zone.
  const zone = filter.timeZone || 'UTC';
  const between = (column: string, from: number, to: number) => `(${column} >= ${add(new Date(from))} AND ${column} < ${add(new Date(to))})`;
  const localDay = (column: string, day: string) => between(column, dayStartIn(day, zone), dayStartIn(nextDayKey(day), zone));
  if (filter.dates.length) {
    const days = filter.dates.map((day) => {
      const utc = between('"Pin"."utcStartDateTime"', dayKeyToMs(day), dayKeyToMs(nextDayKey(day)));
      return `(("Pin"."allDay" AND ${utc}) OR (NOT "Pin"."allDay" AND ${localDay('"Pin"."utcStartDateTime"', day)}))`;
    });
    where.push(`(${days.join(' OR ')})`);
  }
  if (filter.postedDays.length) {
    where.push(`(${filter.postedDays.map((day) => localDay('"Pin"."utcCreatedDateTime"', day)).join(' OR ')})`);
  }
  // The Watch search choice: only pins this user watches.
  if (filter.favoriteUserId != null) {
    where.push(`EXISTS (
          SELECT 1 FROM "Favorite" AS "Favorites"
          WHERE "Favorites"."pinId" = "Pin"."id"
            AND "Favorites"."utcDeletedDateTime" IS NULL
            AND "Favorites"."userId" = ${add(filter.favoriteUserId)})`);
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

  return {
    from: ['FROM "Pin"', ...joins].join('\n      '),
    where,
    params,
    score: filter.hits ? '"hit"."score"' : '1::float8',
  };
}
