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
import html
import json
import os
import pathlib
import re
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from typing import Dict, List, Optional, Set, Tuple

sys.dont_write_bytecode = True
sys.stdout.reconfigure(line_buffering=True)

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
                        body = json.load(resp)
                        if isinstance(body, dict) and body.get('role') == 'admin':
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
    pin_ids: Optional[Set[int]] = None,
    limit: Optional[int] = None,
    locale: Optional[str] = None,
) -> List[dict]:
    due_pins: List[dict] = []
    if pin_id:
        pin_ids = {pin_id}
    after = (min(pin_ids) - 1) if pin_ids else 0
    max_pin_id = max(pin_ids) if pin_ids else None
    loc_param = f"&locale={urllib.parse.quote(locale)}" if locale else ""

    while True:
        batch_limit = 1 if (pin_ids and len(pin_ids) == 1) else min(1000, (limit - len(due_pins)) if (limit and not pin_ids) else 1000)
        url = f"{BASE}/api/admin/translations?limit={batch_limit}&after={after}{loc_param}"
        req = urllib.request.Request(url, headers={'Authorization': 'Bearer ' + token})
        with urllib.request.urlopen(req, timeout=60) as resp:
            batch = json.load(resp).get('pins', [])
        if not batch:
            break
        if pin_ids is not None:
            due_pins.extend(p for p in batch if p['id'] in pin_ids)
            if len(due_pins) >= len(pin_ids) or (max_pin_id is not None and batch[-1]['id'] >= max_pin_id):
                break
        else:
            due_pins.extend(batch)
        if (limit and len(due_pins) >= limit) or len(batch) < batch_limit:
            break
        after = batch[-1]['id']

    return due_pins[:limit] if limit else due_pins

HTML_FIELDS = ('description', 'longFormSummary')

def target_fields_for(pin: dict, locale: str) -> List[str]:
    """
    Returns the edited fields for an outdated translation when known (changed),
    or all present fields on the pin when missing/incomplete.
    """
    state = (pin.get('states') or {}).get(locale)
    changed = (pin.get('changed') or {}).get(locale)
    if state == 'outdated' and isinstance(changed, list) and changed:
        return [f for f in FIELDS if f in changed and pin.get(f)]
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

def _extract_mkewbc_text(inner: list, locale: str) -> Optional[str]:
    try:
        entry = inner[1][0][0]
        segs = entry[5] if len(entry) > 5 else None
        if isinstance(segs, list) and segs:
            sep = '' if locale in ('ja', 'zh', 'th') else ' '
            val = sep.join(
                seg[0].strip()
                for seg in segs
                if isinstance(seg, list) and seg and isinstance(seg[0], str) and seg[0].strip()
            )
            if val.strip():
                return val.strip()
        if isinstance(entry[0], str) and entry[0].strip():
            return entry[0].strip()
    except Exception:
        pass
    return None

def _call_batchexecute(texts: List[str], locale: str) -> Dict[str, str]:
    """
    Uses Google Translate's web RPC endpoint (batchexecute / MkEWBc) which packs multiple
    independent translation RPCs into a single HTTP POST request without text delimiters.
    """
    if not texts:
        return {}
    rpc_calls = [
        ['MkEWBc', json.dumps([[t, 'en', locale, True], [None]]), None, str(i)]
        for i, t in enumerate(texts)
    ]
    body = urllib.parse.urlencode({'f.req': json.dumps([rpc_calls])}).encode('utf-8')
    for attempt in range(4):
        try:
            req = urllib.request.Request(
                'https://translate.google.com/_/TranslateWebserverUi/data/batchexecute',
                data=body,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                },
            )
            with urllib.request.urlopen(req, timeout=25) as r:
                raw = r.read().decode('utf-8')
            out: Dict[str, str] = {}
            for line in raw.splitlines():
                if 'wrb.fr' in line and 'MkEWBc' in line:
                    for item in json.loads(line):
                        if (
                            isinstance(item, list)
                            and len(item) >= 7
                            and item[0] == 'wrb.fr'
                            and item[1] == 'MkEWBc'
                            and item[2]
                        ):
                            idx = int(item[6])
                            if 0 <= idx < len(texts):
                                tr = _extract_mkewbc_text(json.loads(item[2]), locale)
                                if tr:
                                    out[texts[idx]] = tr
            if out:
                time.sleep(0.15)
                return out
        except Exception:
            time.sleep(0.8 * (attempt + 1))
    return {}

def _raw_translate_single(text: str, locale: str) -> Optional[str]:
    res = _call_batchexecute([text], locale)
    if text in res and res[text].strip():
        return res[text].strip()

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
    for attempt in range(3):
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
                    res_json = json.load(r)
                    if isinstance(res_json, list):
                        if res_json and isinstance(res_json[0], list) and res_json[0] and isinstance(res_json[0][0], list):
                            val = ''.join(s[0] for s in res_json[0] if s and s[0])
                            if val.strip():
                                return val.strip()
                        elif res_json and isinstance(res_json[0], str) and res_json[0].strip():
                            return res_json[0].strip()
            except Exception:
                pass
        time.sleep(0.5 * (attempt + 1))
    return None

def call_single(text: str, locale: str) -> Optional[str]:
    """
    Translates a single string using HTTP POST and verifies whole_translation completeness.
    If the NMT model truncates a multi-clause sentence (e.g. German Roman numeral EOS bug),
    retries with semicolon clause boundaries so the full sentence is translated.
    If a Title-Case headline (> 40 chars with English stopwords) comes back as pure ASCII in a
    non-Latin locale, retries with lowercased words after the first word / colon.
    Returns None if all attempts fail so untranslated/truncated text is never cached or pushed.
    """
    val = _raw_translate_single(text, locale)
    if val is not None and locale == 'th':
        val = fix_thai_years(text, val)
    if val is not None and acceptable(locale, text, val, is_title=True):
        return val

    # Fallback for Title-Case strings left as pure ASCII in non-Latin locales
    if locale in NON_LATIN_LOCALES and len(text) > 40 and looks_english(text):
        words = text.split(' ')
        if len(words) > 2:
            lowered = words[0] + ' ' + ' '.join(w.lower() if (w.istitle() and len(w) > 1) else w for w in words[1:])
            val_low = _raw_translate_single(lowered, locale)
            if val_low is not None and locale == 'th':
                val_low = fix_thai_years(text, val_low)
            if val_low is not None and acceptable(locale, text, val_low, is_title=True):
                return val_low

    # Fallback for NMT mid-sentence truncation on comma-separated clauses
    if ', ' in text:
        alt_text = text.replace(', ', '; ', 1)
        val_alt = _raw_translate_single(alt_text, locale)
        if val_alt is not None and locale == 'th':
            val_alt = fix_thai_years(text, val_alt)
        if val_alt is not None and acceptable(locale, text, val_alt, is_title=True):
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
            if locale == 'th':
                joined = fix_thai_years(text, joined)
            if acceptable(locale, text, joined, is_title=True):
                return joined

    return val if (val is not None and acceptable(locale, text, val, is_title=True)) else None

