-- A dam project's headline figures, shown as a "Dam specs" tile panel on the pin page and
-- summed on /dams (stats panel + state map): height, crest length, reservoir storage,
-- added storage, generating capacity, type, river, owner and state.
--
--   heightFt          structural height in feet (the source's own measure: above valley floor / streambed).
--   crestLengthFt     crest length in feet.
--   storageAcreFt     total reservoir storage in acre-feet once built (or the existing total for a retrofit).
--   addedStorageAcreFt new storage a raise or expansion adds, in acre-feet.
--   capacityMw        generating or pumped-storage capacity in MW (hydropower / pumped storage dams only).
--   damType           'embankment' | 'concrete' | 'rcc' | 'rockfill' | 'earthfill' | 'gravity' | 'arch' | 'other'.
--   river             river or creek name.
--   owner             owning or sponsoring agency.
--   state             two-letter US state (drives the /dams map).
--   scope             'new' (new dam) | 'raise' | 'safety' (seismic / spillway / foundation) | 'outlet' (tunnel, fish passage, gates) | 'storage' (pumped storage).
--   basis             'published' | 'planned' | 'reported' (as PinProject).
--   sourceUrl, note   the page that states the figures; what they are in words.
--
-- One row per pin. Pin#update() never touches it.
CREATE TABLE "PinDam" (
  "pinId"              integer PRIMARY KEY REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "heightFt"           numeric(8, 1),
  "crestLengthFt"      numeric(10, 1),
  "storageAcreFt"      bigint,
  "addedStorageAcreFt" bigint,
  "capacityMw"         numeric(10, 1),
  "damType"            varchar(12),
  "river"              varchar(120),
  "owner"              varchar(160),
  "state"              char(2),
  "scope"              varchar(8),
  "basis"              varchar(10),
  "sourceUrl"          varchar(4000),
  "note"               varchar(500),
  "checkedAt"          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "CK_PinDam_positive" CHECK (
    ("heightFt" IS NULL OR "heightFt" > 0) AND ("crestLengthFt" IS NULL OR "crestLengthFt" > 0)
    AND ("storageAcreFt" IS NULL OR "storageAcreFt" > 0) AND ("addedStorageAcreFt" IS NULL OR "addedStorageAcreFt" > 0)
    AND ("capacityMw" IS NULL OR "capacityMw" > 0)),
  CONSTRAINT "CK_PinDam_type" CHECK ("damType" IS NULL OR "damType" IN ('embankment', 'concrete', 'rcc', 'rockfill', 'earthfill', 'gravity', 'arch', 'other')),
  CONSTRAINT "CK_PinDam_scope" CHECK ("scope" IS NULL OR "scope" IN ('new', 'raise', 'safety', 'outlet', 'storage')),
  CONSTRAINT "CK_PinDam_basis" CHECK ("basis" IS NULL OR "basis" IN ('published', 'planned', 'reported')),
  CONSTRAINT "CK_PinDam_state" CHECK ("state" IS NULL OR "state" ~ '^[A-Z]{2}$')
);
CREATE INDEX "IX_PinDam_state" ON "PinDam" ("state") WHERE "state" IS NOT NULL;
