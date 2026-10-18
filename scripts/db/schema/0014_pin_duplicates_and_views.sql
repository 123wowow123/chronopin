-- Duplicate pins: the same event pinned more than once, usually by different
-- people. A pair is suggested when a pin is saved (same source URL, or a
-- closely matching title within a day of it) and only counts once an admin or
-- either pin's author confirms it. Confirmed pairs chain into groups; the
-- timeline stacks a group's pins that share a day and shows the one with the
-- most watches (then views) on top.

CREATE TABLE "PinDuplicate" (
  -- The lower id first, so a pair has one row whichever pin found the other.
  "pinId"              integer NOT NULL REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "otherPinId"         integer NOT NULL REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "reason"             varchar(20) NOT NULL CHECK ("reason" IN ('similar', 'sourceUrl')),
  -- The search service's title similarity; null for a shared source URL.
  "score"              real,
  "status"             varchar(20) NOT NULL DEFAULT 'suggested' CHECK ("status" IN ('suggested', 'confirmed', 'rejected')),
  "decidedByUserId"    integer REFERENCES "User" ("id") ON DELETE SET NULL,
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now(),
  "utcDecidedDateTime" timestamptz,
  PRIMARY KEY ("pinId", "otherPinId"),
  CHECK ("pinId" < "otherPinId")
);
CREATE INDEX "IX_PinDuplicate_otherPinId" ON "PinDuplicate" ("otherPinId");

-- Pin page views, one row per viewer per UTC day: "u:<userId>" when signed in,
-- else "v:<id>" from an anonymous visitor cookie. Crawlers are not counted.
CREATE TABLE "PinView" (
  "pinId"  integer NOT NULL REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "day"    date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  "viewer" varchar(80) NOT NULL,
  PRIMARY KEY ("pinId", "day", "viewer")
);

-- Every live pin linked to this one through confirmed pairs, itself included,
-- lowest id first; null when it has none.
CREATE FUNCTION "pinDuplicateGroup"(integer) RETURNS integer[]
LANGUAGE sql STABLE AS $$
  WITH RECURSIVE "linked" ("id") AS (
      SELECT $1
    UNION
      SELECT "p"."id"
      FROM "linked"
        JOIN "PinDuplicate" AS "d"
          ON "d"."status" = 'confirmed' AND "linked"."id" IN ("d"."pinId", "d"."otherPinId")
        JOIN "Pin" AS "p"
          ON "p"."id" = CASE WHEN "d"."pinId" = "linked"."id" THEN "d"."otherPinId" ELSE "d"."pinId" END
         AND "p"."utcDeletedDateTime" IS NULL
  )
  SELECT CASE WHEN COUNT(*) > 1 THEN array_agg("id" ORDER BY "id") END FROM "linked"
$$;

-- viewCount and duplicateGroup are appended last, as CREATE OR REPLACE
-- requires; the rest is 0011's view unchanged.
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
            'utcCreatedDateTime', "r"."utcCreatedDateTime"
          ) ORDER BY "r"."id"), '[]'::json)
   FROM "PinReference" AS "r"
   WHERE "r"."pinId" = "Pin"."id")             AS "references",

  "Pin"."sourceStartDateTime",
  "Pin"."sourceEndDateTime",

  (SELECT COUNT(*)::integer FROM "PinView" AS "v"
   WHERE "v"."pinId" = "Pin"."id")             AS "viewCount",
  "pinDuplicateGroup"("Pin"."id")              AS "duplicateGroup"

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
