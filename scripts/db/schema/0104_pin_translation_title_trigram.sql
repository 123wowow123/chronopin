-- Free-text search looks for what was typed in every translated title
-- (searchClauses in src/server/model/pins.ts). Without an index that read
-- all of "PinTranslation" - whole translated pins, every language - on each
-- search; a trigram index answers a Latin, Cyrillic or other word-spaced
-- query from the index (30 ms -> 0.1 ms locally). Chinese, Japanese, Korean,
-- Hindi and Thai text yields no trigrams and is still scanned.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "IX_PinTranslation_title_trgm" ON "PinTranslation" USING gin ("title" gin_trgm_ops);
