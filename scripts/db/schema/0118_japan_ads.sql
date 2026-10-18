-- Program ads for Amazon Japan. Japan is not in Global Earning: it is its own
-- Associates program (affiliate.amazon.co.jp) with its own tracking id, set in
-- AppSetting "amazonTags" ({"JP": "..."}); until then Japanese viewers get the
-- US ads. The new account's Japan rate card could not be read (its help and
-- rate-plan pages are empty), so no bounty is known: rewardUsd stays null and
-- every ad has the same weight and no audience targeting, so none is favoured
-- over another (owner, 2026-10-03: "if no bonus is found then all ads will be
-- equal weight"). Re-weigh them once the account shows what Japan pays.
--
-- Only programs whose Japan page resolves (checked 2026-10-03): Prime, Audible,
-- Prime Video, Amazon Business, Haul, Fresh, Trade-In. No pet supplies: its
-- category page is a node id per store, not checked for Japan. Sign-up
-- programs stay 18+ (the column default).
INSERT INTO "Ad" ("program", "kind", "store", "url", "categories", "weight", "rewardUsd", "targetAgeFrom", "targetAgeTo") VALUES
  ('prime', 'special', 'JP', 'https://www.amazon.co.jp/prime', '{}', 1, NULL, NULL, NULL),
  ('audible', 'special', 'JP', 'https://www.amazon.co.jp/hz/audible/mlp', '{}', 1, NULL, NULL, NULL),
  ('primevideo', 'special', 'JP', 'https://www.amazon.co.jp/gp/video/storefront', '{}', 1, NULL, NULL, NULL),
  ('business', 'special', 'JP', 'https://business.amazon.co.jp', '{}', 1, NULL, NULL, NULL),
  ('haul', 'special', 'JP', 'https://www.amazon.co.jp/haul/store', '{}', 1, NULL, NULL, NULL),
  ('fresh', 'bonus', 'JP', 'https://www.amazon.co.jp/fresh', '{}', 1, NULL, NULL, NULL),
  ('tradein', 'tradein', 'JP', 'https://www.amazon.co.jp/tradein', '{}', 1, NULL, NULL, NULL);
