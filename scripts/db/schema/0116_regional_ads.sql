-- Program ads for the other Amazon stores the Associates account has a rate
-- card for (affiliate-program.amazon.com Rate Plan, read 2026-10-02): Canada,
-- France, Germany, Italy, the Netherlands, Poland, Spain, Sweden and the UK.
-- Their words are the same ads.programs.<program> messages in every language;
-- a row is only where the ad goes, who it is for and what it pays.
--
-- A store is only served once AppSetting "amazonTags" holds its own tracking
-- id ({"GB": "xxx-21", ...}), so these sit unused until then and every viewer
-- keeps getting the US ads. The account lists one tracking id so far.
--
-- Only programs that card has a bounty for in that country, with the same
-- audience and weights as the US row of the program:
--   prime       Prime free trial   CA CA$3, FR/DE/IT/ES EUR 3, NL EUR 4, PL PLN 5, SE SEK 50, GB GBP 3
--   audible     free trial         FR/DE/IT/ES EUR 10, GB GBP 5 (nothing in CA/NL/PL/SE)
--   primevideo  free trial         DE EUR 3, GB GBP 3 - the storefront page only resolves on
--                                  amazon.de and amazon.co.uk; elsewhere it 404s or leaves
--                                  amazon.* for primevideo.com, where the tag earns nothing
-- No Business, Haul, Fresh, pet or Trade-In rows: the cards list no bounty
-- for them outside the US (Trade-In: "not currently available to you").
--
-- "rewardUsd" is the bounty in dollars at about CAD 0.72, EUR 1.15, GBP 1.30,
-- PLN 0.27, SEK 0.10: it only nudges the pick (rewardWeight in src/lib/ads.ts),
-- so the exchange rate does not need to be exact. Links are the store's own
-- /prime and /hz/audible/mlp, which resolve in all of them (checked
-- 2026-10-02); the card's own home pages are amazon.com addresses.
INSERT INTO "Ad" ("program", "kind", "store", "url", "categories", "weight", "rewardUsd", "targetAgeFrom", "targetAgeTo") VALUES
  ('prime', 'special', 'CA', 'https://www.amazon.ca/prime', '{}', 1.5, 2.2, NULL, NULL),
  ('prime', 'special', 'FR', 'https://www.amazon.fr/prime', '{}', 1.5, 3.5, NULL, NULL),
  ('prime', 'special', 'DE', 'https://www.amazon.de/prime', '{}', 1.5, 3.5, NULL, NULL),
  ('prime', 'special', 'IT', 'https://www.amazon.it/prime', '{}', 1.5, 3.5, NULL, NULL),
  ('prime', 'special', 'ES', 'https://www.amazon.es/prime', '{}', 1.5, 3.5, NULL, NULL),
  ('prime', 'special', 'NL', 'https://www.amazon.nl/prime', '{}', 1.5, 4.6, NULL, NULL),
  ('prime', 'special', 'PL', 'https://www.amazon.pl/prime', '{}', 1.5, 1.4, NULL, NULL),
  ('prime', 'special', 'SE', 'https://www.amazon.se/prime', '{}', 1.5, 5, NULL, NULL),
  ('prime', 'special', 'GB', 'https://www.amazon.co.uk/prime', '{}', 1.5, 3.9, NULL, NULL),
  ('audible', 'special', 'FR', 'https://www.amazon.fr/hz/audible/mlp', '{Literature,Manga,Education,Science,Business}', 1.5, 11.5, 25, NULL),
  ('audible', 'special', 'DE', 'https://www.amazon.de/hz/audible/mlp', '{Literature,Manga,Education,Science,Business}', 1.5, 11.5, 25, NULL),
  ('audible', 'special', 'IT', 'https://www.amazon.it/hz/audible/mlp', '{Literature,Manga,Education,Science,Business}', 1.5, 11.5, 25, NULL),
  ('audible', 'special', 'ES', 'https://www.amazon.es/hz/audible/mlp', '{Literature,Manga,Education,Science,Business}', 1.5, 11.5, 25, NULL),
  ('audible', 'special', 'GB', 'https://www.amazon.co.uk/hz/audible/mlp', '{Literature,Manga,Education,Science,Business}', 1.5, 6.5, 25, NULL),
  ('primevideo', 'special', 'DE', 'https://www.amazon.de/gp/video/storefront', '{Movie,TV,Anime,Sports}', 1.5, 3.5, 18, 44),
  ('primevideo', 'special', 'GB', 'https://www.amazon.co.uk/gp/video/storefront', '{Movie,TV,Anime,Sports}', 1.5, 3.9, 18, 44);
