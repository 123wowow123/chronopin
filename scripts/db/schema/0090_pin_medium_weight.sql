-- How much a medium counts on its pin. Every medium starts at 1; a reader's
-- "Suggest a correction" that Claude confirms by looking at the picture lowers
-- it (src/server/services/suggestionMedia.ts): halved for a weak picture of
-- the right thing, 0 for one that shows something else. Media sort by weight,
-- then id, so a demoted picture stops leading the pin, and it is dropped (the
-- link's utcDeletedDateTime set, not deleted, so the same picture is not added
-- back) once a better one is found for it.
ALTER TABLE "PinMedium" ADD COLUMN "weight" real NOT NULL DEFAULT 1
  CONSTRAINT "CK_PinMedium_weight" CHECK ("weight" >= 0 AND "weight" <= 1);

-- What a suggestion's review did to the pin's media: the pictures it demoted
-- or dropped (with why) and the ones it added in their place.
ALTER TABLE "AiFeedback" ADD COLUMN "aiMedia" jsonb;

CREATE OR REPLACE VIEW "PinBaseView" AS
SELECT
  "Pin"."id",
  "Pin"."parentId",
  "Pin"."title",
  "Pin"."description",
  "Pin"."sourceUrl",
  "Pin"."longFormSummary",
  "Pin"."address",
  ST_Y("Pin"."location"::geometry)             AS "latitude",
  ST_X("Pin"."location"::geometry)             AS "longitude",
  "Pin"."priceLowerBound",
  "Pin"."priceUpperBound",
  "Pin"."price",
  "Pin"."priceCurrency",
  "Pin"."tip",
  "Pin"."dateConfidence",
  "Pin"."dateConfidenceReasoning",
  "Pin"."companyId",
  "Company"."name"                             AS "company",
  "Company"."wikiUrl"                          AS "companyWikiUrl",
  "Company"."logoUrl"                          AS "companyLogoUrl",
  -- The pin's categories (its category tags, 0043), first given first.
  ARRAY(SELECT "c"."name"::text FROM "PinTag" AS "c"
        WHERE "c"."pinId" = "Pin"."id" AND "c"."kind" = 'category'
        ORDER BY "c"."id")                     AS "categories",
  "Pin"."utcStartDateTime",
  "Pin"."utcEndDateTime",
  "Pin"."allDay",
  "Pin"."userId",
  "Pin"."utcCreatedDateTime",
  "Pin"."utcUpdatedDateTime",
  "Pin"."utcDeletedDateTime",

  COUNT("Favorites"."id")::integer             AS "favoriteCount",
  COUNT("Likes"."id")::integer                 AS "likeCount",
  ("Pin"."parentId" IS NULL AND EXISTS (
    SELECT 1 FROM "Pin" AS "child" WHERE "child"."parentId" = "Pin"."id"
  ))                                           AS "rootThread",

  "Media"."id"                                 AS "Media.id",
  "Media"."thumbName"                          AS "Media.thumbName",
  "Media"."thumbWidth"                         AS "Media.thumbWidth",
  "Media"."thumbHeight"                        AS "Media.thumbHeight",
  "Media"."originalUrl"                        AS "Media.originalUrl",
  "Media"."originalWidth"                      AS "Media.originalWidth",
  "Media"."originalHeight"                     AS "Media.originalHeight",
  "Media"."type"                               AS "Media.type",
  "Media"."authorName"                         AS "Media.authorName",
  "Media"."authorUrl"                          AS "Media.authorUrl",
  "Media"."html"                               AS "Media.html",

  "User"."userName"                            AS "User.userName",

  "Merchant"."id"                              AS "Merchant.id",
  "Merchant"."label"                           AS "Merchant.label",
  "Merchant"."url"                             AS "Merchant.url",
  "Merchant"."price"                           AS "Merchant.price",

  "User"."pictureUrl"                          AS "User.pictureUrl",

  (SELECT COALESCE(json_agg(json_build_object(
            'id', "r"."id",
            'url', "r"."url",
            'title', "r"."title",
            'confidence', "r"."confidence",
            'publishedDate', to_char("r"."publishedDate", 'YYYY-MM-DD'),
            'startDate', to_char("r"."startDate", 'YYYY-MM-DD'),
            'endDate', to_char("r"."endDate", 'YYYY-MM-DD'),
            'reasoning', "r"."reasoning",
            'utcCreatedDateTime', "r"."utcCreatedDateTime",
            'addedByUserId', "r"."addedByUserId",
            'addedByUserName', "addedBy"."userName",
            'addedByUserPictureUrl', "addedBy"."pictureUrl"
          ) ORDER BY "r"."id"), '[]'::json)
   FROM "PinReference" AS "r"
     LEFT JOIN "User" AS "addedBy" ON "addedBy"."id" = "r"."addedByUserId"
   WHERE "r"."pinId" = "Pin"."id")             AS "references",

  "Pin"."sourceStartDateTime",
  "Pin"."sourceEndDateTime",

  (SELECT COUNT(*)::integer FROM "PinView" AS "v"
   WHERE "v"."pinId" = "Pin"."id")             AS "viewCount",
  "pinDuplicateGroup"("Pin"."id")              AS "duplicateGroup",

  (SELECT COALESCE(json_agg(json_build_object(
            'id', "rt"."id",
            'source', "rt"."source",
            'score', "rt"."score",
            'scoreMax', "rt"."scoreMax",
            'url', "rt"."url",
            'utcCreatedDateTime', "rt"."utcCreatedDateTime"
          ) ORDER BY "rt"."id"), '[]'::json)
   FROM "PinRating" AS "rt"
   WHERE "rt"."pinId" = "Pin"."id")             AS "ratings",

  -- The pin's tickers (not the ones taken off), company first,
  -- each with its close on the pin's current start date (null until that
  -- day's market has closed), for the cards' price and move since.
  (SELECT COALESCE(json_agg(json_build_object(
            'symbol', "t"."symbol",
            'name', "t"."name",
            'relation', "t"."relation",
            'assetClass', "t"."assetClass",
            'startPrice', "sp"."price"::float8,
            'startDay', to_char("sp"."day", 'YYYY-MM-DD')
          ) ORDER BY CASE "t"."relation" WHEN 'company' THEN 0 WHEN 'related' THEN 1 ELSE 2 END, "t"."id"), '[]'::json)
   FROM "PinTicker" AS "t"
     LEFT JOIN "PinTickerPrice" AS "sp"
       ON "sp"."pinTickerId" = "t"."id" AND "sp"."kind" = 'start' AND "sp"."utcStartDateTime" = "Pin"."utcStartDateTime"
   WHERE "t"."pinId" = "Pin"."id" AND "t"."utcRemovedDateTime" IS NULL) AS "stocks",

  -- Appended last, as CREATE OR REPLACE requires; the rest is 0032's view
  -- unchanged. The work's awards, wins first, newest first.
  (SELECT COALESCE(json_agg(json_build_object(
            'body', "aw"."body",
            'award', "aw"."award",
            'year', "aw"."year",
            'work', "aw"."work",
            'result', "aw"."result",
            'sourceUrl', "aw"."sourceUrl"
          ) ORDER BY "aw"."result" = 'won' DESC, "aw"."year" DESC, "aw"."id"), '[]'::json)
   FROM "PinAward" AS "aw"
   WHERE "aw"."pinId" = "Pin"."id")             AS "awards",

  -- Appended last, as CREATE OR REPLACE requires; the rest is 0037's view
  -- unchanged. Its tags (PinTagView), awards first, then by name.
  (SELECT COALESCE(json_agg(json_build_object(
            'name', "tg"."name",
            'kind', "tg"."kind",
            'source', "tg"."source"
          ) ORDER BY "tg"."kind" = 'award' DESC, lower("tg"."name")), '[]'::json)
   FROM "PinTagView" AS "tg"
   WHERE "tg"."pinId" = "Pin"."id" AND "tg"."kind" <> 'category') AS "tags",

  -- A day key, as the references' dates are: pg would read a bare date as
  -- the server's local midnight.
  to_char("Pin"."originalStartDate", 'YYYY-MM-DD') AS "originalStartDate",
  "Pin"."delayReasoning",

  -- Appended last, as CREATE OR REPLACE requires; the rest is 0043's view
  -- unchanged. How many episodes the work has, and what that number is.
  "Pin"."episodeCount",
  "Pin"."episodeStatus",

  -- Appended last, as CREATE OR REPLACE requires; the rest is 0047's view
  -- unchanged. The pin's flight path, or null.
  (SELECT json_build_object(
            'label', "fp"."label",
            'sourceUrl', "fp"."sourceUrl",
            'estimated', "fp"."estimated",
            'points', "fp"."points"
          )
   FROM "PinFlightPath" AS "fp"
   WHERE "fp"."pinId" = "Pin"."id")            AS "flightPath",

  -- Appended last, as CREATE OR REPLACE requires; the rest is 0049's view
  -- unchanged. The dollars traded on the prediction markets the pin links
  -- to, and when that was last read.
  "Pin"."marketVolume",
  "Pin"."marketVolumeAt",

  -- Appended last, as CREATE OR REPLACE requires; the rest is 0053's view
  -- unchanged. Whether the source called this an all-day event.
  "Pin"."allDayStated",

  -- Appended last, as CREATE OR REPLACE requires; the rest is 0057's view
  -- unchanged. Where this pin's place is on the review sites, or null. The
  -- page needs this before it can decide whether to ask the API for scores
  -- at all, so a pin with no place never makes the request.
  (SELECT json_build_object(
            'googlePlaceId', "pp"."googlePlaceId",
            'yelpBusinessId', "pp"."yelpBusinessId",
            'reservationUrl', "pp"."reservationUrl",
            'reservationProvider', "pp"."reservationProvider"
          )
   FROM "PinPlace" AS "pp"
   WHERE "pp"."pinId" = "Pin"."id")            AS "place",

  -- Appended last, as CREATE OR REPLACE requires; the rest is 0059's view
  -- unchanged. The public data series this pin's event moves, as handles
  -- only - the numbers are fetched on view (src/server/eiaSeries.ts).
  (SELECT COALESCE(json_agg(json_build_object(
            'source', "ps"."source",
            'seriesId', "ps"."seriesId",
            'label', "ps"."label",
            'sourceUrl', "ps"."sourceUrl"
          ) ORDER BY "ps"."id"), '[]'::json)
   FROM "PinSeries" AS "ps"
   WHERE "ps"."pinId" = "Pin"."id")            AS "series",

  -- The product the pin is about, as a shop would list it (0085).
  "Pin"."productName",

  -- Appended last, as CREATE OR REPLACE requires. How much the medium
  -- counts on this pin.
  "Media.PinMedium"."weight"                   AS "Media.weight"

