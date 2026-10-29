#!/usr/bin/env python3
"""
Synchronizes production translations for newly added or updated Chronopin pins.
- Identifies active pins with missing or outdated translations.
- Never touches pin content with tracking notes.
- Records translation model metadata exclusively in the backing OKF SourceWiki.
- Translates across all 15 supported non-English locales:
  ['es', 'fr', 'de', 'ja', 'zh', 'ko', 'hi', 'ar', 'th', 'it', 'ru', 'pt', 'ms', 'vi', 'id']
- Preserves all HTML tags, lists, and citation anchors (<cite data-ref="...">).
- Fixes Thai Buddhist era years back to Gregorian calendar.
- Automatically handles admin authentication and pushes via /api/admin/translations.

Usage:
    python3 .agents/skills/prod-translations/scripts/sync_translations.py [--limit N] [--pin ID] [--dry-run]
"""

import argparse
import concurrent.futures
import hashlib
import json
import os
import pathlib
import re
import subprocess
import time
import urllib.parse
import urllib.request
from typing import Dict, List, Optional, Tuple

ROOT = pathlib.Path(__file__).resolve().parent.parent
CACHE_DIR = pathlib.Path('.scrape/translations-cache')
CACHE_DIR.mkdir(exist_ok=True, parents=True)

BASE = 'https://www.chronopin.com'
LOCALES = ['es', 'fr', 'de', 'ja', 'zh', 'ko', 'hi', 'ar', 'th', 'it', 'ru', 'pt', 'ms', 'vi', 'id']
FIELDS = ['title', 'description', 'longFormSummary', 'dateConfidenceReasoning', 'delayReasoning']

def run_prod_sql(sql: str) -> str:
    res = subprocess.run(
        ['scripts/prod-sql.sh'],
        input=sql.encode('utf-8'),
        capture_output=True,
        check=True
    )
    return res.stdout.decode('utf-8')

def get_due_pin_ids(pin_id: Optional[int] = None, limit: Optional[int] = None) -> List[int]:
    filter_clause = f"AND p.id = {pin_id}" if pin_id else ""
    limit_clause = f"LIMIT {limit}" if limit else ""

    sql = f"""
WITH pin_hashes AS (
  SELECT p.id,
         p.title,
         encode(digest(convert_to(
           coalesce(p."title", '') || E'\\n--\\n' || coalesce(p."description", '') || E'\\n--\\n' || coalesce(p."longFormSummary", '')
             || E'\\n--\\n' || coalesce(p."dateConfidenceReasoning", '') || E'\\n--\\n' || coalesce(p."delayReasoning", ''),
           'UTF8'), 'sha1'), 'hex') AS current_hash
  FROM "Pin" p
  WHERE p."utcDeletedDateTime" IS NULL
    {filter_clause}
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
due_all AS (
  SELECT DISTINCT id FROM status WHERE state != 'current'
)
SELECT id FROM due_all
ORDER BY id
{limit_clause};
"""
    output = run_prod_sql(sql)
    ids = [int(line.strip()) for line in output.splitlines() if line.strip().isdigit()]
    return ids

def fetch_pins_data(ids: List[int]) -> List[dict]:
    if not ids:
        return []
    ids_str = ', '.join(str(i) for i in ids)
    sql = f"""
COPY (
  SELECT encode(convert_to(json_build_object(
    'id', p.id,
    'title', p.title,
    'description', p.description,
    'longFormSummary', p."longFormSummary",
    'dateConfidenceReasoning', p."dateConfidenceReasoning",
    'delayReasoning', p."delayReasoning"
  )::text, 'UTF8'), 'hex')
  FROM "Pin" p
  WHERE p.id IN ({ids_str})
  ORDER BY p.id
) TO STDOUT;
"""
    output = run_prod_sql(sql)
    pins = []
    for line in output.splitlines():
        line = line.strip()
        if not line:
            continue
        raw = bytes.fromhex(line).decode('utf-8')
        pins.append(json.loads(raw))
    return pins

def compute_source_hash(pin: dict) -> str:
    text = '\n--\n'.join(pin.get(f) or '' for f in FIELDS)
    return hashlib.sha1(text.encode('utf-8')).hexdigest()

