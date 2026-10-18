-- Each translated field's TextShape (src/server/model/pinTranslation.ts): whether its first 200
-- characters hold a letter or digit (hasWords), its length, <li> and <cite counts and last non-space
-- character, which is all wholeTranslation needs. The admin's translation counts (Settings) and the
-- export used to work these out from every translation's full text on each request - two seconds of
-- reading ~100 MB on a laptop, far more on the VM. Stored, they are a few dozen bytes a row, and the
-- database keeps them in step on every write. [[:alnum:]] agreed with hasWords' [\p{L}\p{N}] on
-- every one of the 170,195 pin and translation texts there were (2026-10-01); they differ only on a
-- text of nothing but superscripts or fractions ("²", "½").

CREATE FUNCTION "textShape"("t" text) RETURNS jsonb
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE WHEN "t" IS NULL THEN NULL ELSE jsonb_build_object(
    'words', left("t", 200) ~ '[[:alnum:]]',
    'length', length("t"),
    'li', (length("t") - length(replace("t", '<li>', ''))) / 4,
    'cite', (length("t") - length(replace("t", '<cite', ''))) / 5,
    'end', right(regexp_replace("t", '\s+$', ''), 1)) END
$$;

CREATE FUNCTION "translationShapes"("title" text, "description" text, "longFormSummary" text, "dateConfidenceReasoning" text, "delayReasoning" text)
RETURNS jsonb
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT jsonb_build_object(
    'title', "textShape"("title"),
    'description', "textShape"("description"),
    'longFormSummary', "textShape"("longFormSummary"),
    'dateConfidenceReasoning', "textShape"("dateConfidenceReasoning"),
    'delayReasoning', "textShape"("delayReasoning"))
$$;

ALTER TABLE "PinTranslation" ADD COLUMN "shapes" jsonb NOT NULL
  GENERATED ALWAYS AS ("translationShapes"("title", "description", "longFormSummary", "dateConfidenceReasoning", "delayReasoning")) STORED;
