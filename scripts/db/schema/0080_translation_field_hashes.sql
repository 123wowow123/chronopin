-- What each of a translation's English fields was when it was made: the
-- sha1 of the field's text ('' when empty), under the field's name. The row's
-- sourceHash only says the pin has been edited since; these say which of its
-- words were, so the admin's list of outdated translations (and a hand
-- round) can redo just the fields that changed and keep the rest.
-- NULL on a row made before them whose pin had already been edited: which
-- fields changed is not known, so the whole translation is made again.
ALTER TABLE "PinTranslation" ADD COLUMN "fieldHashes" jsonb;

-- digest(): Postgres has no sha1 of its own, and sourceHash is one.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- A row still current was made from the pin's words as they are now.
UPDATE "PinTranslation" t
SET "fieldHashes" = jsonb_build_object(
  'title', encode(digest(convert_to(coalesce(p."title", ''), 'UTF8'), 'sha1'), 'hex'),
  'description', encode(digest(convert_to(coalesce(p."description", ''), 'UTF8'), 'sha1'), 'hex'),
  'longFormSummary', encode(digest(convert_to(coalesce(p."longFormSummary", ''), 'UTF8'), 'sha1'), 'hex'),
  'dateConfidenceReasoning', encode(digest(convert_to(coalesce(p."dateConfidenceReasoning", ''), 'UTF8'), 'sha1'), 'hex'),
  'delayReasoning', encode(digest(convert_to(coalesce(p."delayReasoning", ''), 'UTF8'), 'sha1'), 'hex')
)
FROM "Pin" p
WHERE p."id" = t."pinId"
  AND t."sourceHash" = encode(digest(convert_to(
    coalesce(p."title", '') || E'\n--\n' || coalesce(p."description", '') || E'\n--\n' || coalesce(p."longFormSummary", '')
      || E'\n--\n' || coalesce(p."dateConfidenceReasoning", '') || E'\n--\n' || coalesce(p."delayReasoning", ''),
    'UTF8'), 'sha1'), 'hex');
