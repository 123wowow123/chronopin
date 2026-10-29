-- The seat a sitting member of Congress holds, drawn on their person page:
-- a House district (one polygon set) or a Senate seat (the state). One row
-- per person; geometry is the Census TIGERweb boundary of the congress named
-- in "vintage", simplified for display.
CREATE TABLE "PersonDistrict" (
  "personId"   integer PRIMARY KEY REFERENCES "Person" ("id") ON DELETE CASCADE,
  "label"      varchar(200) NOT NULL,
  "geojson"    jsonb NOT NULL,
  "vintage"    varchar(80) NOT NULL,
  "source"     varchar(200) NOT NULL,
  "sourceUrl"  text NOT NULL,
  "checkedAt"  timestamptz NOT NULL DEFAULT now()
);