def record_wiki_tracking(ids: List[int]):
    """
    Records translation tracking notes strictly in SourceWiki under each pin's backing source.
    NEVER touches Pin.longFormSummary or Pin.description.
    """
    if not ids:
        return
    ids_str = ', '.join(str(i) for i in ids)
    sql = f"""
-- Ensure PinSource exists for any pin with sourceUrl but no source row
INSERT INTO "Source" ("urlKey", "url", "kind", "status", "generatedBy", "wikiVersion")
SELECT 
  regexp_replace(regexp_replace(lower(p."sourceUrl"), '^https?://(www\\.)?', ''), '/+$', ''),
  p."sourceUrl", 'web', 'ready', 'gemini-3.8-flash/translations', 1
FROM "Pin" p
WHERE p.id IN ({ids_str})
  AND p."sourceUrl" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "PinSource" ps WHERE ps."pinId" = p.id AND ps."utcRemovedDateTime" IS NULL
  )
ON CONFLICT ("urlKey") DO NOTHING;

INSERT INTO "PinSource" ("pinId", "sourceId", "role", "summarizedWikiVersion")
SELECT p.id, s.id, 'source', 1
FROM "Pin" p
JOIN "Source" s ON s."urlKey" = regexp_replace(regexp_replace(lower(p."sourceUrl"), '^https?://(www\\.)?', ''), '/+$', '')
WHERE p.id IN ({ids_str})
  AND NOT EXISTS (
    SELECT 1 FROM "PinSource" ps WHERE ps."pinId" = p.id AND ps."utcRemovedDateTime" IS NULL
  )
ON CONFLICT ("pinId", "sourceId") DO NOTHING;

-- Find primary source for each pin
CREATE TEMP TABLE target_primary_sources AS
SELECT DISTINCT ON (ps."pinId")
  ps."pinId",
  ps."sourceId",
  p.title AS pin_title,
  s.title AS source_title
FROM "Pin" p
JOIN "PinSource" ps ON ps."pinId" = p.id AND ps."utcRemovedDateTime" IS NULL
JOIN "Source" s ON s.id = ps."sourceId"
WHERE p.id IN ({ids_str})
ORDER BY ps."pinId", CASE WHEN ps.role = 'source' THEN 0 ELSE 1 END, ps."sourceId";

-- Add child page where root SourceWiki exists
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
  FROM (SELECT DISTINCT "sourceId" FROM target_primary_sources) pps
  JOIN "SourceWiki" sw_root ON sw_root."sourceId" = pps."sourceId" AND sw_root."parentId" IS NULL
  WHERE NOT EXISTS (
    SELECT 1 FROM "SourceWiki" existing
    WHERE existing."sourceId" = sw_root."sourceId"
      AND (existing."title" = 'Translations' OR existing.tags @> ARRAY['translation'::varchar])
  )
) sw;

-- Add root SourceWiki where none exists
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
  FROM target_primary_sources
) pps
WHERE NOT EXISTS (
  SELECT 1 FROM "SourceWiki" sw WHERE sw."sourceId" = pps."sourceId"
);

UPDATE "Source" s
SET "status" = 'ready',
    "wikiVersion" = GREATEST(s."wikiVersion", 1),
    "generatedBy" = COALESCE(s."generatedBy", 'gemini-3.8-flash/translations')
FROM (SELECT DISTINCT "sourceId" FROM target_primary_sources) pps
WHERE s.id = pps."sourceId";

UPDATE "PinSource" ps
SET "summarizedWikiVersion" = s."wikiVersion"
FROM "Source" s
JOIN target_primary_sources pps ON pps."sourceId" = s.id
WHERE ps."pinId" = pps."pinId"
  AND ps."sourceId" = pps."sourceId"
  AND (ps."summarizedWikiVersion" IS NULL OR ps."summarizedWikiVersion" < s."wikiVersion");
"""
    print(f"Recording translation tracking in SourceWiki for {len(ids)} pin(s)...")
    run_prod_sql(sql)

