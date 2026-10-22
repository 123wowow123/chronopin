-- Sectors a committee oversees, set by hand through PUT /api/admin/conflicts. They win over the map in
-- src/lib/conflicts.ts and survive a committee-seat refresh (which rewrites PersonCommittee).
CREATE TABLE "CommitteeSector" (
  "committeeId" varchar(12) PRIMARY KEY,
  "sectors"     text[] NOT NULL,
  "updatedAt"   timestamptz NOT NULL DEFAULT now()
);
