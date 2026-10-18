-- Timeline impressions: a pin's card seen on the timeline, one row per viewer
-- per UTC day, the way "PinView" counts page views ("u:<userId>" when signed
-- in, "v:<anonymous visitor id>" otherwise). A crowded day shows two rows of
-- its cards, picked by how often each has been seen against how often it was
-- opened or watched (src/lib/bagSample.ts).
CREATE TABLE "PinImpression" (
  "pinId"  integer NOT NULL REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "day"    date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  "viewer" varchar(80) NOT NULL,
  PRIMARY KEY ("pinId", "day", "viewer")
);
