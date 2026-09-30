-- Every write made through the admin table API (/api/admin/db,
-- src/server/adminDb.ts): who changed which rows of which table, and the rows
-- before and after, so an admin's raw edit can be seen and undone by hand.
--
-- action:  'insert' | 'update' | 'delete'
-- key:     the row's primary key as { column: value }, null for a table
--          without one
-- before:  the row as it was (null for an insert); hidden columns left out
-- after:   the row as it is now (null for a delete); hidden columns left out
CREATE TABLE "AdminAudit" (
  "id"                 serial PRIMARY KEY,
  "userId"             integer REFERENCES "User" ("id") ON DELETE SET NULL,
  "action"             varchar(8) NOT NULL CHECK ("action" IN ('insert', 'update', 'delete')),
  "table"              varchar(63) NOT NULL,
  "key"                jsonb,
  "before"             jsonb,
  "after"              jsonb,
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "AdminAudit_table_idx" ON "AdminAudit" ("table", "utcCreatedDateTime" DESC);
CREATE INDEX "AdminAudit_userId_idx" ON "AdminAudit" ("userId", "utcCreatedDateTime" DESC);
