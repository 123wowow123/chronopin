-- Abracadabra NYC (CJ Affiliate advertiser 7889430, offer accepted 2026-10-06):
-- costumes, cosplay, props and collectibles, 5% per sale (up to 10% for
-- exclusive publishers) with a 45-day cookie. The link is CJ's tracked click
-- URL for the ChronoPin property (101897457) and the advertiser's homepage
-- link (17267207); taggedAdUrl leaves non-Amazon, non-eBay links as they are.
-- Served as a program ad (copy in ads.programs.abracadabra, tile in AdBlock),
-- tagged for the pins it suits. Reward is unknown in dollars per click, so it
-- is left NULL and the row only weighs a little against the Amazon programs.
INSERT INTO "Ad" ("program", "kind", "store", "url", "categories", "weight", "rewardUsd", "minAge") VALUES
  ('abracadabra', 'special', 'US', 'https://www.jdoqocy.com/click-101897457-17267207', '{Shows,Anime,Gaming,Movie,TV,Collectibles}', 0.8, NULL, 13)
ON CONFLICT ("program", "store") DO NOTHING;
