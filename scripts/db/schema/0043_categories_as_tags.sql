-- Categories become tags. Each pin's category is copied into PinTag as a
-- tag of kind 'category' (src/lib/categories.ts keeps the list of names a
-- category tag may have), a pin may now carry any number of them, and the
-- Pin.category column goes. The tag cloud's grouped mode puts categories at
-- the top, with every other tag under the category most of its pins carry.
ALTER TABLE "PinTag" DROP CONSTRAINT "CK_PinTag_kind";
ALTER TABLE "PinTag" ADD CONSTRAINT "CK_PinTag_kind" CHECK ("kind" IN ('award', 'nomination', 'topic', 'category'));

-- A pin that already had its category as a typed tag keeps the one row, now
-- a category.
INSERT INTO "PinTag" ("pinId", "name", "kind", "source")
SELECT "id", "category", 'category', 'user'
FROM "Pin"
WHERE "category" IS NOT NULL AND btrim("category") <> ''
ON CONFLICT ("pinId", "name") DO UPDATE SET "kind" = 'category', "source" = 'user';

-- PinBaseView is the only thing reading the column. Rebuilt with the pin's
-- categories in its place, and its tags without them; the rest is 0042's view.
DROP VIEW "PinBaseView";
DROP INDEX IF EXISTS "IX_Pin_category";
ALTER TABLE "Pin" DROP COLUMN "category";

CREATE INDEX IF NOT EXISTS "IX_PinTag_category" ON "PinTag" ("pinId") WHERE "kind" = 'category';

CREATE VIEW "PinBaseView" AS
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
  "Pin"."delayReasoning"

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
