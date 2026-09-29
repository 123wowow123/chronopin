-- Walking a pin's confirmed duplicate group by index.
--
-- "pinDuplicateGroup" (0014) matched a pair from either end at once, with
-- "linked"."id" IN ("d"."pinId", "d"."otherPinId"). That reads as one step but
-- is a join filter, not an index condition, so neither the primary key nor
-- IX_PinDuplicate_otherPinId could answer it and every step of the recursion
-- scanned the whole table - once per pin per row of a page. Postgres had
-- recorded 1.7 million sequential scans over "PinDuplicate" reading 384
-- million rows against 2,619 index scans, far the worst of any table here.
--
-- The two ends are now two branches, each one a plain equality an index can
-- answer, unioned. Same walk, same group, same order.

-- Only confirmed pairs are ever followed, and they are the few: partial, so
-- the suggestions waiting to be reviewed stay out of both indexes.
CREATE INDEX "IX_PinDuplicate_confirmed_pinId" ON "PinDuplicate" ("pinId") WHERE "status" = 'confirmed';
CREATE INDEX "IX_PinDuplicate_confirmed_otherPinId" ON "PinDuplicate" ("otherPinId") WHERE "status" = 'confirmed';

CREATE OR REPLACE FUNCTION "pinDuplicateGroup"(integer) RETURNS integer[]
LANGUAGE sql STABLE AS $$
  WITH RECURSIVE "linked" ("id") AS (
      SELECT $1
    UNION
      SELECT "p"."id"
      FROM "linked"
        CROSS JOIN LATERAL (
            SELECT "d"."otherPinId" AS "id"
            FROM "PinDuplicate" AS "d"
            WHERE "d"."status" = 'confirmed' AND "d"."pinId" = "linked"."id"
          UNION ALL
            SELECT "d"."pinId"
            FROM "PinDuplicate" AS "d"
            WHERE "d"."status" = 'confirmed' AND "d"."otherPinId" = "linked"."id"
        ) AS "pair"
        JOIN "Pin" AS "p"
          ON "p"."id" = "pair"."id" AND "p"."utcDeletedDateTime" IS NULL
  )
  SELECT CASE WHEN COUNT(*) > 1 THEN array_agg("id" ORDER BY "id") END FROM "linked"
$$;
