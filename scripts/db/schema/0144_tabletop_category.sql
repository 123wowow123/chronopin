-- Video games and tabletop games are different things to buy and to read
-- about: Gaming stays the video games, and the board games, card games,
-- trading-card sets and miniatures that were filed under it become Tabletop
-- (src/lib/categories.ts). Found by the topic tags they already carry, plus
-- the Pikachu Illustrator card (6225), which has only "Card".
CREATE TEMP TABLE "tabletopPin" ON COMMIT DROP AS
SELECT DISTINCT "g"."pinId"
FROM "PinTag" AS "g"
WHERE "g"."kind" = 'category' AND "g"."name" = 'Gaming'
  AND ("g"."pinId" = 6225 OR EXISTS (
    SELECT 1 FROM "PinTag" AS "t"
    WHERE "t"."pinId" = "g"."pinId" AND "t"."kind" <> 'category'
      AND "t"."name" IN ('Trading Cards', 'Board Games', 'Tabletop', 'Tabletop Games', 'Card Games', 'Miniatures', 'One Piece Card Game', 'Lorcana', 'Disney Lorcana', 'Magic: The Gathering')
  ));

-- UC_PinTag is unique on (pinId, name): a Tabletop topic tag on the pin goes
-- first, since the category replaces it.
DELETE FROM "PinTag" WHERE "name" = 'Tabletop' AND "kind" <> 'category' AND "pinId" IN (SELECT "pinId" FROM "tabletopPin");

UPDATE "PinTag" SET "name" = 'Tabletop'
WHERE "kind" = 'category' AND "name" = 'Gaming' AND "pinId" IN (SELECT "pinId" FROM "tabletopPin");
