-- Who saw a self-serve ad, once per person per day: the advertiser's "unique
-- people" count. A signed-in viewer is "u<userId>"; a guest is "i<hash>", a
-- salted hash of the address (never the address itself). AdImpression keeps
-- counting every view; this is the distinct people behind them.
CREATE TABLE "AdUniqueViewer" (
  "day"       date        NOT NULL,
  "adKey"     varchar(40) NOT NULL,
  "viewerKey" varchar(40) NOT NULL,
  PRIMARY KEY ("day", "adKey", "viewerKey")
);

CREATE INDEX "AdUniqueViewer_adKey_idx" ON "AdUniqueViewer" ("adKey", "viewerKey");
