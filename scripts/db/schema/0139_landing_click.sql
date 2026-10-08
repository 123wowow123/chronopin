-- Which restaurant a visitor opened from a landing page (see LandingVisit,
-- 0138). The proxy sees the pin page request with the landing page as its
-- referrer. One row per landing page per pin per UTC day with a running count.
-- No IP address or visitor id is kept. pinId has no foreign key: the count
-- outlives a deleted pin.
CREATE TABLE "LandingClick" (
  "day"               date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  "fromPath"          varchar(300) NOT NULL,
  "pinId"             integer NOT NULL,
  "hits"              integer NOT NULL DEFAULT 1,
  "utcLastDateTime"   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("day", "fromPath", "pinId")
);
CREATE INDEX "IX_LandingClick_pin" ON "LandingClick" ("pinId");
