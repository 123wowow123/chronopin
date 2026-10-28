-- Clean tracking text from Pin.longFormSummary and PinTranslation.longFormSummary,
-- update sourceHash and fieldHashes, and record translation tracking in Pin SourceWiki.

-- 1. Identify the 1,882 affected pins
CREATE TEMP TABLE affected_pins AS
SELECT id, "title", "description", "longFormSummary", "dateConfidenceReasoning", "delayReasoning", "sourceUrl"
FROM "Pin"
WHERE "longFormSummary" LIKE '%<p>Translations completed using Gemini 3.8 Flash.</p>';

-- 2. Define the exact tracking paragraph per locale
CREATE TEMP TABLE locale_tails (locale varchar(8) PRIMARY KEY, tail text NOT NULL);
INSERT INTO locale_tails (locale, tail) VALUES
  ('ar', '<p>اكتملت الترجمات باستخدام Gemini 3.8 Flash.</p>'),
  ('de', '<p>Übersetzungen wurden mit Gemini 3.8 Flash erstellt.</p>'),
  ('es', '<p>Traducciones completadas usando Gemini 3.8 Flash.</p>'),
  ('fr', '<p>Traductions réalisées avec Gemini 3.8 Flash.</p>'),
  ('hi', '<p>जेमिनी 3.8 फ्लैश का उपयोग करके अनुवाद पूरा किया गया।</p>'),
  ('id', '<p>Terjemahan diselesaikan menggunakan Gemini 3.8 Flash.</p>'),
  ('it', '<p>Traduzioni completate utilizzando Gemini 3.8 Flash.</p>'),
  ('ja', '<p>翻訳は Gemini 3.8 Flash を使用して完了しました。</p>'),
  ('ko', '<p>Gemini 3.8 Flash를 사용하여 번역이 완료되었습니다.</p>'),
  ('ms', '<p>Terjemahan selesai menggunakan Gemini 3.8 Flash.</p>'),
  ('pt', '<p>Traduções concluídas usando Gemini 3.8 Flash.</p>'),
  ('ru', '<p>Переводы выполнены с использованием Gemini 3.8 Flash.</p>'),
  ('th', '<p>การแปลเสร็จสมบูรณ์โดยใช้ Gemini 3.8 Flash</p>'),
  ('vi', '<p>Bản dịch được hoàn thành bằng cách sử dụng Gemini 3.8 Flash.</p>'),
  ('zh', '<p>使用 Gemini 3.8 Flash 完成翻译。</p>');

-- 3. Strip tracking paragraph from Pin.longFormSummary
UPDATE "Pin" p
SET "longFormSummary" = CASE 
  WHEN p."longFormSummary" = '<p>Translations completed using Gemini 3.8 Flash.</p>' THEN NULL
  ELSE left(p."longFormSummary", length(p."longFormSummary") - length('<p>Translations completed using Gemini 3.8 Flash.</p>'))
END
FROM affected_pins ap
WHERE p.id = ap.id;

-- 4. Strip tracking paragraph from PinTranslation.longFormSummary and update sourceHash & fieldHashes
UPDATE "PinTranslation" pt
SET 
  "longFormSummary" = CASE 
    WHEN pt."longFormSummary" = lt.tail THEN NULL
    ELSE left(pt."longFormSummary", length(pt."longFormSummary") - length(lt.tail))
  END,
  "sourceHash" = encode(digest(
    COALESCE(p."title", '') || E'\n--\n' ||
    COALESCE(p."description", '') || E'\n--\n' ||
    COALESCE(p."longFormSummary", '') || E'\n--\n' ||
    COALESCE(p."dateConfidenceReasoning", '') || E'\n--\n' ||
    COALESCE(p."delayReasoning", ''),
    'sha1'
  ), 'hex'),
  "fieldHashes" = jsonb_build_object(
    'title', encode(digest(COALESCE(p."title", ''), 'sha1'), 'hex'),
    'description', encode(digest(COALESCE(p."description", ''), 'sha1'), 'hex'),
    'longFormSummary', encode(digest(COALESCE(p."longFormSummary", ''), 'sha1'), 'hex'),
    'dateConfidenceReasoning', encode(digest(COALESCE(p."dateConfidenceReasoning", ''), 'sha1'), 'hex'),
    'delayReasoning', encode(digest(COALESCE(p."delayReasoning", ''), 'sha1'), 'hex')
  ),
  "utcUpdatedDateTime" = now()
FROM affected_pins ap
JOIN "Pin" p ON p.id = ap.id
JOIN locale_tails lt ON true
WHERE pt."pinId" = ap.id
  AND pt.locale = lt.locale
  AND pt."longFormSummary" LIKE ('%' || lt.tail);

-- 5. Ensure Source and PinSource exist for pins 17903 and 17909
INSERT INTO "Source" ("urlKey", "url", "kind", "status", "generatedBy", "wikiVersion")
VALUES 
  ('centralmarketlancaster.com', 'https://centralmarketlancaster.com/', 'web', 'ready', 'gemini-3.8-flash/translations', 1),
  ('azstateparks.com/lost-dutchman', 'https://azstateparks.com/lost-dutchman', 'web', 'ready', 'gemini-3.8-flash/translations', 1)
