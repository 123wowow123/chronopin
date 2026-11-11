-- An AI model's training metrics, shown on the model's pin as tiles like the datacenter water tile
-- (the Epoch AI model page's "Training" block). NULL = unpublished (the tile reads "Unknown").
--
--   parametersBillions   parameter count in billions (1.8 trillion = 1800).
--   trainingComputeFlop  total training compute in FLOP (9.4e26).
--   trainingHardware     accelerator(s), e.g. 'NVIDIA GB200'.
--   trainingDays         wall-clock training time in days.
--   datasetSize          training dataset size, in `datasetUnit`.
--   datasetUnit          'tokens', 'words', 'images', ...
--   basis                'published' (maker/paper) or 'estimated' (Epoch AI or other third party).
--   sourceUrl            the page that states the figures (opened HTTPS).
--
-- One row per pin. Like PinDatacenter, Pin#update() never touches it.
CREATE TABLE "PinModelTraining" (
  "pinId"               integer PRIMARY KEY REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "parametersBillions"  double precision,
  "trainingComputeFlop" double precision,
  "trainingHardware"    varchar(200),
  "trainingDays"        double precision,
  "datasetSize"         double precision,
  "datasetUnit"         varchar(24),
  "basis"               varchar(12),
  "sourceUrl"           varchar(4000),
  "note"                varchar(500),
  "checkedAt"           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "CK_PinModelTraining_parameters" CHECK ("parametersBillions" IS NULL OR "parametersBillions" > 0),
  CONSTRAINT "CK_PinModelTraining_compute" CHECK ("trainingComputeFlop" IS NULL OR "trainingComputeFlop" > 0),
  CONSTRAINT "CK_PinModelTraining_days" CHECK ("trainingDays" IS NULL OR "trainingDays" > 0),
  CONSTRAINT "CK_PinModelTraining_dataset" CHECK ("datasetSize" IS NULL OR "datasetSize" > 0),
  CONSTRAINT "CK_PinModelTraining_basis" CHECK ("basis" IS NULL OR "basis" IN ('published', 'estimated'))
);
