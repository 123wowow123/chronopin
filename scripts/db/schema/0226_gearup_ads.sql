-- GearUP game booster (CJ Affiliate advertiser 7804601, offer accepted
-- 2026-10-27): a ping-reducing subscription for PC and mobile games, 70% of
-- each paid subscription. The link is CJ's tracked click URL for the ChronoPin
-- property (101897457) and GearUP's evergreen link (17255582), which CJ keeps
-- valid; taggedAdUrl leaves non-Amazon, non-eBay links as they are. CJ lists
-- the US, UK, Canada, Germany, France, Spain and Japan as serviceable, so one
-- row per store we have. Served as a program ad (copy in ads.programs.gearup).
INSERT INTO "Ad" ("program", "kind", "store", "url", "categories", "weight", "rewardUsd", "minAge")
SELECT 'gearup', 'special', s, 'https://www.tkqlhce.com/click-101897457-17255582', '{Gaming,Esports,Technology}', 1, NULL, 13
FROM unnest(ARRAY['US', 'GB', 'CA', 'DE', 'FR', 'ES', 'JP']) AS s
ON CONFLICT ("program", "store") DO NOTHING;
