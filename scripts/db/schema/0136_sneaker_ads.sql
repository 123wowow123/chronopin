-- Sneaker searches through the existing eBay Partner Network campaign.
-- Model names remain useful even when the live Browse API picture is unavailable.
ALTER TABLE "Ad" DROP CONSTRAINT IF EXISTS "Ad_kind_check";
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_kind_check" CHECK ("kind" IN ('special', 'bonus', 'tradein', 'watch', 'sneaker'));

INSERT INTO "Ad" ("program", "kind", "store", "url", "categories", "weight", "rewardUsd", "minAge") VALUES
  ('sneaker_af1', 'sneaker', 'US', 'https://www.ebay.com/sch/15709/i.html?_nkw=Nike+Air+Force+1&LH_BIN=1', '{Sneakers,Shoes,Air Force 1,Nike}', 2, NULL, 13),
  ('sneaker_dunk', 'sneaker', 'US', 'https://www.ebay.com/sch/15709/i.html?_nkw=Nike+Dunk&LH_BIN=1', '{Sneakers,Shoes,Dunk,Nike}', 1, NULL, 13),
  ('sneaker_jordan', 'sneaker', 'US', 'https://www.ebay.com/sch/15709/i.html?_nkw=Air+Jordan&LH_BIN=1', '{Sneakers,Shoes,Jordan,Nike}', 1, NULL, 13),
  ('sneaker_samba', 'sneaker', 'US', 'https://www.ebay.com/sch/15709/i.html?_nkw=adidas+Samba&LH_BIN=1', '{Sneakers,Shoes,Samba,adidas}', 1, NULL, 13),
  ('sneaker_nb', 'sneaker', 'US', 'https://www.ebay.com/sch/15709/i.html?_nkw=New+Balance+990&LH_BIN=1', '{Sneakers,Shoes,New Balance}', 1, NULL, 13),
  ('sneaker_asics', 'sneaker', 'US', 'https://www.ebay.com/sch/15709/i.html?_nkw=ASICS+GEL-Kayano&LH_BIN=1', '{Sneakers,Shoes,ASICS}', 1, NULL, 13)
ON CONFLICT ("program", "store") DO NOTHING;