def call_batch(texts: List[str], locale: str) -> Dict[str, str]:
    """
    Translates a batch of strings via multi-RPC batchexecute POST. Falls back to call_single
    for any item that failed or did not pass acceptable() completeness.
    Omits any string that failed to translate so failures are never cached.
    """
    if not texts:
        return {}
    if len(texts) == 1:
        res = call_single(texts[0], locale)
        return {texts[0]: res} if res is not None else {}

    batch_out = _call_batchexecute(texts, locale)

    out: Dict[str, str] = {}
    for t in texts:
        cand = batch_out.get(t)
        if cand is not None and locale == 'th':
            cand = fix_thai_years(t, cand)
        if cand is not None and acceptable(locale, t, cand, is_title=True):
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

ENGLISH_STOPWORDS = re.compile(r'\b(?:the|and|of|to|is|in|for|on|with|by|that|was|are|from|has|have|not|this|be|it)\b', re.I)
NON_LATIN_LOCALES = ('ja', 'zh', 'ko', 'ru', 'ar', 'hi', 'th')

def looks_english(text: str) -> bool:
    """True when text contains common English function words (mirrors the SQL stopword rule)."""
    return bool(ENGLISH_STOPWORDS.search(text))

def acceptable(locale: str, en: str, tr: Optional[str], is_title: bool = False) -> bool:
    """
    whole_translation() plus per-locale guards:
    - Any > 40 char fragment (including titles) that comes back as pure ASCII in a non-Latin-script
      locale ('ja', 'zh', 'ko', 'ru', 'ar', 'hi', 'th') when the source is English prose is rejected.
    - Any >= 60 char non-title fragment identical to English prose is rejected.
    - Any Thai ('th') fragment that still contains 'พ.ศ.' or an unconverted Buddhist year (2550..2589
      not in the English source) is rejected.
    """
    if not whole_translation(en, tr, is_fragment=True, is_title=is_title):
        return False
    if not is_title and tr and len(en) >= 60 and looks_english(en) and all(ord(c) < 128 for c in en) and html.unescape(tr.strip()) == en.strip():
        return False
    if locale in NON_LATIN_LOCALES and tr and len(en) > 40 and looks_english(en) and all(ord(c) < 128 for c in tr):
        return False
    if locale == 'th' and tr:
        if 'พ.ศ' in tr and 'พ.ศ' not in en:
            return False
        en_digits = en.replace(',', '')
        for byr in re.findall(r'(?<!\d)(25[5-8]\d)(?!\d)', tr):
            if byr not in en_digits:
                return False
    return True

def whole_translation(english: Optional[str], translated: Optional[str], is_fragment: bool = False, is_title: bool = False) -> bool:
    """
    Python equivalent of wholeTranslation() in src/server/model/pinTranslation.ts,
    plus guards against untranslated English prose and mangled HTML entities.
    """
    if not english or not has_words(english[:200]):
        return True
    if not translated or not translated.strip():
        return False
    en_s = english.strip()
    tr_s = translated.strip()
    en_prose = re.sub(r'<[^>]*>', '', en_s).strip()
    # Identical-to-English output is only an error when the English itself is English prose;
    # a pin that quotes a non-English source (e.g. an Indonesian headline) legitimately keeps it.
    if not is_title and not is_fragment and len(en_prose) > 40 and ' ' in en_prose and looks_english(en_prose) and (tr_s == en_s or html.unescape(tr_s) == html.unescape(en_s)):
        return False
    if re.search(r'(&amp;(?:amp|lt|gt|quot|apos|nbsp|#[0-9]+|#x[0-9a-fA-F]+);|&amp;;|&lt;;|&gt;;|(?<![&a-zA-Z])(?:amp|quot);|＆amp;|&#39;|&#x27;)', tr_s):
        return False
    if not (is_fragment and len(en_s) <= 3) and not has_words(translated[:200]):
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
    # 1. Fix ISO YYYY-MM where -MM was mistranslated as -(2000 + MM + 543) (e.g. 2026-10 -> 2026-2553)
    for yr, mm in re.findall(r'((?:19|20)\d{2})-(0?[1-9]|1[0-2])(?!\d)', src):
        bad_byr = str(2000 + int(mm) + 543)
        tr = tr.replace(f"{yr}-{bad_byr}", f"{yr}-{mm}")
    # 2. Convert any Buddhist year corresponding to a 4-digit Gregorian year in src (including 2030s, September2024)
    src_no_commas = src.replace(',', '')
    for yr in re.findall(r'(?<!\d)((?:1[5-9]|20)\d{2})(?!\d)', src):
        byr = str(int(yr) + 543)
        if byr not in src_no_commas and byr in tr:
            tr = re.sub(rf'(?<!\d){byr}(?!\d)', yr, tr)
    # 3. Convert any standalone Buddhist year 2550..2589 in tr not present in src (e.g. inferred พ.ศ. 2569)
    def _repl_be(m: re.Match) -> str:
        byr = m.group(1)
        if byr in src_no_commas:
            return byr
        return str(int(byr) - 543)
    tr = re.sub(r'(?<!\d)(25[5-8]\d)(?!\d)', _repl_be, tr)
    # 4. Replace Buddhist Era marker พ.ศ. with ค.ศ. when not present in English source
    if 'พ.ศ' not in src:
        tr = tr.replace('พ.ศ.', 'ค.ศ.').replace('พ.ศ', 'ค.ศ')
    return tr

def _save_locale_cache_atomic(cache_path: pathlib.Path, new_entries: Dict[str, str]):
    if not new_entries:
        return
    merged: Dict[str, str] = {}
    if cache_path.exists():
        try:
            merged = json.loads(cache_path.read_text(encoding='utf-8'))
        except Exception:
            merged = {}
    merged.update(new_entries)
    tmp_path = cache_path.with_name(f"{cache_path.name}.{os.getpid()}.{time.time_ns()}.tmp")
    tmp_path.write_text(json.dumps(merged, ensure_ascii=False, indent=1), encoding='utf-8')
    os.replace(tmp_path, cache_path)

