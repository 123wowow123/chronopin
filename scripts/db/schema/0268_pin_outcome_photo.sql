-- A picture of the person behind a prediction-market outcome on a pin (a
-- pageant contestant, a candidate), shown as a thumbnail panel under the odds
-- bars. Matched to the market's outcome by `label` (the outcome's name as the
-- exchange prints it, "Venezuela"); `person` is who is pictured, the picture
-- sits in Azure Blob Storage and is credited to its source.
--
-- Not in PinBaseView and never touched by Pin#update(); only the odds feed
-- reads it. A pin with rows here shows these pictures instead of whatever the
-- exchange attaches to the markets (often flags).
CREATE TABLE "PinOutcomePhoto" (
  "id"         serial PRIMARY KEY,
  "pinId"      integer NOT NULL REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "label"      varchar(200) NOT NULL,
  "person"     varchar(200) NOT NULL,
  "imageUrl"   varchar(2000) NOT NULL,
  -- The picture it was made from. Storage differs per environment (a local
  -- emulator here, Azure in production), so a push to production sends this and
  -- production downloads and stores its own copy.
  "imageSource" varchar(2000),
  "authorName" varchar(300),
  "authorUrl"  varchar(2000),
  UNIQUE ("pinId", "label")
);
