-- Watch ads (src/components/ads/AdBlock.tsx): the pre-owned luxury watches of
-- ten desirable brands on eBay, for Rolex first (owner, 2026-10-05: "add ads
-- for rolex and other desirable watches"; README "referral for rolex?").
-- Amazon does not sell new Rolex, Patek or Audemars Piguet and its third-party
-- listings carry no brand to advertise, while the eBay Partner Network
-- campaign (src/lib/affiliate.ts) is already live, so the link is an eBay
-- search of the Wristwatches category (31387) for the brand; the campaign id is
-- added when it is served, as the Amazon tag is. The words are the app's own
-- (ads.watchBody with the brand's name from WATCH_BRANDS in src/lib/ads.ts).
--
-- Tagged Watches, so on a Watches pin's page they are related and come first;
-- elsewhere the pool has a small share (KIND_SHARE) so it shows now and then.
-- Rolex weighs double. 18+: they are for adult buyers of expensive goods.
ALTER TABLE "Ad" DROP CONSTRAINT IF EXISTS "Ad_kind_check";
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_kind_check" CHECK ("kind" IN ('special', 'bonus', 'tradein', 'watch'));

INSERT INTO "Ad" ("program", "kind", "store", "url", "categories", "weight", "rewardUsd", "minAge") VALUES
  ('watch_rolex', 'watch', 'US', 'https://www.ebay.com/sch/31387/i.html?_nkw=rolex&LH_BIN=1', '{Watches,Luxury}', 2, NULL, 18),
  ('watch_omega', 'watch', 'US', 'https://www.ebay.com/sch/31387/i.html?_nkw=omega&LH_BIN=1', '{Watches,Luxury}', 1, NULL, 18),
  ('watch_patek', 'watch', 'US', 'https://www.ebay.com/sch/31387/i.html?_nkw=patek+philippe&LH_BIN=1', '{Watches,Luxury}', 1, NULL, 18),
  ('watch_ap', 'watch', 'US', 'https://www.ebay.com/sch/31387/i.html?_nkw=audemars+piguet&LH_BIN=1', '{Watches,Luxury}', 1, NULL, 18),
  ('watch_cartier', 'watch', 'US', 'https://www.ebay.com/sch/31387/i.html?_nkw=cartier&LH_BIN=1', '{Watches,Luxury}', 1, NULL, 18),
  ('watch_tudor', 'watch', 'US', 'https://www.ebay.com/sch/31387/i.html?_nkw=tudor&LH_BIN=1', '{Watches,Luxury}', 1, NULL, 18),
  ('watch_breitling', 'watch', 'US', 'https://www.ebay.com/sch/31387/i.html?_nkw=breitling&LH_BIN=1', '{Watches,Luxury}', 1, NULL, 18),
  ('watch_tag', 'watch', 'US', 'https://www.ebay.com/sch/31387/i.html?_nkw=tag+heuer&LH_BIN=1', '{Watches,Luxury}', 1, NULL, 18),
  ('watch_iwc', 'watch', 'US', 'https://www.ebay.com/sch/31387/i.html?_nkw=iwc&LH_BIN=1', '{Watches,Luxury}', 1, NULL, 18),
  ('watch_gs', 'watch', 'US', 'https://www.ebay.com/sch/31387/i.html?_nkw=grand+seiko&LH_BIN=1', '{Watches,Luxury}', 1, NULL, 18)
ON CONFLICT ("program", "store") DO NOTHING;
