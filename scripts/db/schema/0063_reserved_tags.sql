-- The thread tag is the site's own, not anyone's tag: kind 'reserved'.
--
-- "Thread" is derived (0056) from a fact about two pins, and no curator can
-- type it (src/server/model/pinTag.ts drops reserved names on the way in).
-- Calling it a 'topic', as it was, filed it among the tags people write; as
-- 'reserved' it stands with the site's other filters - the confidence: levels
-- and score bands, which are no rows at all - in a strip of its own in the
-- tag cloud and marked as the site's in the search suggestions
-- (src/lib/tags.ts, RESERVED_TAGS).
--
-- Only that one literal changes; the rest is 0056's view unchanged.
CREATE OR REPLACE VIEW "PinTagView" AS
SELECT DISTINCT ON ("pinId", "name") "pinId", "name", "kind", "source"
FROM (
    SELECT "t"."pinId", "t"."name", "t"."kind", "t"."source", CASE "t"."source" WHEN 'user' THEN 0 ELSE 1 END AS "rank"
    FROM "PinTag" AS "t"
    WHERE NOT ("t"."source" = 'auto' AND "t"."kind" = 'award' AND EXISTS (
      SELECT 1 FROM "PinAward" AS "a"
      WHERE "a"."pinId" = "t"."pinId" AND ("a"."body" || ' ' || "a"."year")::citext = "t"."name"
      GROUP BY "a"."pinId"
      HAVING bool_and("a"."result" = 'nominated')
    ))
  UNION ALL
    SELECT DISTINCT "pinId", ("body" || ' ' || "year")::citext, 'award', 'award', 2
    FROM "PinAward"
    WHERE "result" = 'won'
  UNION ALL
    SELECT "pinId", ("body" || ' ' || "year" || ' Nominee')::citext, 'nomination', 'award', 2
    FROM "PinAward"
    GROUP BY "pinId", "body", "year"
    HAVING bool_and("result" = 'nominated')
  UNION ALL
    SELECT "p"."id", 'Thread'::citext, 'reserved', 'thread', 3
    FROM "Pin" AS "p"
    WHERE "p"."utcDeletedDateTime" IS NULL
      AND (EXISTS (
            SELECT 1 FROM "Pin" AS "parent"
            WHERE "parent"."id" = "p"."parentId" AND "parent"."utcDeletedDateTime" IS NULL
          )
        OR EXISTS (
            SELECT 1 FROM "Pin" AS "child"
            WHERE "child"."parentId" = "p"."id" AND "child"."utcDeletedDateTime" IS NULL
          ))
) AS "all"
ORDER BY "pinId", "name", "rank";

-- The reserved names as rows: a "Thread" a curator typed was theirs (source
-- 'user', kind 'topic') and would outrank the derived row in the view above,
-- and a typed "Estimated" would stand in the cloud beside the site's own
-- filter of that name meaning something else. The site owns these words now,
-- so the rows go (RESERVED_TAGS in src/lib/tags.ts); a pin really in a thread
-- still carries its tag, derived.
DELETE FROM "PinTag"
WHERE "name" IN ('Thread', 'Confirmed', 'Scheduled', 'Estimated', 'Delayed', 'Unverified', 'High confidence', 'Medium confidence', 'Low confidence');