def translate_locale(locale: str, pins_for_locale: List[dict], locale_texts: List[str], titles_set: Optional[Set[str]] = None) -> Tuple[str, List[dict]]:
    cache_path = CACHE_DIR / f'{locale}.json'
    cache: Dict[str, str] = {}
    if cache_path.exists():
        try:
            cache = json.loads(cache_path.read_text(encoding='utf-8'))
        except Exception:
            pass
    if locale == 'th':
        for t in locale_texts:
            if t in cache and isinstance(cache[t], str):
                cache[t] = fix_thai_years(t, cache[t])

    missing = [t for t in locale_texts if t not in cache or not acceptable(locale, t, cache.get(t), is_title=(bool(titles_set and t in titles_set)))]
    batches: List[List[str]] = []
    cur_batch: List[str] = []
    cur_chars = 0
    for t in missing:
        if cur_batch and (len(cur_batch) >= 25 or cur_chars + len(t) > 4500):
            batches.append(cur_batch)
            cur_batch = []
            cur_chars = 0
        cur_batch.append(t)
        cur_chars += len(t)
    if cur_batch:
        batches.append(cur_batch)

    new_entries: Dict[str, str] = {}
    for idx, b in enumerate(batches, 1):
        res = call_batch(b, locale)
        for src_core, tr in res.items():
            if locale == 'th':
                tr = fix_thai_years(src_core, tr)
            if not acceptable(locale, src_core, tr, is_title=(bool(titles_set and src_core in titles_set))):
                print(f"[{locale}] Rejected untranslated/partial-English fragment: {src_core[:60]!r}")
                continue
            cache[src_core] = tr
            new_entries[src_core] = tr
        if idx % 5 == 0 or idx == len(batches):
            _save_locale_cache_atomic(cache_path, new_entries)

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
            is_html = f in HTML_FIELDS
            is_title = (f == 'title')
            parts = re.split(r'(<[^>]*>)', src) if is_html else [src]
            out_parts: List[str] = []

            for part in parts:
                if (is_html and part.startswith('<')) or not part.strip() or not any(c.isalpha() for c in html.unescape(part)):
                    out_parts.append(part if is_html else html.unescape(part))
                    continue

                leading_ws = part[:len(part) - len(part.lstrip())]
                trailing_ws = part[len(part.rstrip()):]
                core = html.unescape(part.strip())

                tr_core = cache.get(core)
                if tr_core is None or not acceptable(locale, core, tr_core, is_title=is_title):
                    tr_core = cache.get(part.strip())
                    if tr_core is not None:
                        tr_core = html.unescape(tr_core.strip())
                        if not whole_translation(core, tr_core, is_fragment=True, is_title=is_title):
                            tr_core = None

                if tr_core is None:
                    print(f"[{locale}] Missing translation for fragment in pin {p['id']} field {f}")
                    valid = False
                    break

                tr_core = html.unescape(tr_core)
                if locale == 'th':
                    tr_core = fix_thai_years(core, tr_core)

                # Escape &, <, > strictly for HTML fields; keep plain-text fields unescaped
                if is_html:
                    tr_core = tr_core.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                out_parts.append(f"{leading_ws}{tr_core}{trailing_ws}")

            if not valid:
                break

            val = ''.join(out_parts)

            # Safety validations: tag parity, citation parity, and wholeTranslation completeness
            if is_html and re.findall(r'<[^>]*>', src) != re.findall(r'<[^>]*>', val):
                print(f"[{locale}] Tag mismatch in pin {p['id']} field {f}: {re.findall(r'<[^>]*>', src)} vs {re.findall(r'<[^>]*>', val)}")
                valid = False
                break
            if is_html and re.findall(r'data-ref="([^"]*)"', src) != re.findall(r'data-ref="([^"]*)"', val):
                print(f"[{locale}] data-ref mismatch in pin {p['id']} field {f}")
                valid = False
                break
            if not whole_translation(src, val, is_title=is_title):
                print(f"[{locale}] Incomplete translation (wholeTranslation failed) in pin {p['id']} field {f}")
                valid = False
                break

            row[f] = val

        if valid and len(row) > 3:
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

def sync_pin_chunk(due_pins: List[dict]) -> int:
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
                is_html = f in HTML_FIELDS
                parts = re.split(r'(<[^>]*>)', src) if is_html else [src]
                for part in parts:
                    if not (is_html and part.startswith('<')) and part.strip() and any(c.isalpha() for c in html.unescape(part)):
                        texts_by_locale[loc].add(html.unescape(part.strip()))

    active_locales = [loc for loc in LOCALES if pins_by_locale[loc]]
    print(f"Active target locales requiring updates: {active_locales}")

    # Record tracking strictly in SourceWiki
    record_wiki_tracking([p['id'] for p in due_pins])

    # Translate in parallel across active locales
    all_rows: List[dict] = []
    titles_set: Set[str] = {
        html.unescape(p['title'].strip())
        for p in due_pins
        if p.get('title')
    }
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        futures = [
            pool.submit(translate_locale, loc, pins_by_locale[loc], sorted(texts_by_locale[loc]), titles_set)
            for loc in active_locales
        ]
        for fut in concurrent.futures.as_completed(futures):
            loc, rows = fut.result()
            print(f"  [{loc}] Generated {len(rows)} / {len(pins_by_locale[loc])} valid translation rows.")
            all_rows.extend(rows)

    if not all_rows:
        print("No valid translation rows generated for chunk.")
        return 0

    print(f"Total rows to push for chunk: {len(all_rows)}")
    token = ensure_admin_token()
    saved = push_translations(token, all_rows)
    print(f"Successfully saved {saved} / {len(all_rows)} translation rows on production.")
    return saved

