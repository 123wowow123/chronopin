#!/usr/bin/env python3
"""
Synchronizes production translations for newly added or updated Chronopin pins.
- Queries GET /api/admin/translations to identify active pins with missing, outdated,
  or incomplete translations (and which specific locales and fields need updating).
- Never touches pin content with tracking notes.
- Records translation model metadata exclusively in the backing OKF SourceWiki without
  mutating Source.status or Source.wikiVersion on unbuilt sources.
- Translates across due locales out of the 15 supported non-English locales:
  ['es', 'fr', 'de', 'ja', 'zh', 'ko', 'hi', 'ar', 'th', 'it', 'ru', 'pt', 'ms', 'vi', 'id']
- Uses HTTP POST for translation requests to avoid URL length limits, and never falls back
  to caching or saving untranslated English text on failure.
- Preserves HTML tags, surrounding inline whitespace, lists, and <cite data-ref="..."> anchors.
- Fixes Thai Buddhist era years back to the Gregorian calendar.
- Validates wholeTranslation completeness before pushing via POST /api/admin/translations.

Usage:
    python3 .agents/skills/prod-translations/scripts/sync_translations.py [--limit N] [--pin ID] [--locale LOC] [--dry-run]
"""

import argparse
import concurrent.futures
import json
import os
import pathlib
import re
import subprocess
import time
import urllib.parse
import urllib.request
from typing import Dict, List, Optional, Set, Tuple

CACHE_DIR = pathlib.Path('.scrape/translations-cache')
CACHE_DIR.mkdir(exist_ok=True, parents=True)

BASE = 'https://www.chronopin.com'
LOCALES = ['es', 'fr', 'de', 'ja', 'zh', 'ko', 'hi', 'ar', 'th', 'it', 'ru', 'pt', 'ms', 'vi', 'id']
FIELDS = ['title', 'description', 'longFormSummary', 'dateConfidenceReasoning', 'delayReasoning']

def load_env_local() -> Dict[str, str]:
    env: Dict[str, str] = {}
    env_path = pathlib.Path('.env.local')
    if env_path.exists():
        for line in env_path.read_text(encoding='utf-8').splitlines():
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env

