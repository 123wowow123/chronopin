#!/usr/bin/env python3
"""
Audits and removes accidental model attribution / tracking text from customer-facing
Pin content (Pin.longFormSummary, Pin.description, and PinTranslation.longFormSummary / description).
Relocates tracking notes strictly into the internal OKF Pin wiki (SourceWiki) without
mutating Source.status or Source.wikiVersion on unbuilt sources.

Usage:
    python3 .agents/skills/prod-translations/scripts/audit_and_clean_content.py [--apply]
"""

import subprocess
import sys

def run_prod_sql(sql: str) -> str:
    res = subprocess.run(
        ['scripts/prod-sql.sh'],
        input=sql.encode('utf-8'),
        capture_output=True,
        check=True
    )
    return res.stdout.decode('utf-8')

def main():
    apply_changes = '--apply' in sys.argv

    # 1. Check if any pins or translations currently leak tracking text across all 15 localized patterns
    check_sql = """
WITH leak_patterns AS (
  SELECT unnest(ARRAY[
    '%Translations completed using Gemini%',
    '%Traducciones completadas usando Gemini%',
    '%Traductions réalisées avec Gemini%',
    '%Übersetzungen wurden mit Gemini%',
    '%翻訳は Gemini%',
    '%使用 Gemini 3.8 Flash 完成翻译%',
    '%Gemini 3.8 Flash를 사용하여 번역이%',
    '%जेमिनी 3.8 फ्लैश का उपयोग करके अनुवाद%',
    '%اكتملت الترجمات باستخدام Gemini%',
    '%การแปลเสร็จสมบูรณ์โดยใช้ Gemini%',
    '%Traduzioni completate utilizzando Gemini%',
    '%Переводы выполнены с использованием Gemini%',
    '%Traduções concluídas usando Gemini%',
    '%Terjemahan selesai menggunakan Gemini%',
    '%Bản dịch được hoàn thành bằng cách sử dụng Gemini%',
    '%Terjemahan diselesaikan menggunakan Gemini%'
  ]) AS pat
)
SELECT 
  (SELECT count(*) FROM "Pin" p WHERE EXISTS (
    SELECT 1 FROM leak_patterns lp WHERE p."longFormSummary" ILIKE lp.pat OR p.description ILIKE lp.pat
  )) AS pin_leaks,
  (SELECT count(*) FROM "PinTranslation" pt WHERE EXISTS (
    SELECT 1 FROM leak_patterns lp WHERE pt."longFormSummary" ILIKE lp.pat OR pt.description ILIKE lp.pat
  )) AS pt_leaks;
"""
    output = run_prod_sql(check_sql)
    print("Pre-audit check:")
    print(output)

    clean_sql = """
-- 1. Define exact tail strings per locale
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

-- 2. Identify pins with tracking text in English Pin OR in any PinTranslation locale
CREATE TEMP TABLE affected_pins AS
SELECT DISTINCT p.id, p."title", p."description", p."longFormSummary", p."dateConfidenceReasoning", p."delayReasoning", p."sourceUrl"
FROM "Pin" p
LEFT JOIN "PinTranslation" pt ON pt."pinId" = p.id
LEFT JOIN locale_tails lt ON lt.locale = pt.locale
WHERE p."longFormSummary" LIKE '%<p>Translations completed using Gemini 3.8 Flash.</p>'
   OR p."longFormSummary" ILIKE '%Translations completed using Gemini 3.8 Flash%'
   OR (lt.tail IS NOT NULL AND position(lt.tail in coalesce(pt."longFormSummary", '')) > 0);

-- 3. Strip tracking paragraph from Pin.longFormSummary
UPDATE "Pin" p
SET "longFormSummary" = CASE 
  WHEN p."longFormSummary" = '<p>Translations completed using Gemini 3.8 Flash.</p>' THEN NULL
  WHEN p."longFormSummary" LIKE '%<p>Translations completed using Gemini 3.8 Flash.</p>' THEN left(p."longFormSummary", length(p."longFormSummary") - length('<p>Translations completed using Gemini 3.8 Flash.</p>'))
  ELSE regexp_replace(p."longFormSummary", '<p>Translations completed using Gemini 3\\.8 Flash\\.</p>', '', 'g')
END
FROM affected_pins ap
WHERE p.id = ap.id
  AND p."longFormSummary" ILIKE '%Translations completed using Gemini 3.8 Flash%';

-- 4. Strip tracking paragraph from PinTranslation.longFormSummary and update hashes for all affected pins
UPDATE "PinTranslation" pt
SET 
  "longFormSummary" = CASE 
    WHEN pt."longFormSummary" = lt.tail THEN NULL
    WHEN pt."longFormSummary" LIKE ('%' || lt.tail) THEN left(pt."longFormSummary", length(pt."longFormSummary") - length(lt.tail))
    ELSE replace(pt."longFormSummary", lt.tail, '')
  END,
  "sourceHash" = encode(digest(
    COALESCE(p."title", '') || E'\\n--\\n' ||
    COALESCE(p."description", '') || E'\\n--\\n' ||
    COALESCE(p."longFormSummary", '') || E'\\n--\\n' ||
    COALESCE(p."dateConfidenceReasoning", '') || E'\\n--\\n' ||
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
  AND pt.locale = lt.locale;

-- 5. Add translation tracking note ONLY to the pin wiki (SourceWiki)
CREATE TEMP TABLE pin_primary_source AS
SELECT DISTINCT ON (ps."pinId")
  ps."pinId",
  ps."sourceId",
  p.title AS pin_title,
  s.title AS source_title,
  p."longFormSummary"
FROM affected_pins ap
JOIN "Pin" p ON p.id = ap.id
JOIN "PinSource" ps ON ps."pinId" = ap.id AND ps."utcRemovedDateTime" IS NULL
JOIN "Source" s ON s.id = ps."sourceId"
ORDER BY ps."pinId", CASE WHEN ps.role = 'source' THEN 0 ELSE 1 END, ps."sourceId";

-- Attach to existing root SourceWiki as child page
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
  FROM (SELECT DISTINCT "sourceId" FROM pin_primary_source) pps
  JOIN "SourceWiki" sw_root ON sw_root."sourceId" = pps."sourceId" AND sw_root."parentId" IS NULL
  WHERE NOT EXISTS (
    SELECT 1 FROM "SourceWiki" existing
    WHERE existing."sourceId" = sw_root."sourceId"
      AND (existing."title" = 'Translations' OR existing.tags @> ARRAY['translation'::varchar])
  )
) sw;

-- If no root SourceWiki exists, create root SourceWiki
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

-- Record generatedBy without marking unbuilt sources as 'ready' or bumping wikiVersion from 0
UPDATE "Source" s
SET "generatedBy" = COALESCE(s."generatedBy", 'gemini-3.8-flash/translations')
FROM (SELECT DISTINCT "sourceId" FROM pin_primary_source) pps
WHERE s.id = pps."sourceId";

UPDATE "PinSource" ps
SET "summarizedWikiVersion" = GREATEST(s."wikiVersion", 1)
FROM "Source" s
JOIN pin_primary_source pps ON pps."sourceId" = s.id
WHERE ps."pinId" = pps."pinId"
  AND ps."sourceId" = pps."sourceId"
  AND pps."longFormSummary" IS NOT NULL
  AND btrim(pps."longFormSummary") != ''
  AND (ps."summarizedWikiVersion" IS NULL OR ps."summarizedWikiVersion" < GREATEST(s."wikiVersion", 1));

SELECT count(*) AS remaining_pin_content_leaks FROM "Pin" WHERE "longFormSummary" ILIKE '%Translations completed using Gemini%';
"""

    if not apply_changes:
        print("\nDry run: To execute cleanup, run with --apply")
        return

    print("\nExecuting cleanup on production database...")
    result = run_prod_sql(clean_sql)
    print(result)
    print("Cleanup completed successfully.")

if __name__ == '__main__':
    main()
