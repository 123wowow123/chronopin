-- translationShapes (0108) called "textShape" unqualified. pg_restore runs with an empty
-- search_path, and PostgreSQL inlines the SQL function while creating the generated column
-- PinTranslation.shapes, so restoring a dump failed with `function textShape(text) does not
-- exist` and `npm run db:pull-prod` could not load production. The call is schema-qualified here;
-- nothing else changes, so the stored shapes stay as they are.
-- scripts/db/pullProd.sh pre-creates both functions from this file when it restores a dump taken
-- before this file reached production, so keep the file to these two statements.

CREATE OR REPLACE FUNCTION public."textShape"("t" text) RETURNS jsonb
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE WHEN "t" IS NULL THEN NULL ELSE jsonb_build_object(
    'words', left("t", 200) ~ '[[:alnum:]]',
    'length', length("t"),
    'li', (length("t") - length(replace("t", '<li>', ''))) / 4,
    'cite', (length("t") - length(replace("t", '<cite', ''))) / 5,
    'end', right(regexp_replace("t", '\s+$', ''), 1)) END
$$;

CREATE OR REPLACE FUNCTION public."translationShapes"("title" text, "description" text, "longFormSummary" text, "dateConfidenceReasoning" text, "delayReasoning" text)
RETURNS jsonb
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT jsonb_build_object(
    'title', public."textShape"("title"),
    'description', public."textShape"("description"),
    'longFormSummary', public."textShape"("longFormSummary"),
    'dateConfidenceReasoning', public."textShape"("dateConfidenceReasoning"),
    'delayReasoning', public."textShape"("delayReasoning"))
$$;
