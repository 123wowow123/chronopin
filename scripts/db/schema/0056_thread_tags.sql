-- A pin in a thread carries a "Thread" tag. Threads are the site's story
-- chains - a film's sequels, a launch schedule, an anime's seasons - and
-- nothing until now let you ask for the pins that are part of one, or showed
-- on the pin itself that it belongs to a chain.
--
-- Derived, like the award tags (0038): a pin is in a thread when it answers
-- another pin or another pin answers it, which is a fact about two pins.
-- Stored rows would need the *other* pin resynced on every re-thread (a PUT
-- moving parentId, a delete), and a missed one would leave a lie behind. The
-- view reads it fresh, so threading a pin tags both ends at once.
--
-- A soft-deleted pin at either end does not count: a pin whose only answer is
-- in the bin is no longer in a thread.
--
-- Rank 3, below the typed tags, so a "Thread" someone typed stays theirs
-- (source 'user'); the derived row's source is 'thread' (src/lib/tags.ts).
-- The rest is 0041's view unchanged.
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
    SELECT "p"."id", 'Thread'::citext, 'topic', 'thread', 3
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
