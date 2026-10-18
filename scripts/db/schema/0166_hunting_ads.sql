-- TideWe (hunting blinds, waders, heated clothing, boots and packs) through our
-- Awin publisher account: the stored url is the plain tidewe.com collection, and
-- affiliateUrl() sends it through awin1.com at render time (src/lib/affiliate.ts).
-- US store only; 18+ because the products are for hunters.
ALTER TABLE "Ad" DROP CONSTRAINT IF EXISTS "Ad_kind_check";
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_kind_check" CHECK ("kind" IN ('special', 'bonus', 'tradein', 'watch', 'sneaker', 'lego', 'hunting'));

INSERT INTO "Ad" ("program", "kind", "store", "url", "categories", "weight", "rewardUsd", "minAge") VALUES
  ('hunting_blinds', 'hunting', 'US', 'https://tidewe.com/collections/hunting-blind', '{Hunting,Outdoors,Sports}', 2, NULL, 18),
  ('hunting_waders', 'hunting', 'US', 'https://tidewe.com/collections/hunting-waders', '{Hunting,Outdoors,Fishing,Sports}', 1, NULL, 18),
  ('hunting_heated', 'hunting', 'US', 'https://tidewe.com/collections/heated-clothing', '{Hunting,Outdoors,Sports}', 1, NULL, 18),
  ('hunting_boots', 'hunting', 'US', 'https://tidewe.com/collections/hunting-boots', '{Hunting,Outdoors,Sports}', 1, NULL, 18),
  ('hunting_clothing', 'hunting', 'US', 'https://tidewe.com/collections/hunting-clothes', '{Hunting,Outdoors,Sports}', 1, NULL, 18),
  ('hunting_packs', 'hunting', 'US', 'https://tidewe.com/collections/backpack', '{Hunting,Outdoors,Sports}', 1, NULL, 18)
ON CONFLICT ("program", "store") DO NOTHING;