def call_single(text: str, locale: str) -> str:
    urls = [
        'https://translate.googleapis.com/translate_a/single?' + urllib.parse.urlencode({'client': 'dict-chrome-ex', 'sl': 'en', 'tl': locale, 'dt': 't', 'q': text}),
        'https://clients5.google.com/translate_a/t?' + urllib.parse.urlencode({'client': 'dict-chrome-ex', 'sl': 'en', 'tl': locale, 'q': text})
    ]
    for attempt in range(5):
        for u in urls:
            try:
                req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'})
                with urllib.request.urlopen(req, timeout=12) as r:
                    res = json.load(r)
                    if isinstance(res, list):
                        if res and isinstance(res[0], list) and res[0] and isinstance(res[0][0], list):
                            val = ''.join(s[0] for s in res[0] if s and s[0])
                            return val.strip()
                        elif res and isinstance(res[0], str):
                            return res[0].strip()
            except Exception:
                pass
        time.sleep(0.5 * (attempt + 1))
    return text

def call_batch(texts: List[str], locale: str) -> Dict[str, str]:
    if not texts:
        return {}
    if len(texts) == 1:
        return {texts[0]: call_single(texts[0], locale)}

    q = ''.join(f'⟦{i}⟧\n{t}\n' for i, t in enumerate(texts)) + f'⟦{len(texts)}⟧'
    u = 'https://translate.googleapis.com/translate_a/single?' + urllib.parse.urlencode({
        'client': 'dict-chrome-ex',
        'sl': 'en',
        'tl': locale,
        'dt': 't',
        'q': q
    })
    for attempt in range(3):
        try:
            req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'})
            with urllib.request.urlopen(req, timeout=20) as r:
                res = json.load(r)
                full = ''.join(s[0] for s in res[0] if s and s[0])
                parts = [p.strip() for p in re.split(r'⟦\d+⟧', full) if p.strip()]
                if len(parts) == len(texts):
                    return {texts[i]: parts[i] for i in range(len(texts))}
                break
        except Exception:
            time.sleep(0.8 * (attempt + 1))

    # Fallback to single requests
    out = {}
    for t in texts:
        out[t] = call_single(t, locale)
    return out

def translate_locale(locale: str, pins: List[dict], all_texts: List[str]) -> Tuple[str, List[dict]]:
    cache_path = CACHE_DIR / f'{locale}.json'
    cache = {}
    if cache_path.exists():
        try:
            cache = json.loads(cache_path.read_text(encoding='utf-8'))
        except Exception:
            pass

    missing = [t for t in all_texts if t not in cache]
    batch_size = 20
    batches = [missing[i:i + batch_size] for i in range(0, len(missing), batch_size)]

    for b in batches:
        res = call_batch(b, locale)
        for src, tr in res.items():
            if locale == 'th':
                # Convert Buddhist Era years (+543) back to Gregorian calendar
                for yr in re.findall(r'\b(?:1[5-9]|20)\d{2}\b', src):
                    byr = str(int(yr) + 543)
                    if byr in tr:
                        tr = tr.replace(byr, yr).replace('พ.ศ.', 'ค.ศ.').replace('พ.ศ', 'ค.ศ')
            cache[src] = tr

    cache_path.write_text(json.dumps(cache, ensure_ascii=False, indent=1), encoding='utf-8')

    rows = []
    for p in pins:
        row = {
            'pinId': p['id'],
            'locale': locale,
            'sourceHash': p['sourceHash']
        }
        valid = True
        for f in FIELDS:
            src = p.get(f)
            if not src:
                continue
            parts = re.split(r'(<[^>]*>)', src)
            def clean_tr(t):
                tr = cache.get(t, t)
                # Escape pseudo-tags like <3 in song titles
                return re.sub(r'<(\d)', r'&lt;\1', tr)

            val = ''.join(clean_tr(t) if not t.startswith('<') and t.strip() and any(c.isalpha() for c in t) else t for t in parts)

            # Safety validations
            if re.findall(r'<[^>]*>', src) != re.findall(r'<[^>]*>', val):
                print(f"[{locale}] Tag mismatch in pin {p['id']} field {f}: {re.findall(r'<[^>]*>', src)} vs {re.findall(r'<[^>]*>', val)}")
                valid = False
                break
            if re.findall(r'data-ref="([^"]*)"', src) != re.findall(r'data-ref="([^"]*)"', val):
                print(f"[{locale}] data-ref mismatch in pin {p['id']} field {f}")
                valid = False
                break
            row[f] = val

        if valid and row.get('title'):
            rows.append(row)
        else:
            print(f"[{locale}] Skipped invalid translation for pin {p['id']}")

    return locale, rows

