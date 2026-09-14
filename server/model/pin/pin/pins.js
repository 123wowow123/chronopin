/*jshint eqnull:true */

'use strict';

import * as db from '../../../db';
import * as _ from 'lodash';

import {
  BasePins,
  Pin
} from '../..';

export default class Pins extends BasePins {
  // Properties
  // this.pins
  // this.queryCount

  constructor(pins) {
    super(pins);
  }

  setPins(pins) {
    if (Array.isArray(pins)) {
      this.pins = Pins.mapPinJoins(pins);

      // need to sort properly
      this.pins = _.chain(this.pins)
        .sortBy('id')
        .sortBy('utcStartDateTime')
        .value();

    } else {
      throw "arg is not an array";
    }
    return this;
  }

  setPinsSortBy(pins, sortId, reverse) {
    if (Array.isArray(pins)) {
      this.pins = Pins.mapPinJoins(pins, sortId, reverse);
    } else {
      throw "arg is not an array";
    }
    return this;
  }

  static mapPinJoins(pinRows, sortId, reverse) {
    let pins = [],
      groupedPinRows;

    groupedPinRows = _.groupBy(pinRows, row => {
      return row.id;
    });

    _.forEach(groupedPinRows, pinRows => {
      let pin = new Pin(pinRows[0]);
      pin = Pin.mapPinJoins(pin, pinRows);
      pins.push(pin);
    });

    if (sortId) {
      pins = _.chain(pins)
        .sortBy(sortId)
        .value();
    } else {
      // need to sort properly
      pins = _.chain(pins)
        .sortBy('id')
        .sortBy('utcStartDateTime')
        .value();
    }

    return reverse ? pins.reverse() : pins;
  }

  static queryForwardByDate(fromDateTime, userId, lastPinId, pageSize, createdSinceDateTime) {
    return _queryPage(true, false, fromDateTime, userId, lastPinId, pageSize, createdSinceDateTime)
      .then(res => {
        return new Pins(res);
      });
  }

  static queryBackwardByDate(fromDateTime, userId, lastPinId, pageSize, createdSinceDateTime) {
    return _queryPage(false, false, fromDateTime, userId, lastPinId, pageSize, createdSinceDateTime)
      .then(res => {
        return new Pins(res);
      });
  }

  static queryInitialByDate(fromDateTime, userId, pageSizePrev, pageSizeNext, createdSinceDateTime) {
    return _queryInitialPage(false, fromDateTime, userId, pageSizePrev, pageSizeNext, createdSinceDateTime)
      .then(res => {
        return new Pins(res);
      });
  }

  static queryForwardByDateFilterByHasFavorite(fromDateTime, userId, lastPinId, pageSize, createdSinceDateTime) {
    return _queryPage(true, true, fromDateTime, userId, lastPinId, pageSize, createdSinceDateTime)
      .then(res => {
        return new Pins(res);
      });
  }

  static queryBackwardByDateFilterByHasFavorite(fromDateTime, userId, lastPinId, pageSize, createdSinceDateTime) {
    return _queryPage(false, true, fromDateTime, userId, lastPinId, pageSize, createdSinceDateTime)
      .then(res => {
        return new Pins(res);
      });
  }

  static queryInitialByDateFilterByHasFavorite(fromDateTime, userId, pageSizePrev, pageSizeNext, createdSinceDateTime) {
    return _queryInitialPage(true, fromDateTime, userId, pageSizePrev, pageSizeNext, createdSinceDateTime)
      .then(res => {
        return new Pins(res);
      });
  }

  static queryPinByIds(pins) {
    return _queryPinByIds(pins.getAllIds(), null)
      .then(res => {
        return new Pins(res);
      });
  }

  static queryPinByIdsFilterByHasFavorite(pins, userId) {
    return _queryPinByIds(pins.getAllIds(), userId)
      .then(res => {
        return new Pins(res);
      });
  }

  static getThreadPins(pinId) {
    return _queryPinByIdsAndOrderedByThread(pinId)
      .then(res => {
        return new Pins().setPinsSortBy(res.pins, 'reverseOrder', true);
      });
  }

  // favoriteUserId limits the results to pins that user watches; leave it
  // out to search every pin.
  static queryPinBySearchFilters(query, favoriteUserId) {
    return _queryPinBySearchFilters(query, favoriteUserId)
      .then(res => {
        return new Pins(res);
      });
  }

}

function _result(rows) {
  return {
    pins: rows,
    queryCount: rows.length
  };
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
// so pageSize counts rows, not pins - as it always has.
function _queryPage(queryForward, onlyFavorites, fromDateTime, userId, lastPinId, pageSize, createdSinceDateTime) {
  const after = queryForward ? '>' : '<';
  const direction = queryForward ? 'ASC' : 'DESC';
  return db.query(`
    SELECT ${PAGE_COLUMNS}
    FROM "PinBaseView" AS "Pin"
    ${onlyFavorites ? `
      INNER JOIN "Favorite" AS "Favorites"
        ON "Pin"."id" = "Favorites"."pinId" AND "Favorites"."utcDeletedDateTime" IS NULL AND "Favorites"."userId" = $1` : ''}
    WHERE ("Pin"."utcStartDateTime" ${after} $2
        OR ("Pin"."utcStartDateTime" = $2 AND "Pin"."id" ${after} $3))
      AND "Pin"."utcDeletedDateTime" IS NULL
      AND ($4::timestamptz IS NULL OR "Pin"."utcCreatedDateTime" >= $4)
    ORDER BY "Pin"."utcStartDateTime" ${direction}, "Pin"."id" ${direction},
      "Pin"."Media.id" ${direction}, "Pin"."Merchant.id" ${direction}
    LIMIT $5`,
    [userId, fromDateTime, lastPinId, createdSinceDateTime || null, pageSize])
    .then(_result);
}

// The first page: the pageSizePrev rows before fromDateTime and the
// pageSizeNext rows from it on, oldest first.
function _queryInitialPage(onlyFavorites, fromDateTime, userId, pageSizePrev, pageSizeNext, createdSinceDateTime) {
  return Promise.all([
    _queryPage(false, onlyFavorites, fromDateTime, userId, 0, pageSizePrev, createdSinceDateTime),
    _queryPage(true, onlyFavorites, fromDateTime, userId, 0, pageSizeNext, createdSinceDateTime)
  ]).then(([prev, next]) => {
    const rows = prev.pins.reverse().concat(next.pins);
    return {
      pins: rows,
      queryCount: prev.queryCount + next.queryCount
    };
  });
}

// favoriteUserId, when given, keeps only pins that user watches.
function _queryPinByIds(ids, favoriteUserId) {
  return db.query(`
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
    [ids, favoriteUserId == null ? null : favoriteUserId])
    .then(_result);
}

// Every pin in the thread around pinId: its ancestors (reverseOrder 1, 2...
// walking up) and the same author's replies below it (-1, -2...), with pinId
// itself at 0.
function _queryPinByIdsAndOrderedByThread(pinId) {
  return db.query(`
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
    [pinId])
    .then(rows => ({ pins: rows }));
}

// A search made only of label terms. Each list widens its own field (any of
// these companies) and an empty list leaves that field unfiltered; the fields
// narrow each other. citext columns make the matches case-insensitive.
function _queryPinBySearchFilters(query, favoriteUserId) {
  return db.query(`
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
    [query.userNames, query.companies, query.categories, favoriteUserId == null ? null : favoriteUserId])
    .then(_result);
}
