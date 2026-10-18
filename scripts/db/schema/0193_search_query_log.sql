-- Combined searches (two or more filters, or groups joined with OR), counted once per
-- viewer per UTC day, so the tag cloud can offer the ones people run most.
CREATE TABLE "SearchQueryLog" (
  "query" text NOT NULL CHECK (length("query") BETWEEN 1 AND 300),
  "viewer" text NOT NULL,
  "day" date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  PRIMARY KEY ("query", "viewer", "day")
);
CREATE INDEX "IX_SearchQueryLog_day" ON "SearchQueryLog" ("day");
