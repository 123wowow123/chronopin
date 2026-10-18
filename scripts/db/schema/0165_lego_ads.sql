-- brkox (LEGO-compatible LED light kits, display frames and cases) through our
-- Awin publisher account: the stored url is the plain brkox.com collection, and
-- affiliateUrl() sends it through awin1.com at render time (src/lib/affiliate.ts).
-- US only (the programme's region); 13+ because the buyer is usually a parent
-- or a collector, like the sneaker rows.
ALTER TABLE "Ad" DROP CONSTRAINT IF EXISTS "Ad_kind_check";
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_kind_check" CHECK ("kind" IN ('special', 'bonus', 'tradein', 'watch', 'sneaker', 'lego'));

INSERT INTO "Ad" ("program", "kind", "store", "url", "categories", "weight", "rewardUsd", "minAge") VALUES
  ('lego_lights', 'lego', 'US', 'https://brkox.com/collections/lego-light-kits', '{LEGO,Toys,Collectibles,Hobby}', 2, NULL, 13),
  ('lego_frames', 'lego', 'US', 'https://brkox.com/collections/lego-display-frames', '{LEGO,Toys,Collectibles,Hobby}', 1, NULL, 13),
  ('lego_cases', 'lego', 'US', 'https://brkox.com/collections/lego-display-cases', '{LEGO,Toys,Collectibles,Hobby}', 1, NULL, 13),
  ('lego_movies', 'lego', 'US', 'https://brkox.com/collections/movies-tv-light-kits', '{LEGO,Movie,TV,Collectibles}', 1, NULL, 13),
  ('lego_cars', 'lego', 'US', 'https://brkox.com/collections/cars-vehicles-light-kits', '{LEGO,Automotive,Collectibles}', 1, NULL, 13),
  ('lego_space', 'lego', 'US', 'https://brkox.com/collections/space-aircraft-light-kits', '{LEGO,Space,Aerospace,Collectibles}', 1, NULL, 13),
  ('lego_buildings', 'lego', 'US', 'https://brkox.com/collections/buildings-landmarks', '{LEGO,Architecture,Collectibles}', 1, NULL, 13),
  ('lego_christmas', 'lego', 'US', 'https://brkox.com/collections/christmas-light-kits', '{LEGO,Collectibles}', 1, NULL, 13)
ON CONFLICT ("program", "store") DO NOTHING;