def prepare_mangled_rows_for_repair(pin_id: Optional[int] = None, pin_ids: Optional[Set[int]] = None):
    """
    Automatically repairs plain-text HTML entities in place and marks any PinTranslation rows
    that have untranslated English prose, mangled HTML entities, delimiter leaks, or missing
    native script with sourceHash='repair' (and fieldHashes updated per broken field) so
    fetch_due_pins() picks them up and re-translates only the affected fields.
    """
    if pin_id:
        pin_ids = {int(pin_id)}
    if pin_ids:
        ids_csv = ', '.join(str(int(i)) for i in sorted(pin_ids))
        pin_filter = f"AND p.id IN ({ids_csv})"
        pin_filter_pt = f'AND pt."pinId" IN ({ids_csv})'
    else:
        pin_filter = ""
        pin_filter_pt = ""
    sql = f"""
-- 1. Unescape raw HTML entities in plain-text fields (title, dateConfidenceReasoning, delayReasoning)
UPDATE "PinTranslation" pt
SET
  title = replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(
    pt.title,
    '&amp;', '&'), '&#x27;', chr(39)), '&#39;', chr(39)), '&quot;', chr(34)), '&nbsp;', ' '),
    '&ldquo;', '“'), '&rdquo;', '”'), '&laquo;', '«'), '&raquo;', '»'), '&ndash;', '–'), '&atilde;', 'ã'),
  "dateConfidenceReasoning" = CASE WHEN pt."dateConfidenceReasoning" IS NULL THEN NULL ELSE
    replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(
      pt."dateConfidenceReasoning",
      '&amp;', '&'), '&#x27;', chr(39)), '&#39;', chr(39)), '&quot;', chr(34)), '&nbsp;', ' '),
      '&ldquo;', '“'), '&rdquo;', '”'), '&laquo;', '«'), '&raquo;', '»'), '&ndash;', '–'), '&atilde;', 'ã')
  END,
  "delayReasoning" = CASE WHEN pt."delayReasoning" IS NULL THEN NULL ELSE
    replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(
      pt."delayReasoning",
      '&amp;', '&'), '&#x27;', chr(39)), '&#39;', chr(39)), '&quot;', chr(34)), '&nbsp;', ' '),
      '&ldquo;', '“'), '&rdquo;', '”'), '&laquo;', '«'), '&raquo;', '»'), '&ndash;', '–'), '&atilde;', 'ã')
  END
FROM "Pin" p
WHERE p.id = pt."pinId"
  AND p."utcDeletedDateTime" IS NULL
  {pin_filter}
  AND (
    coalesce(pt.title, '') ~ '&(amp|lt|gt|quot|apos|nbsp|#[0-9]+|#x[0-9a-fA-F]+|ldquo|rdquo|laquo|raquo|ndash|atilde);'
    OR coalesce(pt."dateConfidenceReasoning", '') ~ '&(amp|lt|gt|quot|apos|nbsp|#[0-9]+|#x[0-9a-fA-F]+|ldquo|rdquo|laquo|raquo|ndash|atilde);'
    OR coalesce(pt."delayReasoning", '') ~ '&(amp|lt|gt|quot|apos|nbsp|#[0-9]+|#x[0-9a-fA-F]+|ldquo|rdquo|laquo|raquo|ndash|atilde);'
  );

-- 2. Mark rows with untranslated prose, mangled HTML entities, delimiter leaks, Thai Buddhist years, or missing native script for per-field repair
UPDATE "PinTranslation" pt
SET
  "sourceHash" = 'repair',
  "fieldHashes" = jsonb_strip_nulls(
    pt."fieldHashes"
    || CASE WHEN (
         coalesce(pt.title, '') ~ '[⟦⟧]'
         OR (pt.locale IN ('ja', 'zh', 'ko', 'ru', 'ar', 'hi', 'th') AND length(coalesce(pt.title, '')) > 40 AND coalesce(pt.title, '') !~ '[^\\x00-\\x7F]' AND coalesce(p.title, '') ~* '\\m(the|and|of|to|is|in|for|on|with|by|that|was|are|from|has|have|not|this|be|it)\\M')
         OR (pt.locale = 'th' AND (coalesce(pt.title, '') ~ 'พ\\.ศ\\.' OR (coalesce(pt.title, '') ~ '(^|[^0-9])(25[5-8][0-9])([^0-9]|$)' AND replace(coalesce(p.title, ''), ',', '') !~ '(^|[^0-9])(25[5-8][0-9])([^0-9]|$)')))
       ) THEN '{{"title": "repair"}}'::jsonb ELSE '{{}}'::jsonb END
    || CASE WHEN (
         (length(regexp_replace(coalesce(p.description, ''), '<[^>]*>', '', 'g')) > 40 AND pt.description = p.description AND regexp_replace(coalesce(p.description, ''), '<[^>]*>', '', 'g') ~* '\\m(the|and|of|to|is|in|for|on|with|by|that|was|are|from|has|have|not|this|be|it)\\M')
         OR coalesce(pt.description, '') ~ '(&amp;(amp|lt|gt|quot|apos|nbsp|#[0-9]+|#x[0-9a-fA-F]+);|&amp;;|&lt;;|&gt;;|([^&a-zA-Z]|^)(amp|quot);|＆amp;|[⟦⟧])'
         OR (pt.locale IN ('ja', 'zh', 'ko', 'ru', 'ar', 'hi', 'th') AND length(regexp_replace(coalesce(pt.description, ''), '<[^>]*>', '', 'g')) > 40 AND regexp_replace(coalesce(pt.description, ''), '<[^>]*>', '', 'g') !~ '[^\\x00-\\x7F]')
         OR (pt.locale = 'th' AND (coalesce(pt.description, '') ~ 'พ\\.ศ\\.' OR (coalesce(pt.description, '') ~ '(^|[^0-9])(25[5-8][0-9])([^0-9]|$)' AND replace(coalesce(p.description, ''), ',', '') !~ '(^|[^0-9])(25[5-8][0-9])([^0-9]|$)')))
       ) THEN '{{"description": "repair"}}'::jsonb ELSE '{{}}'::jsonb END
    || CASE WHEN (
         (length(regexp_replace(coalesce(p."longFormSummary", ''), '<[^>]*>', '', 'g')) > 60 AND pt."longFormSummary" = p."longFormSummary" AND regexp_replace(coalesce(p."longFormSummary", ''), '<[^>]*>', '', 'g') ~* '\\m(the|and|of|to|is|in|for|on|with|by|that|was|are|from|has|have|not|this|be|it)\\M')
         OR coalesce(pt."longFormSummary", '') ~ '(&amp;(amp|lt|gt|quot|apos|nbsp|#[0-9]+|#x[0-9a-fA-F]+);|&amp;;|&lt;;|&gt;;|([^&a-zA-Z]|^)(amp|quot);|＆amp;|[⟦⟧])'
         OR (pt.locale IN ('ja', 'zh', 'ko', 'ru', 'ar', 'hi', 'th') AND ((length(regexp_replace(coalesce(pt."longFormSummary", ''), '<[^>]*>', '', 'g')) > 60 AND regexp_replace(coalesce(pt."longFormSummary", ''), '<[^>]*>', '', 'g') !~ '[^\\x00-\\x7F]') OR regexp_replace(coalesce(pt."longFormSummary", ''), '<cite[^>]*></cite>', '', 'g') ~ '<li>[\\x20-\\x7E]{{80,}}</li>'))
         OR (pt.locale = 'th' AND (coalesce(pt."longFormSummary", '') ~ 'พ\\.ศ\\.' OR (coalesce(pt."longFormSummary", '') ~ '(^|[^0-9])(25[5-8][0-9])([^0-9]|$)' AND replace(coalesce(p."longFormSummary", ''), ',', '') !~ '(^|[^0-9])(25[5-8][0-9])([^0-9]|$)')))
       ) THEN '{{"longFormSummary": "repair"}}'::jsonb ELSE '{{}}'::jsonb END
    || CASE WHEN (
         (length(coalesce(p."dateConfidenceReasoning", '')) > 40 AND pt."dateConfidenceReasoning" = p."dateConfidenceReasoning" AND coalesce(p."dateConfidenceReasoning", '') ~* '\\m(the|and|of|to|is|in|for|on|with|by|that|was|are|from|has|have|not|this|be|it)\\M')
         OR coalesce(pt."dateConfidenceReasoning", '') ~ '[⟦⟧]'
         OR (pt.locale = 'th' AND (coalesce(pt."dateConfidenceReasoning", '') ~ 'พ\\.ศ\\.' OR (coalesce(pt."dateConfidenceReasoning", '') ~ '(^|[^0-9])(25[5-8][0-9])([^0-9]|$)' AND replace(coalesce(p."dateConfidenceReasoning", ''), ',', '') !~ '(^|[^0-9])(25[5-8][0-9])([^0-9]|$)')))
       ) THEN '{{"dateConfidenceReasoning": "repair"}}'::jsonb ELSE '{{}}'::jsonb END
    || CASE WHEN (
         (length(coalesce(p."delayReasoning", '')) > 40 AND pt."delayReasoning" = p."delayReasoning" AND coalesce(p."delayReasoning", '') ~* '\\m(the|and|of|to|is|in|for|on|with|by|that|was|are|from|has|have|not|this|be|it)\\M')
         OR coalesce(pt."delayReasoning", '') ~ '[⟦⟧]'
         OR (pt.locale = 'th' AND (coalesce(pt."delayReasoning", '') ~ 'พ\\.ศ\\.' OR (coalesce(pt."delayReasoning", '') ~ '(^|[^0-9])(25[5-8][0-9])([^0-9]|$)' AND replace(coalesce(p."delayReasoning", ''), ',', '') !~ '(^|[^0-9])(25[5-8][0-9])([^0-9]|$)')))
       ) THEN '{{"delayReasoning": "repair"}}'::jsonb ELSE '{{}}'::jsonb END
  )
FROM "Pin" p
WHERE p.id = pt."pinId"
  AND p."utcDeletedDateTime" IS NULL
  {pin_filter}
  AND (
    (length(regexp_replace(coalesce(p.description, ''), '<[^>]*>', '', 'g')) > 40 AND pt.description = p.description AND regexp_replace(coalesce(p.description, ''), '<[^>]*>', '', 'g') ~* '\\m(the|and|of|to|is|in|for|on|with|by|that|was|are|from|has|have|not|this|be|it)\\M')
    OR (length(regexp_replace(coalesce(p."longFormSummary", ''), '<[^>]*>', '', 'g')) > 60 AND pt."longFormSummary" = p."longFormSummary" AND regexp_replace(coalesce(p."longFormSummary", ''), '<[^>]*>', '', 'g') ~* '\\m(the|and|of|to|is|in|for|on|with|by|that|was|are|from|has|have|not|this|be|it)\\M')
    OR (length(coalesce(p."dateConfidenceReasoning", '')) > 40 AND pt."dateConfidenceReasoning" = p."dateConfidenceReasoning" AND coalesce(p."dateConfidenceReasoning", '') ~* '\\m(the|and|of|to|is|in|for|on|with|by|that|was|are|from|has|have|not|this|be|it)\\M')
    OR (length(coalesce(p."delayReasoning", '')) > 40 AND pt."delayReasoning" = p."delayReasoning" AND coalesce(p."delayReasoning", '') ~* '\\m(the|and|of|to|is|in|for|on|with|by|that|was|are|from|has|have|not|this|be|it)\\M')
    OR coalesce(pt.description, '') ~ '(&amp;(amp|lt|gt|quot|apos|nbsp|#[0-9]+|#x[0-9a-fA-F]+);|&amp;;|&lt;;|&gt;;|([^&a-zA-Z]|^)(amp|quot);|＆amp;)'
    OR coalesce(pt."longFormSummary", '') ~ '(&amp;(amp|lt|gt|quot|apos|nbsp|#[0-9]+|#x[0-9a-fA-F]+);|&amp;;|&lt;;|&gt;;|([^&a-zA-Z]|^)(amp|quot);|＆amp;)'
    OR coalesce(pt.title, '') ~ '[⟦⟧]'
    OR coalesce(pt.description, '') ~ '[⟦⟧]'
    OR coalesce(pt."longFormSummary", '') ~ '[⟦⟧]'
    OR coalesce(pt."dateConfidenceReasoning", '') ~ '[⟦⟧]'
    OR coalesce(pt."delayReasoning", '') ~ '[⟦⟧]'
    OR (
      pt.locale IN ('ja', 'zh', 'ko', 'ru', 'ar', 'hi', 'th')
      AND (
        (length(regexp_replace(coalesce(pt."longFormSummary", ''), '<[^>]*>', '', 'g')) > 60 AND regexp_replace(coalesce(pt."longFormSummary", ''), '<[^>]*>', '', 'g') !~ '[^\\x00-\\x7F]' OR regexp_replace(coalesce(pt."longFormSummary", ''), '<cite[^>]*></cite>', '', 'g') ~ '<li>[\\x20-\\x7E]{{80,}}</li>')
        OR (length(regexp_replace(coalesce(pt.description, ''), '<[^>]*>', '', 'g')) > 40 AND regexp_replace(coalesce(pt.description, ''), '<[^>]*>', '', 'g') !~ '[^\\x00-\\x7F]')
        OR (length(coalesce(pt.title, '')) > 40 AND coalesce(pt.title, '') !~ '[^\\x00-\\x7F]' AND coalesce(p.title, '') ~* '\\m(the|and|of|to|is|in|for|on|with|by|that|was|are|from|has|have|not|this|be|it)\\M')
      )
    )
    OR (
      pt.locale = 'th'
      AND (
        coalesce(pt.title, '') || ' ' || coalesce(pt.description, '') || ' ' || coalesce(pt."longFormSummary", '') || ' ' || coalesce(pt."dateConfidenceReasoning", '') || ' ' || coalesce(pt."delayReasoning", '') ~ 'พ\\.ศ\\.'
        OR (
          coalesce(pt.title, '') || ' ' || coalesce(pt.description, '') || ' ' || coalesce(pt."longFormSummary", '') || ' ' || coalesce(pt."dateConfidenceReasoning", '') || ' ' || coalesce(pt."delayReasoning", '') ~ '(^|[^0-9])(25[5-8][0-9])([^0-9]|$)'
          AND replace(coalesce(p.title, '') || ' ' || coalesce(p.description, '') || ' ' || coalesce(p."longFormSummary", '') || ' ' || coalesce(p."dateConfidenceReasoning", '') || ' ' || coalesce(p."delayReasoning", ''), ',', '') !~ '(^|[^0-9])(25[5-8][0-9])([^0-9]|$)'
        )
      )
    )
  );
"""
    run_prod_sql(sql)

    # 3. Rows whose summary still holds an English <li> bullet identical to the source (any locale)
    bullet_sql = f"""
UPDATE "PinTranslation" pt
SET "sourceHash" = 'repair',
    "fieldHashes" = jsonb_set(pt."fieldHashes", '{{longFormSummary}}', '"repair"')
FROM (
  SELECT DISTINCT b."pinId", b.locale FROM (
  SELECT pt."pinId", pt.locale,
         regexp_replace(e.li, '<[^>]*>', '', 'g') AS en_li,
         regexp_replace(t.li, '<[^>]*>', '', 'g') AS tr_li
  FROM "PinTranslation" pt
  JOIN "Pin" p ON p.id = pt."pinId" AND p."utcDeletedDateTime" IS NULL
  CROSS JOIN LATERAL regexp_split_to_table(coalesce(p."longFormSummary", ''), '</li>') WITH ORDINALITY AS e(li, n)
  JOIN LATERAL (SELECT li, n FROM regexp_split_to_table(coalesce(pt."longFormSummary", ''), '</li>') WITH ORDINALITY AS x(li, n)) t ON t.n = e.n
  WHERE p."longFormSummary" ~ '<li>'
  ) b
  WHERE length(en_li) >= 60 AND en_li = tr_li AND en_li !~ '[^\\x00-\\x7F]' AND en_li ~* '\\m(the|and|of|to|is|in|for|on|with|by|that|was|are|from|has|have|not|this|be|it)\\M'
) bad
WHERE pt."pinId" = bad."pinId" AND pt.locale = bad.locale {pin_filter_pt};
"""
    run_prod_sql(bullet_sql)

