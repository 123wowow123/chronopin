-- Session store for express-session (connect-pg-simple), replacing the
-- Sequelize-managed "Sessions" table. Sessions are disposable; nobody is
-- signed in through them (auth is a JWT), so the old rows are not carried over.

DROP TABLE IF EXISTS "Sessions";

CREATE TABLE "Session" (
  "sid"    varchar NOT NULL PRIMARY KEY,
  "sess"   json NOT NULL,
  "expire" timestamp(6) NOT NULL
);

CREATE INDEX "IX_Session_expire" ON "Session" ("expire");
