-- Nominations are tags of their own: "Crunchyroll Anime Awards 2024 Nominee"
-- (kind nomination), for a body and year where the work was nominated but won
-- nothing; where it won, the win's tag (0039) says enough. A typed tag ending
-- in "Nominee" is one too, so PinTag takes the kind.
ALTER TABLE "PinTag" DROP CONSTRAINT "CK_PinTag_kind";
ALTER TABLE "PinTag" ADD CONSTRAINT "CK_PinTag_kind" CHECK ("kind" IN ('award', 'nomination', 'topic'));

CREATE OR REPLACE VIEW "PinTagView" AS
SELECT DISTINCT ON ("pinId", "name") "pinId", "name", "kind", "source"
FROM (
    SELECT "pinId", "name", "kind", "source", CASE "source" WHEN 'user' THEN 0 ELSE 1 END AS "rank"
    FROM "PinTag"
  UNION ALL
    SELECT DISTINCT "pinId", ("body" || ' ' || "year")::citext, 'award', 'award', 2
    FROM "PinAward"
    WHERE "result" = 'won'
  UNION ALL
    SELECT "pinId", ("body" || ' ' || "year" || ' Nominee')::citext, 'nomination', 'award', 2
    FROM "PinAward"
    GROUP BY "pinId", "body", "year"
    HAVING bool_and("result" = 'nominated')
) AS "all"
ORDER BY "pinId", "name", "rank";