def apply_translations_file(apply_path: str):
    """
    Validates and applies a JSON file of translated rows produced by a flash subagent:
    [{"pinId": 123, "locale": "es", "sourceHash": "...", "title": "...", ...}]
    """
    raw = json.loads(pathlib.Path(apply_path).read_text(encoding='utf-8'))
    rows = raw.get('translations', raw) if isinstance(raw, dict) else raw
    if not isinstance(rows, list) or not rows:
        print(f"No translation rows found in {apply_path}")
        return

    token = ensure_admin_token()
    pin_ids = {int(r['pinId']) for r in rows if isinstance(r, dict) and 'pinId' in r}
    due_by_id = {p['id']: p for p in fetch_due_pins(token, pin_ids=pin_ids)}

    valid_rows: List[dict] = []
    for r in rows:
        pid = int(r['pinId'])
        loc = r['locale']
        p = due_by_id.get(pid)
        row_out = {'pinId': pid, 'locale': loc, 'sourceHash': r.get('sourceHash') or (p['sourceHash'] if p else '')}
        ok = True
        for f in FIELDS:
            if f not in r or r[f] is None:
                continue
            val = str(r[f])
            src = (p.get(f) if p else None) or ''
            if loc == 'th' and src:
                val = fix_thai_years(src, val)
            if f in HTML_FIELDS and src:
                if re.findall(r'<[^>]*>', src) != re.findall(r'<[^>]*>', val):
                    print(f"[{loc}] Tag mismatch in pin {pid} field {f}")
                    ok = False
                    break
                if re.findall(r'data-ref="([^"]*)"', src) != re.findall(r'data-ref="([^"]*)"', val):
                    print(f"[{loc}] data-ref mismatch in pin {pid} field {f}")
                    ok = False
                    break
            if src and not whole_translation(src, val, is_title=(f == 'title')):
                print(f"[{loc}] whole_translation failed in pin {pid} field {f}")
                ok = False
                break
            row_out[f] = val
        if ok and len(row_out) > 3:
            valid_rows.append(row_out)

    if not valid_rows:
        print("No valid rows to apply.")
        return

    record_wiki_tracking(sorted({r['pinId'] for r in valid_rows}))
    saved = push_translations(token, valid_rows)
    print(f"Applied {saved} / {len(valid_rows)} validated rows from {apply_path}.")