FROM "Pin"
  LEFT JOIN "Company"
    ON "Pin"."companyId" = "Company"."id"
  -- A dropped link is left out here rather than at the Medium join (0085),
  -- which kept an all-null media row for it.
  LEFT JOIN "PinMedium" AS "Media.PinMedium"
    ON "Pin"."id" = "Media.PinMedium"."pinId" AND "Media.PinMedium"."utcDeletedDateTime" IS NULL
  LEFT JOIN "Medium" AS "Media"
    ON "Media"."id" = "Media.PinMedium"."mediumId"
  LEFT JOIN "Favorite" AS "Favorites"
    ON "Pin"."id" = "Favorites"."pinId" AND "Favorites"."utcDeletedDateTime" IS NULL
  LEFT JOIN "Like" AS "Likes"
    ON "Pin"."id" = "Likes"."pinId" AND "Likes"."utcDeletedDateTime" IS NULL
  LEFT JOIN "User"
    ON "Pin"."userId" = "User"."id"
  LEFT JOIN "Merchant"
    ON "Pin"."id" = "Merchant"."pinId"

GROUP BY
  "Pin"."id",
  "Company"."id",
  "Media"."id",
  "User"."userName",
  "User"."pictureUrl",
  "Merchant"."id",
  "Media.PinMedium"."weight";
