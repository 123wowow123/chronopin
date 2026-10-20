-- Power a facility makes against power it draws. PinPower's megawatts were one
-- undifferentiated figure, so a solar farm's nameplate and a data centre's
-- load summed together on the map and filtered as the same thing.
--
--   kind  'generation' (a plant, solar or wind farm, battery's output: power
--         it puts on the grid) or 'usage' (a data centre, smelter, fab:
--         power it draws). PinEnergy is already usage only.
--
-- Backfill reads the pin's title and tags; anything not clearly a source is
-- usage, since the 0196 backfill came mostly from data-centre titles.
ALTER TABLE "PinPower" ADD COLUMN "kind" varchar(10) NOT NULL DEFAULT 'usage';
ALTER TABLE "PinPower" ADD CONSTRAINT "CK_PinPower_kind" CHECK ("kind" IN ('generation', 'usage'));

UPDATE "PinPower" AS "pw" SET "kind" = 'generation'
FROM "Pin" AS "p"
WHERE "p"."id" = "pw"."pinId"
  AND (
    "p"."title" ~* '\y(solar|wind ?farm|offshore wind|wind project|photovoltaic|nuclear|reactor|SMR|hydro(electric|power)?|geothermal|power ?plant|power station|generating station|gas[- ]fired|coal[- ]fired|combined[- ]cycle|battery|energy storage|BESS|pumped storage|generation)\y'
    OR EXISTS (
      SELECT 1 FROM "PinTagView" AS "t"
      WHERE "t"."pinId" = "p"."id" AND "t"."name" IN ('Power Plants', 'Solar', 'Wind', 'Nuclear', 'Hydropower', 'Renewable Energy', 'Clean Energy')
    )
  )
  AND "p"."title" !~* '\y(data ?cent(er|re)s?|AI campus|hyperscale)\y';
