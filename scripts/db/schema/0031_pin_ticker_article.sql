-- A pin's tickers can also come from its article: the scrape's extraction
-- names the listed companies the story is about or moves (origin 'article'),
-- and the create form or an API caller sends them with the pin.
ALTER TABLE "PinTicker" DROP CONSTRAINT "CK_PinTicker_origin";
ALTER TABLE "PinTicker" ADD CONSTRAINT "CK_PinTicker_origin" CHECK ("origin" IN ('company', 'manual', 'article'));
