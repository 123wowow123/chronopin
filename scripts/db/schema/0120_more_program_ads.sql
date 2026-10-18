-- Seven more US program ads, from Amazon's "Earn more with Amazon Memberships
-- & Subscriptions" bounty page (amazon.com/b?node=53634300011) checked against
-- the account's rate card (affiliate-program.amazon.com Rate Plan,
-- 2026-10-03). Each URL is that bounty's own "Home Page" from the card, so a
-- click is credited to the right bounty; the tag is added when served.
--
--   primeyoung      Prime for Young Adults Trial / Paid Membership  $40
--   primeaccess     Prime Access Free Trial / Paid Membership        $40
--   babyregistry    Amazon Baby Registry Create                      $3
--   weddingregistry Amazon Wedding Registry Create                   $3
--   musicunlimited  Amazon Music Unlimited Free Trial                $3
--   kindleunlimited Kindle Unlimited Free Trial                      $3
--   subscribesave   Subscribe & Save, per category                   $0.25
--
-- Amazon Kids+ is on the page but not on the rate card (no bounty and no
-- Home Page), so it is not seeded. Weights are below the flagship Prime and
-- Audible (1.5) so the new programs share the "special" pool without
-- crowding them out: Prime Access is narrow by eligibility, registries and
-- Subscribe & Save are small bounties. Age targeting follows the audience
-- (Young Adults is 18-24 by definition; registries 25-40). Sign-up programs
-- stay 18+ (the column default). The new rows are US only: the other
-- countries' rate cards were not read for these programs.
INSERT INTO "Ad" ("program", "kind", "store", "url", "categories", "weight", "rewardUsd", "targetAgeFrom", "targetAgeTo") VALUES
  ('primeyoung', 'special', 'US', 'https://www.amazon.com/joinyoungadult', '{Gaming,Music,Anime,Movie,TV}', 1, 40, 18, 24),
  ('primeaccess', 'special', 'US', 'https://www.amazon.com/qualify', '{}', 0.5, 40, NULL, NULL),
  ('babyregistry', 'special', 'US', 'https://www.amazon.com/baby-reg/homepage', '{Family}', 0.6, 3, 25, 40),
  ('weddingregistry', 'special', 'US', 'https://www.amazon.com/gp/wedding/homepage', '{Wedding,Family}', 0.6, 3, 25, 40),
  ('musicunlimited', 'special', 'US', 'https://www.amazon.com/music/unlimited', '{Music,Audio}', 0.8, 3, 18, 44),
  ('kindleunlimited', 'special', 'US', 'https://www.amazon.com/kindleunlimited', '{Literature,Manga,Education}', 0.8, 3, 25, NULL),
  ('subscribesave', 'special', 'US', 'https://www.amazon.com/subscribeandsave', '{Food,Health,Retail}', 0.6, 0.25, 25, NULL)
ON CONFLICT ("program", "store") DO NOTHING;