def ensure_admin_token() -> str:
    token_file = pathlib.Path('.scrape/admin.token')
    token_file.parent.mkdir(exist_ok=True, parents=True)
    if token_file.exists():
        token = token_file.read_text(encoding='utf-8').strip()
        if token:
            try:
                req = urllib.request.Request(BASE + '/api/users/me', headers={'Authorization': 'Bearer ' + token})
                with urllib.request.urlopen(req, timeout=15) as resp:
                    if resp.status == 200:
                        return token
            except Exception:
                pass

    print("Authenticating admin session via /auth/local...")
    env = load_env_local()
    email = os.environ.get('ADMIN_EMAIL') or env.get('ADMIN_EMAIL')
    password = os.environ.get('ADMIN_PASSWORD') or env.get('ADMIN_PASSWORD')
    if not email or not password:
        raise RuntimeError("Missing ADMIN_EMAIL or ADMIN_PASSWORD in environment or .env.local")

    data = json.dumps({'email': email, 'password': password}).encode('utf-8')
    req = urllib.request.Request(
        BASE + '/auth/local',
        data=data,
        headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        res = json.load(resp)
        token = res.get('token')
        if not token:
            raise RuntimeError("Admin authentication failed: no token returned")
        token_file.write_text(token.strip(), encoding='utf-8')
        return token

def run_prod_sql(sql: str) -> str:
    res = subprocess.run(
        ['scripts/prod-sql.sh'],
        input=sql.encode('utf-8'),
        capture_output=True,
        check=True
    )
    return res.stdout.decode('utf-8')

def fetch_due_pins(
    token: str,
    pin_id: Optional[int] = None,
    limit: Optional[int] = None,
    locale: Optional[str] = None,
) -> List[dict]:
    due_pins: List[dict] = []
    after = (pin_id - 1) if pin_id else 0
    loc_param = f"&locale={urllib.parse.quote(locale)}" if locale else ""

    while True:
        batch_limit = 1 if pin_id else min(1000, (limit - len(due_pins)) if limit else 1000)
        url = f"{BASE}/api/admin/translations?limit={batch_limit}&after={after}{loc_param}"
        req = urllib.request.Request(url, headers={'Authorization': 'Bearer ' + token})
        with urllib.request.urlopen(req, timeout=60) as resp:
            batch = json.load(resp).get('pins', [])
        if not batch:
            break
        if pin_id:
            due_pins = [p for p in batch if p['id'] == pin_id]
            break
        due_pins.extend(batch)
        if (limit and len(due_pins) >= limit) or len(batch) < batch_limit:
            break
        after = batch[-1]['id']

    return due_pins[:limit] if limit else due_pins

def target_fields_for(pin: dict, locale: str) -> List[str]:
    """
    Returns the list of fields that need translating for (pin, locale).
    For 'outdated' rows where 'changed' is known, only 'title' + the edited fields
    need to be sent; applyTranslations keeps stored valid translations for omitted fields.
    """
    state = pin.get('states', {}).get(locale)
    changed = pin.get('changed', {}).get(locale)
    if state == 'outdated' and changed:
        needed = set(changed) | {'title'}
        return [f for f in FIELDS if f in needed and pin.get(f)]
    return [f for f in FIELDS if pin.get(f)]

def record_wiki_tracking(ids: List[int]):
    """
    Records translation tracking notes strictly in SourceWiki under each pin's backing source.
    - NEVER touches Pin.longFormSummary or Pin.description.
    - Computes urlKey matching src/lib/citations.ts (lowercased host without www., path without
      trailing /, search preserved, #fragment stripped).
    - NEVER mutates Source.status to 'ready' or Source.wikiVersion to 1 on unbuilt sources
      (utcBuiltDateTime IS NULL), preventing false okf:lint thin/bare warnings.
    """
    if not ids:
        return
    ids_str = ', '.join(str(i) for i in ids)
    sql = f"""
-- Compute canonical urlKey matching src/lib/citations.ts for pins with sourceUrl
CREATE TEMP TABLE target_pin_urls AS
SELECT
  p.id AS "pinId",
  p."sourceUrl",
  p."longFormSummary",
  regexp_replace(
    lower(substring(regexp_replace(regexp_replace(btrim(p."sourceUrl"), '#.*$', ''), '^https?://', '', 'i') from '^[^/?]+')),
    '^www\\.', ''
  ) ||
  regexp_replace(
    coalesce(substring(regexp_replace(regexp_replace(btrim(p."sourceUrl"), '#.*$', ''), '^https?://', '', 'i') from '^[^/?]+(/[^?]*)'), ''),
    '/+$', ''
  ) ||
  coalesce(substring(regexp_replace(regexp_replace(btrim(p."sourceUrl"), '#.*$', ''), '^https?://', '', 'i') from '\\?.*$'), '') AS "urlKey"
FROM "Pin" p
WHERE p.id IN ({ids_str})
  AND p."sourceUrl" ~* '^https?://';

-- Ensure Source and PinSource exist for any pin with sourceUrl but no active PinSource
INSERT INTO "Source" ("urlKey", "url", "kind", "status", "generatedBy", "wikiVersion")
SELECT
  u."urlKey",
  btrim(u."sourceUrl"),
  'web',
  'pending',
  'gemini-3.8-flash/translations',
  0
FROM target_pin_urls u
WHERE u."urlKey" != ''
  AND NOT EXISTS (
    SELECT 1 FROM "PinSource" ps WHERE ps."pinId" = u."pinId" AND ps."utcRemovedDateTime" IS NULL
  )
ON CONFLICT ("urlKey") DO NOTHING;

INSERT INTO "PinSource" ("pinId", "sourceId", "role", "summarizedWikiVersion")
SELECT
  u."pinId",
  s.id,
  'source',
  CASE
    WHEN u."longFormSummary" IS NOT NULL AND btrim(u."longFormSummary") != '' THEN GREATEST(s."wikiVersion", 1)
    ELSE NULL
  END
FROM target_pin_urls u
JOIN "Source" s ON s."urlKey" = u."urlKey"
WHERE NOT EXISTS (
  SELECT 1 FROM "PinSource" ps WHERE ps."pinId" = u."pinId" AND ps."utcRemovedDateTime" IS NULL
)
ON CONFLICT ("pinId", "sourceId") DO NOTHING;

-- Find primary source for each pin
CREATE TEMP TABLE target_primary_sources AS
SELECT DISTINCT ON (ps."pinId")
  ps."pinId",
  ps."sourceId",
  p.title AS pin_title,
  s.title AS source_title,
  p."longFormSummary"
FROM "Pin" p
JOIN "PinSource" ps ON ps."pinId" = p.id AND ps."utcRemovedDateTime" IS NULL
JOIN "Source" s ON s.id = ps."sourceId"
WHERE p.id IN ({ids_str})
ORDER BY ps."pinId", CASE WHEN ps.role = 'source' THEN 0 ELSE 1 END, ps."sourceId";

-- Add child page where root SourceWiki already exists
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

-- Add root SourceWiki where none exists yet
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

-- Record generatedBy without marking unbuilt sources as 'ready' or bumping wikiVersion from 0
UPDATE "Source" s
SET "generatedBy" = COALESCE(s."generatedBy", 'gemini-3.8-flash/translations')
FROM (SELECT DISTINCT "sourceId" FROM target_primary_sources) pps
WHERE s.id = pps."sourceId";

-- Ensure PinSource.summarizedWikiVersion stays in sync for pins with a summary
UPDATE "PinSource" ps
SET "summarizedWikiVersion" = GREATEST(s."wikiVersion", 1)
FROM "Source" s
JOIN target_primary_sources pps ON pps."sourceId" = s.id
WHERE ps."pinId" = pps."pinId"
  AND ps."sourceId" = pps."sourceId"
  AND pps."longFormSummary" IS NOT NULL
  AND btrim(pps."longFormSummary") != ''
  AND (ps."summarizedWikiVersion" IS NULL OR ps."summarizedWikiVersion" < GREATEST(s."wikiVersion", 1));
"""
    print(f"Recording translation tracking in SourceWiki for {len(ids)} pin(s)...")
    run_prod_sql(sql)

def _raw_translate_single(text: str, locale: str) -> Optional[str]:
    endpoints = [
        (
            'https://translate.googleapis.com/translate_a/single',
            {'client': 'dict-chrome-ex', 'sl': 'en', 'tl': locale, 'dt': 't', 'q': text},
        ),
        (
            'https://clients5.google.com/translate_a/t',
            {'client': 'dict-chrome-ex', 'sl': 'en', 'tl': locale, 'q': text},
        ),
    ]
    for attempt in range(5):
        for url, params in endpoints:
            try:
                body = urllib.parse.urlencode(params).encode('utf-8')
                req = urllib.request.Request(
                    url,
                    data=body,
                    headers={
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
                        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                    },
                )
                with urllib.request.urlopen(req, timeout=15) as r:
                    res = json.load(r)
                    if isinstance(res, list):
                        if res and isinstance(res[0], list) and res[0] and isinstance(res[0][0], list):
                            val = ''.join(s[0] for s in res[0] if s and s[0])
                            if val.strip():
                                return val.strip()
                        elif res and isinstance(res[0], str) and res[0].strip():
                            return res[0].strip()
            except Exception:
                pass
        time.sleep(0.5 * (attempt + 1))
    return None

def call_single(text: str, locale: str) -> Optional[str]:
    """
    Translates a single string using HTTP POST and verifies whole_translation completeness.
    If the NMT model truncates a multi-clause sentence (e.g. German Roman numeral EOS bug),
    retries with semicolon clause boundaries so the full sentence is translated.
    Returns None if all attempts fail so untranslated/truncated text is never cached or pushed.
    """
    val = _raw_translate_single(text, locale)
    if val is not None and whole_translation(text, val):
        return val

    # Fallback for NMT mid-sentence truncation on comma-separated clauses
    if ', ' in text:
        alt_text = text.replace(', ', '; ', 1)
        val_alt = _raw_translate_single(alt_text, locale)
        if val_alt is not None and whole_translation(text, val_alt):
            return val_alt

        clauses = [c.strip() for c in text.split(', ') if c.strip()]
        translated_clauses = []
        for c in clauses:
            tc = _raw_translate_single(c, locale)
            if tc is None:
                break
            translated_clauses.append(tc)
        if len(translated_clauses) == len(clauses):
            joined = ', '.join(translated_clauses)
            if whole_translation(text, joined):
                return joined

    return val if (val is not None and whole_translation(text, val)) else None

def call_batch(texts: List[str], locale: str) -> Dict[str, str]:
    """
    Translates a batch of strings via HTTP POST. Falls back to call_single on delimiter mismatch
    or if any item fails whole_translation completeness.
    Omits any string that failed to translate so failures are never cached.
    """
    if not texts:
        return {}
    if len(texts) == 1:
        res = call_single(texts[0], locale)
        return {texts[0]: res} if res is not None else {}

    q = ''.join(f'⟦{i}⟧\n{t}\n' for i, t in enumerate(texts)) + f'⟦{len(texts)}⟧'
    body = urllib.parse.urlencode({
        'client': 'dict-chrome-ex',
        'sl': 'en',
        'tl': locale,
        'dt': 't',
        'q': q,
    }).encode('utf-8')

    batch_out: Optional[Dict[str, str]] = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(
                'https://translate.googleapis.com/translate_a/single',
                data=body,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                },
            )
            with urllib.request.urlopen(req, timeout=25) as r:
                res = json.load(r)
                full = ''.join(s[0] for s in res[0] if s and s[0])
                parts = [p.strip() for p in re.split(r'⟦\d+⟧', full) if p.strip()]
                if len(parts) == len(texts):
                    batch_out = {texts[i]: parts[i] for i in range(len(texts))}
                break
        except Exception:
            time.sleep(0.8 * (attempt + 1))

    out: Dict[str, str] = {}
    for t in texts:
        cand = batch_out.get(t) if batch_out else None
        if cand is not None and whole_translation(t, cand):
            out[t] = cand
        else:
            val = call_single(t, locale)
            if val is not None:
                out[t] = val
    return out

