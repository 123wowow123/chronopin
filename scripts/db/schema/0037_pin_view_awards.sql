-- A film, series or anime pin shows the awards its work won or was nominated
-- for (0036). They ride along on the pin as one json array, like "ratings".
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
  "Pin"."category",
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
   WHERE "aw"."pinId" = "Pin"."id")             AS "awards"

FROM "Pin"
  LEFT JOIN "Company"
    ON "Pin"."companyId" = "Company"."id"
  LEFT JOIN "PinMedium" AS "Media.PinMedium"
    ON "Pin"."id" = "Media.PinMedium"."pinId"
  LEFT JOIN "Medium" AS "Media"
    ON "Media"."id" = "Media.PinMedium"."mediumId" AND "Media.PinMedium"."utcDeletedDateTime" IS NULL
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
  "Merchant"."id";