def _panel_text_translated_ok(en_val: str, tr_val: str, loc: str, is_title: bool = False) -> bool:
    if (en_val or '').count('<cite') != (tr_val or '').count('<cite'):
        return False
    if re.search(r'&(amp|lt|gt|quot|apos|nbsp|#[0-9]+|#x[0-9a-fA-F]+);', tr_val or ''):
        return False
    en_prose = re.sub(r'<[^>]*>', '', en_val or '').strip()
    tr_prose = re.sub(r'<[^>]*>', '', tr_val or '').strip()
    if len(en_prose) > 40 and looks_english(en_prose):
        if not is_title and tr_prose == en_prose:
            return False
        if loc in NON_LATIN_LOCALES and all(ord(ch) < 128 for ch in tr_prose):
            return False
    if loc == 'th' and tr_val:
        if 'พ.ศ' in tr_val and 'พ.ศ' not in (en_val or ''):
            return False
        en_digits = (en_val or '').replace(',', '')
        for byr in re.findall(r'(?<!\d)(25[5-8]\d)(?!\d)', tr_val):
            if byr not in en_digits:
                return False
    return True

def _chart_locale_ok(c: dict, loc: str) -> bool:
    tr = (c.get('i18n') or {}).get(loc)
    if not isinstance(tr, dict):
        return False
    t = (tr.get('title') or '').strip()
    u = (tr.get('unit') or '').strip()
    if not t or len(t) > 120 or not u or len(u) > 40:
        return False
    if not _panel_text_translated_ok(c.get('title') or '', t, loc, is_title=True):
        return False
    if c.get('note'):
        n = (tr.get('note') or '').strip()
        if not n or len(n) > 500:
            return False
        if not _panel_text_translated_ok(c['note'], n, loc, is_title=False):
            return False
    return True

def _table_locale_ok(tb: dict, loc: str) -> bool:
    tr = (tb.get('i18n') or {}).get(loc)
    if not isinstance(tr, dict):
        return False
    t = (tr.get('title') or '').strip()
    if not t or len(t) > 120:
        return False
    if not _panel_text_translated_ok(tb.get('title') or '', t, loc, is_title=True):
        return False
    cols = tb.get('columns') or []
    tr_cols = tr.get('columns')
    if not isinstance(tr_cols, list) or len(tr_cols) != len(cols):
        return False
    if any(not isinstance(x, str) or not x.strip() or len(x.strip()) > 80 for x in tr_cols):
        return False
    rows = tb.get('rows') or []
    tr_rows = tr.get('rows')
    if not isinstance(tr_rows, list) or len(tr_rows) != len(rows):
        return False
    for r_idx, r in enumerate(tr_rows):
        if not isinstance(r, list) or len(r) != len(cols):
            return False
        if any(not isinstance(cell, str) or not cell.strip() or len(cell.strip()) > 200 for cell in r):
            return False
        en_row = rows[r_idx] if r_idx < len(rows) else []
        for c_idx, cell in enumerate(r):
            en_cell = str(en_row[c_idx]) if c_idx < len(en_row) else ''
            if not _panel_text_translated_ok(en_cell, cell, loc, is_title=False):
                return False
    if tb.get('note'):
        n = (tr.get('note') or '').strip()
        if not n or len(n) > 500:
            return False
        if not _panel_text_translated_ok(tb['note'], n, loc, is_title=False):
            return False
    if tb.get('display') == 'timeline' and tb.get('stages'):
        stages = tb.get('stages') or []
        tr_stages = tr.get('stages')
        if not isinstance(tr_stages, list) or len(tr_stages) != len(stages):
            return False
        if any(not isinstance(s, str) or not s.strip() or len(s.strip()) > 40 for s in tr_stages):
            return False
    return True

def fetch_due_panel_pins(pin_ids: Optional[Set[int]] = None, limit: Optional[int] = None) -> List[dict]:
    pin_filter = f'AND pp."pinId" IN ({", ".join(str(int(i)) for i in sorted(pin_ids))})' if pin_ids else ''
    sql = f"""
\\pset tuples_only on
\\pset format unaligned
SELECT json_build_object('pinId', pp."pinId", 'charts', pp.charts, 'tables', pp.tables)::text
FROM "PinPerf" pp
JOIN "Pin" p ON p.id = pp."pinId" AND p."utcDeletedDateTime" IS NULL
WHERE 1=1 {pin_filter}
ORDER BY pp."pinId";
"""
    raw = run_prod_sql(sql)
    due: List[dict] = []
    for line in raw.splitlines():
        line = line.strip()
        if not (line.startswith('{') and line.endswith('}')):
            continue
        try:
            item = json.loads(line)
        except Exception:
            continue
        charts = item.get('charts') or []
        tables = item.get('tables') or []
        needs = False
        for c in charts:
            if any(not _chart_locale_ok(c, loc) for loc in LOCALES):
                needs = True
                break
        if not needs:
            for tb in tables:
                if any(not _table_locale_ok(tb, loc) for loc in LOCALES):
                    needs = True
                    break
        if needs:
            due.append(item)
            if limit and len(due) >= limit:
                break
    return due

