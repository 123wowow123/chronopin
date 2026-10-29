#!/usr/bin/env python3
"""
Checks the health of translations across all active Chronopin production pins.
- Verifies that all 15 target locales exist and match the current English text hash.
- Scans for any prohibited model attribution strings in public content.
- Outputs a clean terminal report and exits 0 if current, 1 if action is needed.

Usage:
    python3 .agents/skills/prod-translations/scripts/check_translations.py [--json]
"""

import json
import subprocess
import sys

LOCALES = ['es', 'fr', 'de', 'ja', 'zh', 'ko', 'hi', 'ar', 'th', 'it', 'ru', 'pt', 'ms', 'vi', 'id']

def run_prod_sql(sql: str) -> str:
    res = subprocess.run(
        ['scripts/prod-sql.sh'],
        input=sql.encode('utf-8'),
        capture_output=True,
        check=True
    )
    return res.stdout.decode('utf-8')

def main():
    json_mode = '--json' in sys.argv

    sql = """
WITH pin_hashes AS (
  SELECT p.id,
         p.title,
         encode(digest(convert_to(
           coalesce(p."title", '') || E'\\n--\\n' || coalesce(p."description", '') || E'\\n--\\n' || coalesce(p."longFormSummary", '')
             || E'\\n--\\n' || coalesce(p."dateConfidenceReasoning", '') || E'\\n--\\n' || coalesce(p."delayReasoning", ''),
           'UTF8'), 'sha1'), 'hex') AS current_hash
  FROM "Pin" p
  WHERE p."utcDeletedDateTime" IS NULL
),
locales AS (
  SELECT unnest(ARRAY['es','fr','de','ja','zh','ko','hi','ar','th','it','ru','pt','ms','vi','id']) AS loc
),
pin_locales AS (
  SELECT ph.id, ph.current_hash, l.loc
  FROM pin_hashes ph
  CROSS JOIN locales l
),
status AS (
  SELECT pl.id,
         pl.loc,
         CASE
           WHEN pt."pinId" IS NULL THEN 'missing'
           WHEN pt."sourceHash" != pl.current_hash THEN 'outdated'
           ELSE 'current'
         END AS state
  FROM pin_locales pl
  LEFT JOIN "PinTranslation" pt ON pt."pinId" = pl.id AND pt.locale = pl.loc
),
due_pins AS (
  SELECT DISTINCT id FROM status WHERE state != 'current'
),
counts AS (
  SELECT 
    (SELECT count(*) FROM "Pin" WHERE "utcDeletedDateTime" IS NULL) as active_pins,
    (SELECT count(*) FROM "PinTranslation") as total_translation_rows,
    (SELECT count(*) FROM status WHERE state = 'current') as current_rows,
    (SELECT count(*) FROM status WHERE state = 'outdated') as outdated_rows,
    (SELECT count(*) FROM status WHERE state = 'missing') as missing_rows,
    (SELECT count(*) FROM due_pins) as due_pins_count,
    (SELECT count(*) FROM "Pin" WHERE "longFormSummary" ILIKE '%Translations completed using Gemini%' OR description ILIKE '%Translations completed using Gemini%') as pins_with_content_tracking
)
SELECT json_build_object(
  'active_pins', active_pins,
  'total_translation_rows', total_translation_rows,
  'expected_translation_rows', active_pins * 15,
  'current_rows', current_rows,
  'outdated_rows', outdated_rows,
  'missing_rows', missing_rows,
  'due_pins_count', due_pins_count,
  'pins_with_content_tracking', pins_with_content_tracking,
  'percent_current', round((current_rows::numeric / nullif(active_pins * 15, 0)) * 100, 2)
)::text
FROM counts;
"""
    raw_output = run_prod_sql(sql).strip()
    # Find the JSON line in output
    data = None
    for line in raw_output.splitlines():
        line = line.strip()
        if line.startswith('{') and line.endswith('}'):
            try:
                data = json.loads(line)
                break
            except Exception:
                pass

    if not data:
        print("Failed to parse database output:")
        print(raw_output)
        sys.exit(2)

    if json_mode:
        print(json.dumps(data, indent=2))
    else:
        print("=" * 60)
        print("Chronopin Production Translation Health Check")
        print("=" * 60)
        print(f"Active Pins:               {data['active_pins']:,}")
        print(f"Total Translation Rows:    {data['total_translation_rows']:,}")
        print(f"Expected Translation Rows: {data['expected_translation_rows']:,}")
        print("-" * 60)
        print(f"Current & Valid:           {data['current_rows']:,} ({data['percent_current']}%)")
        print(f"Outdated (text edited):    {data['outdated_rows']:,}")
        print(f"Missing (never done):      {data['missing_rows']:,}")
        print(f"Pins Due for Translation:  {data['due_pins_count']:,}")
        print("-" * 60)
        print(f"Prohibited Tracking Text in Content: {data['pins_with_content_tracking']:,}")
        print("=" * 60)

        if data['pins_with_content_tracking'] > 0:
            print("❌ Prohibited tracking text found in Pin content!")
            print("   Run .agents/skills/prod-translations/scripts/audit_and_clean_content.py to fix.")
            sys.exit(1)

        if data['due_pins_count'] > 0:
            print(f"⚠️  {data['due_pins_count']} pin(s) require translation update.")
            print("   Run .agents/skills/prod-translations/scripts/sync_translations.py to translate.")
            sys.exit(1)

        print("✅ 100% of production pins are translated and up to date with zero content leaks.")
        sys.exit(0)

if __name__ == '__main__':
    main()