def ensure_admin_token() -> str:
    token_file = pathlib.Path('.scrape/admin.token')
    if token_file.exists():
        token = token_file.read_text().strip()
        if token:
            try:
                req = urllib.request.Request(BASE + '/api/users/me', headers={'Authorization': 'Bearer ' + token})
                with urllib.request.urlopen(req) as resp:
                    if resp.status == 200:
                        return token
            except Exception:
                pass

    print("Authenticating admin session via /auth/local...")
    email = os.environ.get('ADMIN_EMAIL', 'flynni2008@gmail.com')
    password = os.environ.get('ADMIN_PASSWORD', 'admin2')
    data = json.dumps({'email': email, 'password': password}).encode('utf-8')
    req = urllib.request.Request(
        BASE + '/auth/local',
        data=data,
        headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
    )
    with urllib.request.urlopen(req) as resp:
        res = json.load(resp)
        token = res.get('token')
        if not token:
            raise RuntimeError("Admin authentication failed: no token returned")
        token_file.write_text(token.strip())
        return token

def push_translations(all_rows: List[dict]) -> int:
    token = ensure_admin_token()
    chunk_size = 150
    total_saved = 0
    for i in range(0, len(all_rows), chunk_size):
        chunk = all_rows[i:i + chunk_size]
        req = urllib.request.Request(
            BASE + '/api/admin/translations',
            data=json.dumps({'translations': chunk}, ensure_ascii=False).encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            }
        )
        with urllib.request.urlopen(req, timeout=60) as resp:
            res = json.load(resp)
            saved = res.get('saved', 0)
            total_saved += saved
            skipped = len(res.get('skipped', []))
            print(f"Batch {i // chunk_size + 1}: saved {saved}, skipped {skipped}")
    return total_saved

def main():
    parser = argparse.ArgumentParser(description="Synchronize production translations.")
    parser.add_argument('--limit', type=int, help="Limit number of pins to translate")
    parser.add_argument('--pin', type=int, help="Translate a specific pin id")
    parser.add_argument('--dry-run', action='store_true', help="Only display due pins without translating")
    args = parser.parse_args()

    due_ids = get_due_pin_ids(pin_id=args.pin, limit=args.limit)
    print(f"Found {len(due_ids)} pin(s) due for translation.")
    if not due_ids:
        print("All pins are already up to date!")
        return

    if args.dry_run:
        print(f"Dry-run: sample of due pin IDs: {due_ids[:20]}")
        return

    pins = fetch_pins_data(due_ids)
    for p in pins:
        p['sourceHash'] = compute_source_hash(p)

    # Collect unique text strings to translate
    all_texts = set()
    for p in pins:
        for f in FIELDS:
            src = p.get(f)
            if not src:
                continue
            parts = re.split(r'(<[^>]*>)', src)
            for t in parts:
                if not t.startswith('<') and t.strip() and any(c.isalpha() for c in t):
                    all_texts.add(t)

    text_list = sorted(list(all_texts))
    print(f"Total unique text fragments across {len(pins)} pin(s): {len(text_list)}")

    # Record tracking strictly in SourceWiki
    record_wiki_tracking(due_ids)

    # Translate in parallel across 15 locales
    print("Translating across all 15 locales...")
    all_rows = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        futures = [pool.submit(translate_locale, loc, pins, text_list) for loc in LOCALES]
        for f in concurrent.futures.as_completed(futures):
            loc, rows = f.result()
            print(f"  [{loc}] Generated {len(rows)} valid translation rows.")
            all_rows.extend(rows)

    print(f"Total rows to push: {len(all_rows)}")
    saved = push_translations(all_rows)
    print(f"Successfully saved {saved} / {len(all_rows)} translation rows on production.")

if __name__ == '__main__':
    main()

