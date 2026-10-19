-- Free-text search (searchClauses in src/server/model/pins.ts) looks for each
-- typed word in every pin's address, title and description, and in every tag
-- name. With no index those were sequential scans of "Pin" and "PinTagCache"
-- (136k rows) on every search: about 1.8 s in production for one word, 1.1 s
-- of it the tags and 0.66 s the pins. Trigram indexes answer the whole-word
-- regexes from the index, as 0104 does for translated titles. A word shorter
-- than three characters yields no trigrams and is still scanned.
--
-- The title/description expression must read exactly as the query writes it.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "IX_PinTagCache_name_trgm" ON "PinTagCache" USING gin (("name"::text) gin_trgm_ops);
CREATE INDEX "IX_Pin_address_trgm" ON "Pin" USING gin ("address" gin_trgm_ops);
CREATE INDEX "IX_Pin_title_description_trgm" ON "Pin" USING gin ((("title" || ' ' || COALESCE("description", ''))) gin_trgm_ops);
ANALYZE "PinTagCache";
ANALYZE "Pin";
