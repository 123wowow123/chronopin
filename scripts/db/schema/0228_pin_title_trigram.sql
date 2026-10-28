-- Misspelled-title search (withFuzzyTitles in src/server/model/searchPin.ts)
-- ranks pins by trigram similarity to their title. With no index on the bare
-- title that was a sequential scan of "Pin" (~80 ms locally, more on the
-- production box) on every search the embedding models were unsure of.
-- The query asks `"title" % text OR text <% "title"`, which this index answers.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "IX_Pin_title_trgm" ON "Pin" USING gin (("title"::text) gin_trgm_ops);
ANALYZE "Pin";
