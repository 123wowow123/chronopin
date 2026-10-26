-- Names are shared: a named search shows in everyone's popular searches, so it
-- is keyed by its query alone and the namer is only kept for who may rename it.
DROP TABLE "SavedSearch";
CREATE TABLE "SavedSearch" (
  "query"              varchar(2000) PRIMARY KEY,
  "name"               varchar(60) NOT NULL CHECK (length("name") > 0),
  "userId"             integer REFERENCES "User" ("id") ON DELETE SET NULL,
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now()
);
