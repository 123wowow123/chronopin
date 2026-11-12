-- Project specs: park area. parkAcres = acres of parks (public space is not counted).
ALTER TABLE "PinProject"
  ADD COLUMN "parkAcres" numeric(12, 2) CHECK ("parkAcres" IS NULL OR "parkAcres" > 0);
