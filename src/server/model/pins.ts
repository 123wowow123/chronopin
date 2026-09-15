import _ from 'lodash';
import * as db from '../db';
import type { Row } from '../db';
import BasePins from './basePins';
import Pin from './pin';

export type PinSearchFilters = { userNames: string[]; companies: string[]; categories: string[]; confidences: string[] };

// Everything a search narrows pins to. hits are a free-text search's matches
// with their scores (null when the search has no free text).
export type SearchFilter = PinSearchFilters & {
  hits: { id: number; score: number }[] | null;
  favoriteUserId?: number | null;
  createdSince?: Date | null;
  startFrom?: Date | null;
  startTo?: Date | null;
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

  static queryInitialByDate(fromDateTime: Date, userId: number, pageSizePrev: number, pageSizeNext: number, createdSince: Date | null | undefined, minConfidence: number | null) {
    return queryInitialPage(false, fromDateTime, userId, pageSizePrev, pageSizeNext, createdSince, minConfidence).then((res) => new Pins(res));
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

  static getThreadPins(pinId: number) {
    return queryPinByIdsAndOrderedByThread(pinId).then((res) => new Pins().setPinsSortBy(res.pins, 'reverseOrder', true));
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
  // author, for the admin statistics on what the timeline hides.
  static async listConfidence() {
    return db.query<{ id: number; category: string | null; userName: string | null; utcCreatedDateTime: Date; confidence: number | null }>(
      `
      SELECT DISTINCT ON ("id") "id", "category", "User.userName" AS "userName", "utcCreatedDateTime",
        "pinConfidence"("references", "sourceUrl", "dateConfidence", "utcCreatedDateTime") AS "confidence"
      FROM "PinBaseView"
      WHERE "utcDeletedDateTime" IS NULL
      ORDER BY "id"`,
    );
  }

  // Pins per lowercased category across the whole timeline: the same pins
  // its pages walk (live, confident enough, created since the cutoff).
  static async countTimelineByCategory(createdSince: Date | null | undefined, minConfidence: number | null) {
    return db.query<{ category: string | null; count: number }>(
      `
      SELECT lower("category") AS "category", COUNT(DISTINCT "id")::integer AS "count"
      FROM "PinBaseView"
      WHERE "utcDeletedDateTime" IS NULL
        AND ($1::timestamptz IS NULL OR "utcCreatedDateTime" >= $1)
        AND ($2::integer IS NULL
          OR COALESCE("pinConfidence"("references", "sourceUrl", "dateConfidence", "utcCreatedDateTime"), $2) >= $2)
      GROUP BY 1`,
      [createdSince || null, minConfidence],
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

// The columns a timeline page returns. Deliberately narrower than "Pin".*:
// no longFormSummary (detail page only) and no utcDeletedDateTime (always
// null here). "Media.type" is an integer on this path, as it always has been.
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
  "Pin"."references",
  "Pin"."viewCount",
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
// (fromDateTime, lastPinId). Rows are the view's pin x medium x merchant rows,
// so pageSize counts rows, not pins - as it always has. The whole timeline
// leaves out pins scored below minConfidence (the admin setting; null shows
// every pin), filtered here rather than after the query so pages stay full; a
// watched list keeps every pin.
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
    ${
      onlyFavorites
        ? `
      INNER JOIN "Favorite" AS "Favorites"
        ON "Pin"."id" = "Favorites"."pinId" AND "Favorites"."utcDeletedDateTime" IS NULL AND "Favorites"."userId" = $1`
        : ''
    }
    WHERE ("Pin"."utcStartDateTime" ${after} $2
        OR ("Pin"."utcStartDateTime" = $2 AND "Pin"."id" ${after} $3))
      AND "Pin"."utcDeletedDateTime" IS NULL
      AND ($4::timestamptz IS NULL OR "Pin"."utcCreatedDateTime" >= $4)
      AND ($6::integer IS NULL
        OR COALESCE("pinConfidence"("Pin"."references", "Pin"."sourceUrl", "Pin"."dateConfidence", "Pin"."utcCreatedDateTime"), $6) >= $6)
    ORDER BY "Pin"."utcStartDateTime" ${direction}, "Pin"."id" ${direction},
      "Pin"."Media.id" ${direction}, "Pin"."Merchant.id" ${direction}
    LIMIT $5`,
      [userId, fromDateTime, lastPinId, createdSince || null, pageSize, onlyFavorites ? null : minConfidence],
    )
    .then(result);
}

// The first page: the pageSizePrev rows before fromDateTime and the
// pageSizeNext rows from it on, oldest first.
async function queryInitialPage(
  onlyFavorites: boolean,
  fromDateTime: Date,
  userId: number,
  pageSizePrev: number,
  pageSizeNext: number,
  createdSince?: Date | null,
  minConfidence: number | null = null,
): Promise<PageResult> {
  const [prev, next] = await Promise.all([
    queryPage(false, onlyFavorites, fromDateTime, userId, 0, pageSizePrev, createdSince, minConfidence),
    queryPage(true, onlyFavorites, fromDateTime, userId, 0, pageSizeNext, createdSince, minConfidence),
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

// Every pin in the thread around pinId: its ancestors (reverseOrder 1, 2...
// walking up) and the same author's replies below it (-1, -2...), with pinId
// itself at 0.
function queryPinByIdsAndOrderedByThread(pinId: number): Promise<{ pins: Row[] }> {
  return db
    .query(
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
      ),
      "thread" AS (
        SELECT * FROM "previous"
        UNION
        SELECT * FROM "next"
      )
    SELECT "Pin".*, "thread"."reverseOrder"
    FROM "PinBaseView" AS "Pin"
      JOIN "thread" ON "Pin"."id" = "thread"."id"
    WHERE "Pin"."utcDeletedDateTime" IS NULL`,
      [pinId],
    )
    .then((rows) => ({ pins: rows }));
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
