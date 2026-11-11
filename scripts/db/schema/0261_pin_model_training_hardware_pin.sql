-- The pin for the accelerator a model trained on (a TPU generation pin, say), so the Training hardware tile
-- links to it. NULL when the chip has no pin: the tile then links to a search for the chip's name.
ALTER TABLE "PinModelTraining" ADD COLUMN "hardwarePinId" integer REFERENCES "Pin" ("id") ON DELETE SET NULL;
