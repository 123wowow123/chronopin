-- Searches a signed-in user named (a pin: list joins the tag cloud only once named).
CREATE TABLE "SavedSearch" (
  "userId"             integer NOT NULL REFERENCES "User" ("id") ON DELETE CASCADE,
  "query"              varchar(2000) NOT NULL,
  "name"               varchar(60) NOT NULL CHECK (length("name") > 0),
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("userId", "query")
);
