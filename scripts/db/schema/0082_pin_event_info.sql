-- Who performs at an event pin and how to get in: the pin page shows it, and
-- its Event markup for search (src/lib/seo.ts) carries it as performer and
-- offers. Only pins people can attend get a row (isAttendableEvent) - a
-- concert, a match, a conference, a festival.
--
-- Everything here is read off a page, never typed from memory: the event's
-- own schema.org markup first, else its text read by Claude (or by a Claude
-- Code session when the app key has no credit). `npm run events:refresh`
-- fills it; see that script for the rules.
--
--   performers     [{ name, type, url? }] - type is 'Person' or
--                  'PerformingGroup' (a band, a team). Empty when the page
--                  names none; a conference without billed speakers has none.
--   ticketUrl      where tickets or registration are sold, as the page links
--                  it. Never constructed.
--   lowPrice,      the cheapest and dearest ticket the page quotes, in
--   highPrice      priceCurrency. Equal for one price; 0 for a free event.
--   priceCurrency  ISO 4217 ("USD").
--   availability   'InStock' (on sale, or free and open), 'SoldOut',
--                  'PreOrder' (announced, not yet on sale) - Google's three.
--                  Null when the page does not say; it goes stale, so
--                  checkedAt says when it was read.
--   onSaleDate     when tickets go on sale, for a PreOrder.
--   source         how it was read: 'markup' (the page's own JSON-LD),
--                  'claude' (the app key), 'session' (by hand in a Claude
--                  Code session) or 'hand' (a person; refresh never
--                  overwrites it).
--   sourceUrl      the page it was read from.
--
-- One row per pin. Like PinPlace this is looked-up data: Pin#update() never
-- touches it, so editing a pin cannot wipe it. Not in PinBaseView - only the
-- pin page reads it.
CREATE TABLE "PinEventInfo" (
  "pinId"              integer PRIMARY KEY REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "performers"         jsonb NOT NULL DEFAULT '[]',
  "ticketUrl"          varchar(4000),
  "lowPrice"           numeric(12, 2),
  "highPrice"          numeric(12, 2),
  "priceCurrency"      varchar(3),
  "availability"       varchar(16),
  "onSaleDate"         timestamptz,
  "source"             varchar(16) NOT NULL,
  "sourceUrl"          varchar(4000),
  "checkedAt"          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "CK_PinEventInfo_availability" CHECK ("availability" IN ('InStock', 'SoldOut', 'PreOrder')),
  CONSTRAINT "CK_PinEventInfo_source" CHECK ("source" IN ('markup', 'claude', 'session', 'hand')),
  CONSTRAINT "CK_PinEventInfo_price" CHECK ("lowPrice" IS NULL OR "lowPrice" >= 0),
  CONSTRAINT "CK_PinEventInfo_priceRange" CHECK ("highPrice" IS NULL OR "lowPrice" IS NULL OR "highPrice" >= "lowPrice"),
  CONSTRAINT "CK_PinEventInfo_performers" CHECK (jsonb_typeof("performers") = 'array')
);
