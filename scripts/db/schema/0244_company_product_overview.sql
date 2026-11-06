-- A product page reads like a short wiki article: an overview and an infobox.
--
--   overview  plain paragraphs separated by a blank line. "[pin:123]" cites a
--             pin of Chronopin (shown as a numbered link, listed under Sources).
--   facts     the infobox, an array of {"label": "...", "value": "...", "pinId": 123?}
--             where pinId, when present, is the pin the value comes from.
--
-- Written only from what the product's own pins (and their sources) say.
ALTER TABLE "CompanyProduct" ADD COLUMN "overview" text, ADD COLUMN "facts" jsonb NOT NULL DEFAULT '[]'::jsonb;
