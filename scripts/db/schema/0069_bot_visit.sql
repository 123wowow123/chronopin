-- Crawlers and other bots requesting the site's pages, for the admin Bots page.
-- PinView leaves them out; this is where they are counted instead. One row per
-- bot per path per UTC day with a running count, so a crawler taking the same
-- page a thousand times adds one row, not a thousand. The proxy identifies the
-- bot from its user agent (src/lib/bots.ts), which a bot can fake: nothing here
-- is verified. No IP address is kept.
CREATE TABLE "BotVisit" (
  "day"               date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  "bot"               varchar(80) NOT NULL,
  "kind"              varchar(12) NOT NULL CHECK ("kind" IN ('search', 'ai', 'social', 'other')),
  "path"              varchar(300) NOT NULL,
  "hits"              integer NOT NULL DEFAULT 1,
  -- The latest full user agent the bot sent for this path and day.
  "userAgent"         varchar(500) NOT NULL,
  "utcLastDateTime"   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("day", "bot", "path")
);
CREATE INDEX "IX_BotVisit_bot" ON "BotVisit" ("bot", "day");
