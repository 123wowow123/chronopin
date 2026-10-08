-- Who has already been counted today on a landing page (LandingVisit 0138,
-- LandingClick 0139), so a viewer counts once a day. "hash" is an HMAC of the
-- UTC day, the viewer (user id, anonymous visitor cookie, or address and user
-- agent) and what was counted, keyed with the session secret: it cannot be
-- turned back into a viewer, and a viewer's hashes on two days are unrelated.
-- Rows older than a day are deleted as new ones are written.
CREATE TABLE "LandingSeen" (
  "day"   date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  "hash"  char(64) NOT NULL,
  PRIMARY KEY ("day", "hash")
);
