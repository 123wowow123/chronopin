-- Every category becomes one granular word (src/lib/categories.ts): a compound
-- name groups nothing, because half of it is always wrong for the pin under
-- it. "Conferences & Festivals" is now Conference or Festival, "Music & Audio"
-- is Music or Audio, an anime film is Anime *and* Movie - a pin carries as
-- many words as it is about.
--
-- Most names simply lose their second half. The ones that were genuinely two
-- subjects are split pin by pin, by the id lists below: the default word is in
-- the mapping, and every pin that belongs under the other word is named.
CREATE TEMP TABLE "categoryMove" (
  "pinId" integer NOT NULL,
  "from"  citext  NOT NULL,
  "to"    citext
) ON COMMIT DROP;

-- Each category tag starts on its name's default word. A NULL "to" is a tag
-- that goes away (the pin keeps its other categories).
INSERT INTO "categoryMove" ("pinId", "from", "to")
SELECT "t"."pinId", "t"."name", "m"."to"
FROM "PinTag" AS "t"
JOIN (VALUES
  ('Consumer Electronics'::citext,    'Electronics'::citext),
  ('AI Models',                       'AI'),
  ('Computing & Semiconductors',      'Semiconductors'),
  ('Telecom & Networking',            'Telecom'),
  ('Gaming & Entertainment',          'Gaming'),
  ('Anime Movie',                     'Anime'),
  ('Movies',                          'Movie'),
  ('TV Series',                       'TV'),
  ('Music & Audio',                   'Audio'),
  ('Arts & Literature',               'Art'),
  ('Awards & Ceremonies',             'Award'),
  ('Conferences & Festivals',         'Conference'),
  ('Science & Research',              'Science'),
  ('Climate & Environment',           'Climate'),
  ('Natural Disasters',               'Disaster'),
  ('Defense & Military',              'Defense'),
  ('Macroeconomics',                  'Economy'),
  ('Education & Academia',            'Education'),
  ('Religion & Belief',               'Religion'),
  ('Health & Medicine',               'Health'),
  ('Food & Beverage',                 'Food'),
  ('Fashion & Apparel',               'Fashion'),
  ('Space & Astronomy',               'Space'),
  ('Infrastructure & Transportation', 'Transport'),
  ('Travel & Tourism',                'Travel'),
  ('Architecture & Real Estate',      'Architecture'),
  ('Mining & Materials',              'Mining'),
  ('Retail & Commerce',               'Retail'),
  ('Corporate & Finance',             'Finance'),
  ('Labour & Employment',             'Labour'),
  ('Cryptocurrency',                  'Crypto'),
  ('Policy & Legal',                  'Policy'),
  ('Crime & Justice',                 'Justice'),
  ('Other',                           NULL)
) AS "m" ("from", "to") ON "m"."from" = "t"."name"
WHERE "t"."kind" = 'category';

-- Space & Astronomy: launches, probes and stations stay Space; what is
-- observed from the ground is Astronomy (2122-2156 are the eclipses), and the
-- particle-physics machines that were never astronomy at all are Science.
UPDATE "categoryMove" SET "to" = 'Astronomy' WHERE "from" = 'Space & Astronomy'
  AND ("pinId" BETWEEN 2122 AND 2156 OR "pinId" IN (239, 241, 242, 243, 250, 257, 275, 543, 2373, 2374, 2376, 2377));
UPDATE "categoryMove" SET "to" = 'Science' WHERE "from" = 'Space & Astronomy'
  AND "pinId" IN (248, 249, 430, 483, 515);

-- Music & Audio: the kit (headphones, speakers, amps, turntables, DACs) is
-- Audio; instruments, concerts, charts and award nights are Music.
UPDATE "categoryMove" SET "to" = 'Music' WHERE "from" = 'Music & Audio'
  AND "pinId" IN (373, 374, 1962, 1963, 1965, 2318, 2319, 2320, 2321, 2380);

-- Computing & Semiconductors: chips, fabs and process nodes are
-- Semiconductors; 131 is a 5G rollout and belongs with Telecom.
UPDATE "categoryMove" SET "to" = 'Computing' WHERE "from" = 'Computing & Semiconductors'
  AND "pinId" IN (2329, 2473);
UPDATE "categoryMove" SET "to" = 'Telecom' WHERE "from" = 'Computing & Semiconductors'
  AND "pinId" = 131;

-- Policy & Legal: a statute, treaty or court ruling is Law; a budget, tariff,
-- ban or approval is Policy.
UPDATE "categoryMove" SET "to" = 'Law' WHERE "from" = 'Policy & Legal'
  AND "pinId" IN (64, 67, 69, 661, 2418, 2419, 2469, 2470, 2476);

-- Corporate & Finance: markets, rates and raises are Finance; what a company
-- itself does is Business.
UPDATE "categoryMove" SET "to" = 'Business' WHERE "from" = 'Corporate & Finance'
  AND "pinId" IN (31, 77, 151, 2474, 2477, 2493);