def has_words(value: Optional[str]) -> bool:
    if not value:
        return False
    return any(c.isalnum() for c in value)

def whole_translation(english: Optional[str], translated: Optional[str]) -> bool:
    """
    Python equivalent of wholeTranslation() in src/server/model/pinTranslation.ts.
    """
    if not english or not has_words(english[:200]):
        return True
    if not translated or not has_words(translated[:200]):
        return False
    if translated.count('<li>') != english.count('<li>'):
        return False
    if translated.count('<cite') != english.count('<cite'):
        return False
    en_end = english.rstrip()[-1:]
    tr_end = translated.rstrip()[-1:]
    if en_end and en_end in '.!?。！？' and tr_end and tr_end.isalnum() and len(translated) < len(english) * 0.25:
        return False
    return True

def fix_thai_years(src: str, tr: str) -> str:
    for yr in re.findall(r'\b(?:1[5-9]|20)\d{2}\b', src):
        byr = str(int(yr) + 543)
        if byr in tr:
            tr = tr.replace(byr, yr).replace('พ.ศ.', 'ค.ศ.').replace('พ.ศ', 'ค.ศ')
    return tr

def translate_locale(locale: str, pins_for_locale: List[dict], locale_texts: List[str]) -> Tuple[str, List[dict]]:
    cache_path = CACHE_DIR / f'{locale}.json'
    cache: Dict[str, str] = {}
    if cache_path.exists():
        try:
            cache = json.loads(cache_path.read_text(encoding='utf-8'))
        except Exception:
            pass

    missing = [t for t in locale_texts if t not in cache or not whole_translation(t, cache.get(t))]
    batch_size = 20
    batches = [missing[i:i + batch_size] for i in range(0, len(missing), batch_size)]

    for b in batches:
        res = call_batch(b, locale)
        for src_core, tr in res.items():
            if locale == 'th':
                tr = fix_thai_years(src_core, tr)
            cache[src_core] = tr

    cache_path.write_text(json.dumps(cache, ensure_ascii=False, indent=1), encoding='utf-8')

    rows: List[dict] = []
    for p in pins_for_locale:
        row: dict = {
            'pinId': p['id'],
            'locale': locale,
            'sourceHash': p['sourceHash'],
        }
        valid = True
        fields_to_do = target_fields_for(p, locale)

        for f in fields_to_do:
            src = p.get(f)
            if not src:
                continue
            parts = re.split(r'(<[^>]*>)', src)
            out_parts: List[str] = []

            for part in parts:
                if part.startswith('<') or not part.strip() or not any(c.isalpha() for c in part):
                    out_parts.append(part)
                    continue

                leading_ws = part[:len(part) - len(part.lstrip())]
                trailing_ws = part[len(part.rstrip()):]
                core = part.strip()

                tr_core = cache.get(core)
                if tr_core is None:
                    # Fallback lookup if unstripped key existed in older cache
                    tr_core = cache.get(part)
                    if tr_core is not None:
                        tr_core = tr_core.strip()

                if tr_core is None:
                    print(f"[{locale}] Missing translation for fragment in pin {p['id']} field {f}")
                    valid = False
                    break

                if locale == 'th':
                    tr_core = fix_thai_years(core, tr_core)

                # Since HTML tags are already split into odd tokens, escape any literal < or > inside text nodes
                tr_core = tr_core.replace('<', '&lt;').replace('>', '&gt;')
                out_parts.append(f"{leading_ws}{tr_core}{trailing_ws}")

            if not valid:
                break

            val = ''.join(out_parts)

            # Safety validations: tag parity, citation parity, and wholeTranslation completeness
            if re.findall(r'<[^>]*>', src) != re.findall(r'<[^>]*>', val):
                print(f"[{locale}] Tag mismatch in pin {p['id']} field {f}: {re.findall(r'<[^>]*>', src)} vs {re.findall(r'<[^>]*>', val)}")
                valid = False
                break
            if re.findall(r'data-ref="([^"]*)"', src) != re.findall(r'data-ref="([^"]*)"', val):
                print(f"[{locale}] data-ref mismatch in pin {p['id']} field {f}")
                valid = False
                break
            if not whole_translation(src, val):
                print(f"[{locale}] Incomplete translation (wholeTranslation failed) in pin {p['id']} field {f}")
                valid = False
                break

            row[f] = val

        if valid and row.get('title'):
            rows.append(row)
        else:
            print(f"[{locale}] Skipped invalid translation for pin {p['id']}")

    return locale, rows

