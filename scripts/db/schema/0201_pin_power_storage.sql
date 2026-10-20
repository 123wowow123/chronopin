-- Battery and other energy storage is neither power made nor power drawn, so
-- PinPower.kind gets a third value, 'storage' (its megawatts are the rated
-- charge/discharge power). Moves the battery rows 0200 put under generation.
ALTER TABLE "PinPower" DROP CONSTRAINT "CK_PinPower_kind";
ALTER TABLE "PinPower" ADD CONSTRAINT "CK_PinPower_kind" CHECK ("kind" IN ('generation', 'usage', 'storage'));

UPDATE "PinPower" AS "pw" SET "kind" = 'storage'
FROM "Pin" AS "p"
WHERE "p"."id" = "pw"."pinId"
  AND "pw"."source" <> 'hand'
  AND "p"."title" ~* '\y(battery|batteries|energy storage|BESS|pumped storage|storage (center|centre|facility|project))\y'
  AND "p"."title" !~* '\y(data ?cent(er|re)s?|AI campus|hyperscale)\y';
