-- A hotel rubric for a hotel or resort pin: six axes drawn as a radar on the
-- pin page, the sibling of the dining radar (PinDining, 0170).
--
--   rooms, service, location, cleanliness, value
--                 0 to 5 in half steps, read from the property's published
--                 guest sub-scores (Booking.com's Staff / Facilities /
--                 Cleanliness / Comfort / Value for money / Location, out of
--                 10 and halved; Google, Tripadvisor rescaled to 0-5) and
--                 independent reviews, against the written rubric in
--                 docs/okf/scraping/strategy.md ("Hotel rubric").
--   acclaim       0 to 5 in half steps from published critic recognition
--                 (Michelin Keys, Forbes Travel Guide stars, AAA diamonds,
--                 Relais & Chateaux, Conde Nast / Travel + Leisure lists).
--                 0 is "no recognition found" only when a guide covers the
--                 destination; otherwise it is NULL.
--   NULL          means no figure for that axis is published for this
--                 property (a hotel that opened last week has no guest
--                 scores yet): the radar draws it at the centre as "n/a" and
--                 leaves it out of the shape, never as a zero.
--   source        'session' (an editorial estimate made in a Claude Code
--                 session from the pin's own sourced figures) or 'hand' (a
--                 person; an estimate never overwrites it).
--   basis         one or two sentences naming the figures that drove each
--                 score and any axis left null.
--   sourceUrl     the page the guest scores or recognition came from.
--   reviews       independent reviews of this property, [{url, title,
--                 publishedDate, quote}], shown under the radar as the
--                 dining radar's are.
--
-- These are estimates, not measurements: the pin page labels them so. One
-- row per pin. Looked-up data like PinDining: Pin#update() never touches it,
-- and it is not in PinBaseView - only the pin page reads it. No rubric year:
-- the anchors are published scales (guest scores, guide awards), not a spec
-- benchmark that moves.
CREATE TABLE "PinHotel" (
  "pinId"       integer PRIMARY KEY REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "rooms"       numeric(2, 1),
  "service"     numeric(2, 1),
  "location"    numeric(2, 1),
  "cleanliness" numeric(2, 1),
  "value"       numeric(2, 1),
  "acclaim"     numeric(2, 1),
  "reviews"     jsonb NOT NULL DEFAULT '[]',
  "source"      varchar(16) NOT NULL,
  "basis"       varchar(1000),
  "sourceUrl"   varchar(4000),
  "checkedAt"   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "CK_PinHotel_source" CHECK ("source" IN ('session', 'hand')),
  CONSTRAINT "CK_PinHotel_reviews" CHECK (jsonb_typeof("reviews") = 'array'),
  CONSTRAINT "CK_PinHotel_scale" CHECK (
    ("rooms" IS NULL OR "rooms" BETWEEN 0 AND 5)
    AND ("service" IS NULL OR "service" BETWEEN 0 AND 5)
    AND ("location" IS NULL OR "location" BETWEEN 0 AND 5)
    AND ("cleanliness" IS NULL OR "cleanliness" BETWEEN 0 AND 5)
    AND ("value" IS NULL OR "value" BETWEEN 0 AND 5)
    AND ("acclaim" IS NULL OR "acclaim" BETWEEN 0 AND 5)
  )
);