def push_translations(token: str, all_rows: List[dict]) -> int:
    chunk_size = 150
    total_saved = 0
    for i in range(0, len(all_rows), chunk_size):
        chunk = all_rows[i:i + chunk_size]
        req = urllib.request.Request(
            BASE + '/api/admin/translations',
            data=json.dumps({'translations': chunk}, ensure_ascii=False).encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token,
            }
        )
        with urllib.request.urlopen(req, timeout=60) as resp:
            res = json.load(resp)
            saved = res.get('saved', 0)
            total_saved += saved
            skipped = res.get('skipped', [])
            print(f"Batch {i // chunk_size + 1}: saved {saved}, skipped {len(skipped)}")
            if skipped:
                print(f"  Sample skipped reasons: {skipped[:3]}")
    return total_saved

def main():
    parser = argparse.ArgumentParser(description="Synchronize production translations.")
    parser.add_argument('--limit', type=int, help="Limit number of pins to translate")
    parser.add_argument('--pin', type=int, help="Translate a specific pin id")
    parser.add_argument('--locale', type=str, help="Only translate specific locale(s), comma-separated")
    parser.add_argument('--dry-run', action='store_true', help="Only display due pins without translating")
    args = parser.parse_args()

    token = ensure_admin_token()
    due_pins = fetch_due_pins(token, pin_id=args.pin, limit=args.limit, locale=args.locale)
    print(f"Found {len(due_pins)} pin(s) due for translation.")
    if not due_pins:
        print("All matching pins are already up to date!")
        return

    if args.dry_run:
        sample = [
            {
                'id': p['id'],
                'locales': p.get('locales', []),
                'states': p.get('states', {}),
            }
            for p in due_pins[:20]
        ]
        print(f"Dry-run sample (up to 20):\n{json.dumps(sample, indent=2)}")
        return

    # Group pins and needed text fragments per locale
    pins_by_locale: Dict[str, List[dict]] = {loc: [] for loc in LOCALES}
    texts_by_locale: Dict[str, Set[str]] = {loc: set() for loc in LOCALES}

    for p in due_pins:
        for loc in p.get('locales', []):
            if loc not in pins_by_locale:
                continue
            pins_by_locale[loc].append(p)
            for f in target_fields_for(p, loc):
                src = p.get(f)
                if not src:
                    continue
                for part in re.split(r'(<[^>]*>)', src):
                    if not part.startswith('<') and part.strip() and any(c.isalpha() for c in part):
                        texts_by_locale[loc].add(part.strip())

    active_locales = [loc for loc in LOCALES if pins_by_locale[loc]]
    print(f"Active target locales requiring updates: {active_locales}")

    # Record tracking strictly in SourceWiki
    record_wiki_tracking([p['id'] for p in due_pins])

    # Translate in parallel across active locales
    all_rows: List[dict] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        futures = [
            pool.submit(translate_locale, loc, pins_by_locale[loc], sorted(texts_by_locale[loc]))
            for loc in active_locales
        ]
        for fut in concurrent.futures.as_completed(futures):
            loc, rows = fut.result()
            print(f"  [{loc}] Generated {len(rows)} / {len(pins_by_locale[loc])} valid translation rows.")
            all_rows.extend(rows)

    if not all_rows:
        print("No valid translation rows generated.")
        return

    print(f"Total rows to push: {len(all_rows)}")
    token = ensure_admin_token()
    saved = push_translations(token, all_rows)
    print(f"Successfully saved {saved} / {len(all_rows)} translation rows on production.")

if __name__ == '__main__':
    main()
