-- Live health of the service behind an AI model pin (Claude, ChatGPT, Gemini, ...),
-- read from the service's StatusGator page (src/server/model/serviceStatus.ts).
-- One row per StatusGator service slug, shared by every model pin of that vendor.
--   status        'up' | 'warning' | 'down' | 'maintenance' (the page's current state)
--   headline      the page's current-status sentence, shown while not 'up'
--   uptimePct     share of the last 30 days not 'down', from the page's daily history (0-100)
--   downMinutes   minutes marked down in that window; degradedMinutes the warning ones
--   days          the window's per-day state, oldest first, [{d:'2026-09-09', s:'up'|'warning'|'down'|'maintenance'}]
CREATE TABLE IF NOT EXISTS "ServiceStatus" (
  "slug"            text PRIMARY KEY,
  "name"            text NOT NULL,
  "status"          text NOT NULL,
  "headline"        text,
  "uptimePct"       numeric(5,2),
  "downMinutes"     integer NOT NULL DEFAULT 0,
  "degradedMinutes" integer NOT NULL DEFAULT 0,
  "days"            jsonb NOT NULL DEFAULT '[]',
  "sourceUrl"       text NOT NULL,
  "checkedAt"       timestamptz NOT NULL DEFAULT now()
);
