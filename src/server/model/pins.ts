import _ from 'lodash';
import { TIMELINE_MIN_CONFIDENCE } from '@/lib/referenceConfidence';
import * as db from '../db';
import type { Row } from '../db';
import BasePins from './basePins';
import Pin from './pin';

export type PinSearchFilters = { userNames: string[]; companies: string[]; categories: string[] };

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

  static queryForwardByDate(fromDateTime: Date | string, userId: number, lastPinId: number, pageSize: number, createdSince?: Date | null) {
    return queryPage(true, false, fromDateTime, userId, lastPinId, pageSize, createdSince).then((res) => new Pins(res));
  }

  static queryBackwardByDate(fromDateTime: Date | string, userId: number, lastPinId: number, pageSize: number, createdSince?: Date | null) {
    return queryPage(false, false, fromDateTime, userId, lastPinId, pageSize, createdSince).then((res) => new Pins(res));
  }

  static queryInitialByDate(fromDateTime: Date, userId: number, pageSizePrev: number, pageSizeNext: number, createdSince?: Date | null) {
    return queryInitialPage(false, fromDateTime, userId, pageSizePrev, pageSizeNext, createdSince).then((res) => new Pins(res));
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
    return queryPinByIds(pins.getAllIds(), null).then((res) => new Pins(res));
  }

  static queryPinByIdsFilterByHasFavorite(pins: BasePins, userId: number) {
    return queryPinByIds(pins.getAllIds(), userId).then((res) => new Pins(res));
  }

  static getThreadPins(pinId: number) {
    return queryPinByIdsAndOrderedByThread(pinId).then((res) => new Pins().setPinsSortBy(res.pins, 'reverseOrder', true));
  }

  // favoriteUserId limits the results to pins that user watches; leave it
  // out to search every pin.
  static queryPinBySearchFilters(query: PinSearchFilters, favoriteUserId?: number | null) {
    return queryPinBySearchFilters(query, favoriteUserId).then((res) => new Pins(res));
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
  static async countTimelineByCategory(createdSince?: Date | null) {
    return db.query<{ category: string | null; count: number }>(
      `
      SELECT lower("category") AS "category", COUNT(DISTINCT "id")::integer AS "count"
      FROM "PinBaseView"
      WHERE "utcDeletedDateTime" IS NULL
        AND ($1::timestamptz IS NULL OR "utcCreatedDateTime" >= $1)
        AND COALESCE("pinConfidence"("references", "sourceUrl", "dateConfidence", "utcCreatedDateTime"),
                     ${TIMELINE_MIN_CONFIDENCE}) >= ${TIMELINE_MIN_CONFIDENCE}
      GROUP BY 1`,
      [createdSince || null],
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
  "Pin"."allDay",
  "Pin"."userId",
  "Pin"."utcCreatedDateTime",
  "Pin"."utcUpdatedDateTime",
  "Pin"."favoriteCount",
  "Pin"."likeCount",
  "Pin"."rootThread",
  "Pin"."references",
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
// leaves out pins scored below TIMELINE_MIN_CONFIDENCE, filtered here rather
// than after the query so pages stay full; a watched list keeps every pin.
function queryPage(
  queryForward: boolean,
  onlyFavorites: boolean,
  fromDateTime: Date | string,
  userId: number,
  lastPinId: number,
  pageSize: number,
  createdSince?: Date | null,
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
      ${
        onlyFavorites
          ? ''
          : `AND COALESCE("pinConfidence"("Pin"."references", "Pin"."sourceUrl", "Pin"."dateConfidence", "Pin"."utcCreatedDateTime"),
                      ${TIMELINE_MIN_CONFIDENCE}) >= ${TIMELINE_MIN_CONFIDENCE}`
      }
    ORDER BY "Pin"."utcStartDateTime" ${direction}, "Pin"."id" ${direction},
      "Pin"."Media.id" ${direction}, "Pin"."Merchant.id" ${direction}
    LIMIT $5`,
      [userId, fromDateTime, lastPinId, createdSince || null, pageSize],
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
): Promise<PageResult> {
  const [prev, next] = await Promise.all([
    queryPage(false, onlyFavorites, fromDateTime, userId, 0, pageSizePrev, createdSince),
    queryPage(true, onlyFavorites, fromDateTime, userId, 0, pageSizeNext, createdSince),
  ]);
  return {
    pins: prev.pins.reverse().concat(next.pins),
    queryCount: prev.queryCount + next.queryCount,
  };
}

// favoriteUserId, when given, keeps only pins that user watches.
function queryPinByIds(ids: number[], favoriteUserId: number | null): Promise<PageResult> {
  return db
    .query(
      `
    SELECT "Pin".*
    FROM "PinBaseView" AS "Pin"
    WHERE "Pin"."id" = ANY($1::integer[])
      AND "Pin"."utcDeletedDateTime" IS NULL
      AND ($2::integer IS NULL OR EXISTS (
        SELECT 1 FROM "Favorite" AS "Favorites"
        WHERE "Favorites"."pinId" = "Pin"."id"
          AND "Favorites"."utcDeletedDateTime" IS NULL
          AND "Favorites"."userId" = $2))
    ORDER BY "Pin"."utcStartDateTime", "Pin"."id", "Pin"."Media.id", "Pin"."Merchant.id"`,
      [ids, favoriteUserId == null ? null : favoriteUserId],
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

// A search made only of label terms. Each list widens its own field (any of
// these companies) and an empty list leaves that field unfiltered; the fields
// narrow each other. citext columns make the matches case-insensitive.
function queryPinBySearchFilters(query: PinSearchFilters, favoriteUserId?: number | null): Promise<PageResult> {
  return db
    .query(
      `
    SELECT "Pin".*
    FROM "PinBaseView" AS "Pin"
    WHERE "Pin"."utcDeletedDateTime" IS NULL
      AND (cardinality($1::citext[]) = 0 OR "Pin"."User.userName" = ANY($1::citext[]))
      AND (cardinality($2::citext[]) = 0 OR "Pin"."company" = ANY($2::citext[]))
      AND (cardinality($3::citext[]) = 0 OR "Pin"."category" = ANY($3::citext[]))
      -- The Watch search choice: only pins this user watches.
      AND ($4::integer IS NULL OR EXISTS (
        SELECT 1
        FROM "Favorite" AS "Favorites"
        WHERE "Favorites"."pinId" = "Pin"."id"
          AND "Favorites"."utcDeletedDateTime" IS NULL
          AND "Favorites"."userId" = $4))
    ORDER BY "Pin"."utcStartDateTime", "Pin"."id", "Pin"."Media.id", "Pin"."Merchant.id"`,
      [query.userNames, query.companies, query.categories, favoriteUserId == null ? null : favoriteUserId],
    )
    .then(result);
}