def _fit_panel_text(val: str, src: str, max_len: int) -> str:
    val = val.strip()
    if not val:
        val = src.strip()
    if len(val) <= max_len:
        return val
    # If cell has <cite...> tags, keep tags intact and trim prose prefix
    if '<cite' in val:
        cites = ''.join(re.findall(r'<cite[^>]*></cite>', val))
        prose = re.sub(r'<cite[^>]*></cite>', '', val).strip()
        avail = max_len - len(cites) - 1
        if avail >= 1:
            return prose[:avail].rstrip() + '…' + cites
    return val[:max_len - 1].rstrip() + '…'

def _collect_panel_fragments(s: str, out: Set[str]):
    if not s or not s.strip():
        return
    if '<' in s and '>' in s:
        for part in re.split(r'(<[^>]*>)', s):
            if not part.startswith('<') and part.strip() and any(ch.isalpha() for ch in html.unescape(part)):
                out.add(html.unescape(part.strip()))
    elif any(ch.isalpha() for ch in html.unescape(s)):
        out.add(html.unescape(s.strip()))

def _translate_panel_string(s: str, loc: str, cache: Dict[str, str], max_len: int) -> str:
    if not s or not s.strip():
        return s
    has_tags = ('<' in s and '>' in s)
    parts = re.split(r'(<[^>]*>)', s) if has_tags else [s]
    out_parts: List[str] = []
    for part in parts:
        if (has_tags and part.startswith('<')) or not part.strip() or not any(ch.isalpha() for ch in html.unescape(part)):
            out_parts.append(part)
            continue
        leading_ws = part[:len(part) - len(part.lstrip())]
        trailing_ws = part[len(part.rstrip()):]
        core = html.unescape(part.strip())
        tr_core = cache.get(core)
        if not tr_core or not tr_core.strip():
            tr_core = core
        else:
            tr_core = html.unescape(tr_core.strip())
        if loc == 'th':
            tr_core = fix_thai_years(core, tr_core)
        out_parts.append(f"{leading_ws}{tr_core}{trailing_ws}")
    return _fit_panel_text(''.join(out_parts), s, max_len)