ON CONFLICT ("urlKey") DO NOTHING;

INSERT INTO "PinSource" ("pinId", "sourceId", "role", "summarizedWikiVersion")
SELECT 17903, s.id, 'source', 1
FROM "Source" s WHERE s."urlKey" = 'centralmarketlancaster.com'
ON CONFLICT ("pinId", "sourceId") DO NOTHING;

INSERT INTO "PinSource" ("pinId", "sourceId", "role", "summarizedWikiVersion")
SELECT 17909, s.id, 'source', 1
FROM "Source" s WHERE s."urlKey" = 'azstateparks.com/lost-dutchman'
ON CONFLICT ("pinId", "sourceId") DO NOTHING;

-- 6. Add translation tracking note ONLY to the pin wiki (SourceWiki)
CREATE TEMP TABLE pin_primary_source AS
SELECT DISTINCT ON (ps."pinId")
  ps."pinId",
  ps."sourceId",
  p.title AS pin_title,
  s.title AS source_title
FROM affected_pins ap
JOIN "Pin" p ON p.id = ap.id
JOIN "PinSource" ps ON ps."pinId" = ap.id AND ps."utcRemovedDateTime" IS NULL
JOIN "Source" s ON s.id = ps."sourceId"
ORDER BY ps."pinId", CASE WHEN ps.role = 'source' THEN 0 ELSE 1 END, ps."sourceId";

-- 6a. For sources WITH an existing root SourceWiki: add a child page
INSERT INTO "SourceWiki" ("sourceId", "parentId", "position", "type", "title", "summary", "body", "tags")
SELECT 
  sw.id_source,
  sw.root_id,
  sw.next_pos,
  'Metadata',
  'Translations',
  'Translations completed using Gemini 3.8 Flash.',
  'Translations completed using Gemini 3.8 Flash across 15 target locales (es, fr, de, ja, zh, ko, hi, ar, th, it, ru, pt, ms, vi, id).',
  ARRAY['translation'::varchar, 'gemini-3.8-flash'::varchar]
FROM (
  SELECT 
    sw_root."sourceId" AS id_source,
    sw_root.id AS root_id,
    1 + COALESCE((SELECT max(position) FROM "SourceWiki" WHERE "parentId" = sw_root.id), 0) AS next_pos
  FROM (
    SELECT DISTINCT "sourceId" FROM pin_primary_source
  ) pps
  JOIN "SourceWiki" sw_root ON sw_root."sourceId" = pps."sourceId" AND sw_root."parentId" IS NULL
  WHERE NOT EXISTS (
    SELECT 1 FROM "SourceWiki" existing
    WHERE existing."sourceId" = sw_root."sourceId"
      AND (existing."title" = 'Translations' OR existing.tags @> ARRAY['translation'::varchar])
  )
) sw;

-- 6b. For sources WITHOUT a root SourceWiki: add root SourceWiki
INSERT INTO "SourceWiki" ("sourceId", "parentId", "position", "type", "title", "summary", "body", "tags")
SELECT 
  pps."sourceId",
  NULL,
  0,
  'Web Page',
  COALESCE(pps.source_title, pps.pin_title, 'Source'),
  'Translations completed using Gemini 3.8 Flash.',
  'Translations completed using Gemini 3.8 Flash across 15 target locales (es, fr, de, ja, zh, ko, hi, ar, th, it, ru, pt, ms, vi, id).',
  ARRAY['translation'::varchar, 'gemini-3.8-flash'::varchar]
FROM (
  SELECT DISTINCT ON ("sourceId") "sourceId", pin_title, source_title
  FROM pin_primary_source
) pps
WHERE NOT EXISTS (
  SELECT 1 FROM "SourceWiki" sw WHERE sw."sourceId" = pps."sourceId"
);

-- Ensure Source and PinSource keep summary in sync so summaryStale remains false
UPDATE "Source" s
SET "status" = 'ready',
    "wikiVersion" = GREATEST(s."wikiVersion", 1),
    "generatedBy" = COALESCE(s."generatedBy", 'gemini-3.8-flash/translations')
FROM (SELECT DISTINCT "sourceId" FROM pin_primary_source) pps
WHERE s.id = pps."sourceId";

UPDATE "PinSource" ps
SET "summarizedWikiVersion" = s."wikiVersion"
FROM "Source" s
JOIN pin_primary_source pps ON pps."sourceId" = s.id
WHERE ps."pinId" = pps."pinId"
  AND ps."sourceId" = pps."sourceId"
  AND (ps."summarizedWikiVersion" IS NULL OR ps."summarizedWikiVersion" < s."wikiVersion");

-- Verification counts to output:
SELECT count(*) AS remaining_pin_content_tracking FROM "Pin" WHERE "longFormSummary" ILIKE '%Translations completed using Gemini 3.8 Flash%';
SELECT count(*) AS remaining_pt_content_tracking FROM "PinTranslation" pt JOIN affected_pins ap ON ap.id = pt."pinId" WHERE pt."longFormSummary" ILIKE '%Gemini 3.8 Flash%';
SELECT count(*) AS total_wikis_with_tracking FROM "SourceWiki" WHERE tags @> ARRAY['gemini-3.8-flash'::varchar];

