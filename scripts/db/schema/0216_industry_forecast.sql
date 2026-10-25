-- Industry forecast panels: one row per metric, matched to pins and to
-- searches by tag/category name. Live series are handles read from the
-- publisher on view (FRED's Ramp AI Index); a snapshot holds a series with no
-- keyless feed (Census BTOS, refreshed by industry:btos); a projection is a
-- published forecast, always cited in "sources".
CREATE TABLE "IndustryForecast" (
  "id"         serial PRIMARY KEY,
  "slug"       varchar(80) NOT NULL UNIQUE,
  "industry"   varchar(80) NOT NULL,
  "title"      varchar(200) NOT NULL,
  "tags"       text[] NOT NULL,
  "prefix"     varchar(8) NOT NULL DEFAULT '',
  "suffix"     varchar(8) NOT NULL DEFAULT '',
  "live"       jsonb NOT NULL DEFAULT '[]',
  "snapshot"   jsonb NOT NULL DEFAULT '[]',
  "projection" jsonb,
  "sources"    jsonb NOT NULL DEFAULT '[]',
  "note"       text,
  "checkedAt"  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "CK_IndustryForecast_json" CHECK (
    jsonb_typeof("live") = 'array' AND jsonb_typeof("snapshot") = 'array' AND jsonb_typeof("sources") = 'array'
  )
);
CREATE INDEX "IX_IndustryForecast_tags" ON "IndustryForecast" USING gin ("tags");