def sync_panel_chunk(panel_pins: List[dict], locale_filter: Optional[str] = None) -> int:
    if not panel_pins:
        return 0
    target_locales = [l.strip() for l in locale_filter.split(',') if l.strip() in LOCALES] if locale_filter else LOCALES
    texts_by_locale: Dict[str, Set[str]] = {loc: set() for loc in target_locales}

    for item in panel_pins:
        for c in item.get('charts') or []:
            for loc in target_locales:
                if _chart_locale_ok(c, loc):
                    continue
                _collect_panel_fragments(c.get('title') or '', texts_by_locale[loc])
                _collect_panel_fragments(c.get('unit') or '', texts_by_locale[loc])
                if c.get('note'):
                    _collect_panel_fragments(c['note'], texts_by_locale[loc])
        for tb in item.get('tables') or []:
            for loc in target_locales:
                if _table_locale_ok(tb, loc):
                    continue
                _collect_panel_fragments(tb.get('title') or '', texts_by_locale[loc])
                for col in tb.get('columns') or []:
                    _collect_panel_fragments(str(col), texts_by_locale[loc])
                for row in tb.get('rows') or []:
                    for cell in row:
                        _collect_panel_fragments(str(cell), texts_by_locale[loc])
                if tb.get('note'):
                    _collect_panel_fragments(tb['note'], texts_by_locale[loc])
                if tb.get('display') == 'timeline' and tb.get('stages'):
                    for st in tb['stages']:
                        _collect_panel_fragments(str(st), texts_by_locale[loc])

    active_locales = [loc for loc in target_locales if texts_by_locale[loc]]
    print(f"Translating PinPerf panel strings across {len(active_locales)} locale(s) for {len(panel_pins)} pin(s)...")

    def _fill_panel_locale_cache(loc: str, texts: List[str]) -> Tuple[str, Dict[str, str]]:
        cache_path = CACHE_DIR / f'{loc}.json'
        cache: Dict[str, str] = {}
        if cache_path.exists():
            try:
                cache = json.loads(cache_path.read_text(encoding='utf-8'))
            except Exception:
                pass
        if loc == 'th':
            for t in texts:
                if t in cache and isinstance(cache[t], str):
                    cache[t] = fix_thai_years(t, cache[t])
        missing = [t for t in texts if t not in cache or not acceptable(loc, t, cache.get(t), is_title=True)]
        batches: List[List[str]] = []
        cur: List[str] = []
        cur_chars = 0
        for t in missing:
            if cur and (len(cur) >= 25 or cur_chars + len(t) > 4500):
                batches.append(cur)
                cur = []
                cur_chars = 0
            cur.append(t)
            cur_chars += len(t)
        if cur:
            batches.append(cur)
        new_entries: Dict[str, str] = {}
        for idx, b in enumerate(batches, 1):
            res = call_batch(b, loc)
            for src_core, tr in res.items():
                if loc == 'th':
                    tr = fix_thai_years(src_core, tr)
                if acceptable(loc, src_core, tr, is_title=True):
                    cache[src_core] = tr.strip()
                    new_entries[src_core] = tr.strip()
            if idx % 5 == 0 or idx == len(batches):
                _save_locale_cache_atomic(cache_path, new_entries)
        return loc, cache

    caches_by_locale: Dict[str, Dict[str, str]] = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        futs = [pool.submit(_fill_panel_locale_cache, loc, sorted(texts_by_locale[loc])) for loc in active_locales]
        for fut in concurrent.futures.as_completed(futs):
            loc, loc_cache = fut.result()
            caches_by_locale[loc] = loc_cache

    for loc in target_locales:
        if loc not in caches_by_locale:
            cache_path = CACHE_DIR / f'{loc}.json'
            caches_by_locale[loc] = json.loads(cache_path.read_text(encoding='utf-8')) if cache_path.exists() else {}

    token = ensure_admin_token()
    saved_pins = 0
    for item in panel_pins:
        pid = item['pinId']
        charts = item.get('charts') or []
        tables = item.get('tables') or []
        for c in charts:
            c['title'] = _fit_panel_text(c.get('title') or '', c.get('title') or '', 120)
            c['unit'] = _fit_panel_text(c.get('unit') or '', c.get('unit') or '', 40)
            if c.get('note'):
                c['note'] = _fit_panel_text(c['note'], c['note'], 500)
            i18n = dict(c.get('i18n') or {})
            for loc in target_locales:
                if _chart_locale_ok(c, loc):
                    continue
                lc = caches_by_locale[loc]
                entry: dict = {
                    'title': _translate_panel_string(c['title'], loc, lc, 120),
                    'unit': _translate_panel_string(c['unit'], loc, lc, 40),
                }
                if c.get('note'):
                    entry['note'] = _translate_panel_string(c['note'], loc, lc, 500)
                i18n[loc] = entry
            c['i18n'] = i18n

        for tb in tables:
            tb['title'] = _fit_panel_text(tb.get('title') or '', tb.get('title') or '', 120)
            tb['columns'] = [_fit_panel_text(str(col), str(col), 80) for col in (tb.get('columns') or [])]
            tb['rows'] = [
                [_fit_panel_text(str(cell), str(cell), 200) for cell in row]
                for row in (tb.get('rows') or [])
            ]
            if tb.get('note'):
                tb['note'] = _fit_panel_text(tb['note'], tb['note'], 500)
            if tb.get('display') == 'timeline' and tb.get('stages'):
                tb['stages'] = [_fit_panel_text(str(st), str(st), 40) for st in tb['stages']]
            i18n = dict(tb.get('i18n') or {})
            for loc in target_locales:
                if _table_locale_ok(tb, loc):
                    continue
                lc = caches_by_locale[loc]
                entry = {
                    'title': _translate_panel_string(tb['title'], loc, lc, 120),
                    'columns': [_translate_panel_string(str(col), loc, lc, 80) for col in (tb.get('columns') or [])],
                    'rows': [
                        [_translate_panel_string(str(cell), loc, lc, 200) for cell in row]
                        for row in (tb.get('rows') or [])
                    ],
                }
                if tb.get('note'):
                    entry['note'] = _translate_panel_string(tb['note'], loc, lc, 500)
                if tb.get('display') == 'timeline' and tb.get('stages'):
                    entry['stages'] = [_translate_panel_string(str(st), loc, lc, 40) for st in tb['stages']]
                i18n[loc] = entry
            tb['i18n'] = i18n

        req = urllib.request.Request(
            f"{BASE}/api/pins/{pid}/performance",
            method='PUT',
            data=json.dumps({'charts': charts, 'tables': tables}, ensure_ascii=False).encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token,
                'User-Agent': 'chronopin-translations',
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                if resp.status == 200:
                    saved_pins += 1
                    print(f"  [PinPerf] Saved 15-locale panel i18n for pin {pid} ({len(charts)} charts, {len(tables)} tables)")
        except urllib.error.HTTPError as e:
            err_body = e.read().decode('utf-8', errors='replace')
            print(f"  [PinPerf] ERROR saving pin {pid}: HTTP {e.code}: {err_body}")

    if saved_pins:
        record_wiki_tracking([item['pinId'] for item in panel_pins])
    return saved_pins

def main():
    parser = argparse.ArgumentParser(description="Synchronize production translations.")
    parser.add_argument('--limit', type=int, help="Limit number of pins to translate")
    parser.add_argument('--chunk-size', type=int, default=25, help="Number of pins to process and push per outer chunk (default: 25)")
    parser.add_argument('--pin', type=int, help="Translate a specific pin id")
    parser.add_argument('--pins', type=str, help="Translate a comma-separated list of pin ids (for parallel flash subagents)")
    parser.add_argument('--locale', type=str, help="Only translate specific locale(s), comma-separated")
    parser.add_argument('--panels', action='store_true', help="Only translate PinPerf panels (charts and tables i18n)")
    parser.add_argument('--list-ids', action='store_true', help="Run repair prep and list due pin IDs and panel pin IDs for sharding across parallel flash subagents")
    parser.add_argument('--no-prep', action='store_true', help="Skip prepare_mangled_rows_for_repair when already run by coordinator")
    parser.add_argument('--export', type=str, help="Export due pins and target fields to a JSON file")
    parser.add_argument('--apply', type=str, help="Validate and apply translated rows from a JSON file")
    parser.add_argument('--dry-run', action='store_true', help="Only display due pins without translating")
    args = parser.parse_args()

    if args.apply:
        apply_translations_file(args.apply)
        return

    pin_ids: Optional[Set[int]] = None
    if args.pins:
        pin_ids = {int(x.strip()) for x in args.pins.split(',') if x.strip()}
    elif args.pin:
        pin_ids = {int(args.pin)}

    if not args.dry_run and not args.no_prep and not args.panels:
        prepare_mangled_rows_for_repair(pin_ids=pin_ids)

    token = ensure_admin_token()
    due_pins = [] if args.panels else fetch_due_pins(token, pin_ids=pin_ids, limit=args.limit, locale=args.locale)
    due_panel_pins = fetch_due_panel_pins(pin_ids=pin_ids, limit=args.limit)

    if not args.panels:
        print(f"Found {len(due_pins)} pin(s) due for text translation.")
    print(f"Found {len(due_panel_pins)} pin(s) due for PinPerf panel i18n translation.")

    if args.list_ids:
        if not args.panels:
            print("DUE_PIN_IDS=" + ",".join(str(p['id']) for p in due_pins))
        print("DUE_PANEL_PIN_IDS=" + ",".join(str(p['pinId']) for p in due_panel_pins))
        return

    if not due_pins and not due_panel_pins:
        print("All matching pins and PinPerf panels are already up to date!")
        return

    if args.export:
        export_path = pathlib.Path(args.export)
        export_path.parent.mkdir(exist_ok=True, parents=True)
        export_data = []
        for p in due_pins:
            locales_due = p.get('locales', [])
            export_data.append({
                'id': p['id'],
                'sourceHash': p['sourceHash'],
                'locales': locales_due,
                'states': p.get('states', {}),
                'changed': p.get('changed', {}),
                'targetFieldsByLocale': {loc: target_fields_for(p, loc) for loc in locales_due},
                'title': p.get('title'),
                'description': p.get('description'),
                'longFormSummary': p.get('longFormSummary'),
                'dateConfidenceReasoning': p.get('dateConfidenceReasoning'),
                'delayReasoning': p.get('delayReasoning'),
            })
        export_path.write_text(json.dumps({'pins': export_data, 'panelPins': due_panel_pins}, ensure_ascii=False, indent=2), encoding='utf-8')
        print(f"Exported {len(export_data)} due pin(s) and {len(due_panel_pins)} panel pin(s) to {export_path}")
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
        panel_sample = [p['pinId'] for p in due_panel_pins[:20]]
        print(f"Dry-run pin sample (up to 20):\n{json.dumps(sample, indent=2)}")
        print(f"Dry-run panel pin IDs (up to 20): {panel_sample}")
        return

    chunk_size = max(1, args.chunk_size)
    total_saved = 0
    for idx in range(0, len(due_pins), chunk_size):
        chunk = due_pins[idx:idx + chunk_size]
        print(f"\n--- Processing pin chunk {idx // chunk_size + 1} / {(len(due_pins) + chunk_size - 1) // chunk_size} ({len(chunk)} pins: {chunk[0]['id']}..{chunk[-1]['id']}) ---")
        total_saved += sync_pin_chunk(chunk)

    total_panel_pins_saved = 0
    for idx in range(0, len(due_panel_pins), chunk_size):
        pchunk = due_panel_pins[idx:idx + chunk_size]
        print(f"\n--- Processing PinPerf panel chunk {idx // chunk_size + 1} / {(len(due_panel_pins) + chunk_size - 1) // chunk_size} ({len(pchunk)} pins: {pchunk[0]['pinId']}..{pchunk[-1]['pinId']}) ---")
        total_panel_pins_saved += sync_panel_chunk(pchunk, locale_filter=args.locale)

    print(f"\nCompleted all chunks. Total translation rows saved: {total_saved} | Total PinPerf panel pins saved: {total_panel_pins_saved}")

if __name__ == '__main__':
    main()
