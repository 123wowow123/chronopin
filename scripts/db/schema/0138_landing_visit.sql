-- Human visits to landing pages (so far /restaurants and the city guides under
-- it), for the admin Landing page. Bots are counted in BotVisit instead. One
-- row per page per referrer source per UTC day with a running count; the proxy
-- writes it in batches (src/server/model/landingVisit.ts). The path is the
-- English one, without the language prefix. No IP address or visitor id is kept.
CREATE TABLE "LandingVisit" (
  "day"               date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  "path"              varchar(300) NOT NULL,
  -- 'direct', 'internal' (from another page of the site), a search engine or
  -- social site by name, else the referring host.
  "source"            varchar(120) NOT NULL,
  "hits"              integer NOT NULL DEFAULT 1,
  "utcLastDateTime"   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("day", "path", "source")
);
