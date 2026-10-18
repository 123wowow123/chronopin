-- Two more taste axes beside the first five: pungent (辛味, the bite of chilli,
-- pepper, ginger, mustard or strong spirit) and coolness (清涼感, the cooling
-- of mint or menthol). 0 to 5 in half steps like the rest. DEFAULT 0 only
-- gives the existing rows a value to hold; the backfill (npm run
-- products:taste) scores them properly.
ALTER TABLE "PinTaste" ADD COLUMN "pungent" numeric(2, 1) NOT NULL DEFAULT 0;
ALTER TABLE "PinTaste" ADD COLUMN "coolness" numeric(2, 1) NOT NULL DEFAULT 0;
ALTER TABLE "PinTaste" ADD CONSTRAINT "CK_PinTaste_scale_more" CHECK ("pungent" BETWEEN 0 AND 5 AND "coolness" BETWEEN 0 AND 5);