-- Arts & Literature: only the Nobel in Literature is about books.
UPDATE "categoryMove" SET "to" = 'Literature' WHERE "from" = 'Arts & Literature'
  AND "pinId" = 1997;

-- Conferences & Festivals: trade shows and keynotes are Conference; Cannes and
-- the Venice Biennale are Festival.
UPDATE "categoryMove" SET "to" = 'Festival' WHERE "from" = 'Conferences & Festivals'
  AND "pinId" IN (2378, 2382);

-- Infrastructure & Transportation: anything that moves people or freight
-- (rail, metro, airports, ports, bridges, roads, tunnels) is Transport; water,
-- sewers, dams, flood defences and construction plant are Infrastructure. A
-- few were neither and move to the word they were always about; the convention
-- centres and the business district (2180, 2194, 2257) keep only the building
-- category they already carry.
UPDATE "categoryMove" SET "to" = 'Infrastructure' WHERE "from" = 'Infrastructure & Transportation'
  AND "pinId" IN (192, 437, 438, 447, 452, 454, 455, 458, 470, 501, 502, 533, 534, 570, 585, 587, 592, 598,
                  636, 702, 707, 738, 756, 789, 812, 852, 891, 923, 930, 948, 950, 2203);
UPDATE "categoryMove" SET "to" = 'Mining'         WHERE "from" = 'Infrastructure & Transportation' AND "pinId" IN (909, 926);
UPDATE "categoryMove" SET "to" = 'Semiconductors' WHERE "from" = 'Infrastructure & Transportation' AND "pinId" IN (2179, 2205);
UPDATE "categoryMove" SET "to" = 'Telecom'        WHERE "from" = 'Infrastructure & Transportation' AND "pinId" = 73;
UPDATE "categoryMove" SET "to" = 'Aerospace'      WHERE "from" = 'Infrastructure & Transportation' AND "pinId" IN (139, 154);
UPDATE "categoryMove" SET "to" = NULL             WHERE "from" = 'Infrastructure & Transportation' AND "pinId" IN (2180, 2194, 2257);

-- Architecture & Real Estate: a building is Architecture; ownership, housing,
-- land and master-planned districts are Property.
UPDATE "categoryMove" SET "to" = 'Property' WHERE "from" = 'Architecture & Real Estate'
  AND "pinId" IN (209, 267, 274, 446, 457, 460, 471, 497, 507, 542, 580, 608, 627, 664, 720, 723, 841,
                  2167, 2239, 2242, 2245, 2252, 2257, 2291);

-- Two of a pin's categories can land on the same word (an anime film filed as
-- both Movies and Anime Movie); the later one goes rather than collide.
UPDATE "categoryMove" AS "m" SET "to" = NULL
WHERE "m"."to" IS NOT NULL
  AND EXISTS (SELECT 1 FROM "categoryMove" AS "o"
              WHERE "o"."pinId" = "m"."pinId" AND "o"."to" = "m"."to" AND "o"."from" < "m"."from");

-- A new word may already be on the pin as a typed tag ("Music" on a Grammys
-- pin, "Semiconductors" on the chip-export one). The category is the stronger
-- statement, so the tag row makes way for it.
DELETE FROM "PinTag" AS "t" USING "categoryMove" AS "m"
WHERE "t"."pinId" = "m"."pinId" AND "t"."kind" <> 'category' AND "t"."name" = "m"."to";

-- Tags with no word left, and tags whose word the pin already carries.
DELETE FROM "PinTag" AS "t" USING "categoryMove" AS "m"
WHERE "t"."pinId" = "m"."pinId" AND "t"."kind" = 'category' AND "t"."name" = "m"."from"
  AND ("m"."to" IS NULL
       OR EXISTS (SELECT 1 FROM "PinTag" AS "x"
                  WHERE "x"."pinId" = "m"."pinId" AND "x"."kind" = 'category'
                    AND "x"."name" = "m"."to" AND "x"."id" <> "t"."id"));

UPDATE "PinTag" AS "t" SET "name" = "m"."to"
FROM "categoryMove" AS "m"
WHERE "t"."pinId" = "m"."pinId" AND "t"."kind" = 'category' AND "t"."name" = "m"."from";

-- An anime film is Anime (the row above) and Movie both.
INSERT INTO "PinTag" ("pinId", "name", "kind", "source")
SELECT DISTINCT "pinId", 'Movie', 'category', 'user' FROM "categoryMove" WHERE "from" = 'Anime Movie'
ON CONFLICT ("pinId", "name") DO UPDATE SET "kind" = 'category', "source" = 'user';

-- The verdicts that are about an offence, not only a courtroom, are Crime as
-- well as Justice.
INSERT INTO "PinTag" ("pinId", "name", "kind", "source")
SELECT "id", 'Crime', 'category', 'user' FROM "Pin" WHERE "id" IN (2475, 2477, 2478, 2479)
ON CONFLICT ("pinId", "name") DO UPDATE SET "kind" = 'category', "source" = 'user';
