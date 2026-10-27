-- Marshall Headphones US (CJ Affiliate advertiser 6888687, joined 2026-10-27):
-- headphones, speakers and earbuds, text link "Marshall US" (17035118). The
-- link is CJ's tracked click URL for the ChronoPin property (101897457);
-- taggedAdUrl leaves non-Amazon, non-eBay links as they are. Served as a
-- program ad (copy in ads.programs.marshall, tile in AdBlock).
INSERT INTO "Ad" ("program", "kind", "store", "url", "categories", "weight", "rewardUsd", "minAge") VALUES
  ('marshall', 'special', 'US', 'https://www.tkqlhce.com/click-101897457-17035118', '{Audio,Electronics,Music,Concerts}', 1, NULL, 13)
ON CONFLICT ("program", "store") DO NOTHING;
