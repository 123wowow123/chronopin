-- A dining rubric for a restaurant pin: five axes drawn as a radar on the pin
-- page, the sibling of the taste radar (PinTaste, 0157) and the car
-- performance radar (PinCarPerf, 0167).
--
--   food, service, ambience, value
--                 0 to 5 in half steps, read from the restaurant's published
--                 diner sub-scores (OpenTable's Food / Service / Ambience /
--                 Value, Google, Yelp) and independent reviews, against the
--                 written rubric in docs/okf/scraping/strategy.md ("Dining
--                 rubric").
--   acclaim       0 to 5 in half steps from published critic recognition
--                 (Michelin stars, Bib Gourmand or Guide mention, 50 Best,
--                 James Beard, Gault&Millau, Tabelog, Black Pearl ...).
--                 0 is "no recognition found" only when a guide covers the
--                 city; otherwise it is NULL.
--   NULL          means no figure for that axis is published for this venue
--                 (a new restaurant has no diner scores yet): the radar draws
--                 it at the centre as "n/a" and leaves it out of the shape,
--                 never as a zero.
--   source        'session' (an editorial estimate made in a Claude Code
--                 session from the pin's own sourced figures) or 'hand' (a
--                 person; an estimate never overwrites it).
--   basis         one or two sentences naming the figures that drove each
--                 score and any axis left null.
--   sourceUrl     the page the diner scores or recognition came from.
--   reviews       independent reviews of this venue, [{url, title,
--                 publishedDate, quote}], shown under the radar as the taste
--                 radar's are (0161).
--
-- These are estimates, not measurements: the pin page labels them so. One
-- row per pin. Looked-up data like PinTaste: Pin#update() never touches it,
-- and it is not in PinBaseView - only the pin page reads it. No rubric year:
-- the anchors are published scales (diner scores out of 5, guide awards), not
-- a spec benchmark that moves.
CREATE TABLE "PinDining" (
  "pinId"     integer PRIMARY KEY REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "food"      numeric(2, 1),
  "service"   numeric(2, 1),
  "ambience"  numeric(2, 1),
  "value"     numeric(2, 1),
  "acclaim"   numeric(2, 1),
  "reviews"   jsonb NOT NULL DEFAULT '[]',
  "source"    varchar(16) NOT NULL,
  "basis"     varchar(1000),
  "sourceUrl" varchar(4000),
  "checkedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "CK_PinDining_source" CHECK ("source" IN ('session', 'hand')),
  CONSTRAINT "CK_PinDining_reviews" CHECK (jsonb_typeof("reviews") = 'array'),
  CONSTRAINT "CK_PinDining_scale" CHECK (
    ("food" IS NULL OR "food" BETWEEN 0 AND 5)
    AND ("service" IS NULL OR "service" BETWEEN 0 AND 5)
    AND ("ambience" IS NULL OR "ambience" BETWEEN 0 AND 5)
    AND ("value" IS NULL OR "value" BETWEEN 0 AND 5)
    AND ("acclaim" IS NULL OR "acclaim" BETWEEN 0 AND 5)
  )
);
