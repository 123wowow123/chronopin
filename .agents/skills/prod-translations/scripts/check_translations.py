#!/usr/bin/env python3
"""
Checks the health of translations across all active Chronopin production pins.
- Verifies that all 15 target locales exist, match the current English text hash,
  and pass wholeTranslation completeness checks (no missing words, mismatched <li>/<cite>
  tags, or truncated text).
- Scans both Pin and PinTranslation (all 15 localized tracking strings) for any prohibited
  model attribution strings in public content.
- Outputs a clean terminal report (or JSON with --json) and exits 0 if current, 1 if action is needed.

Usage:
    python3 .agents/skills/prod-translations/scripts/check_translations.py [--json]
"""

import json
import os
import pathlib
import subprocess
import sys
import urllib.request

BASE = 'https://www.chronopin.com'
LOCALES = ['es', 'fr', 'de', 'ja', 'zh', 'ko', 'hi', 'ar', 'th', 'it', 'ru', 'pt', 'ms', 'vi', 'id']

def load_env_local() -> dict:
    env = {}
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

def fetch_due_pins(token: str) -> list:
    due_pins = []
    after = 0
    while True:
        url = f"{BASE}/api/admin/translations?limit=1000&after={after}"
        req = urllib.request.Request(url, headers={'Authorization': 'Bearer ' + token})
        with urllib.request.urlopen(req, timeout=60) as resp:
            batch = json.load(resp).get('pins', [])
        if not batch:
            break
        due_pins.extend(batch)
        if len(batch) < 1000:
            break
        after = batch[-1]['id']
    return due_pins

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
),
counts AS (
  SELECT 
    (SELECT count(*) FROM "Pin" WHERE "utcDeletedDateTime" IS NULL) AS active_pins,
    (SELECT count(*) FROM "PinTranslation" pt JOIN "Pin" p ON p.id = pt."pinId" WHERE p."utcDeletedDateTime" IS NULL) AS total_translation_rows,
    (SELECT count(*) FROM "PinTranslation" pt LEFT JOIN "Pin" p ON p.id = pt."pinId" WHERE p.id IS NULL OR p."utcDeletedDateTime" IS NOT NULL) AS orphaned_translation_rows,
    (SELECT count(*) FROM "Pin" p WHERE p."utcDeletedDateTime" IS NULL AND EXISTS (
      SELECT 1 FROM leak_patterns lp WHERE p."longFormSummary" ILIKE lp.pat OR p.description ILIKE lp.pat
    )) AS pins_with_content_tracking,
    (SELECT count(*) FROM "PinTranslation" pt JOIN "Pin" p ON p.id = pt."pinId" WHERE p."utcDeletedDateTime" IS NULL AND EXISTS (
      SELECT 1 FROM leak_patterns lp WHERE pt."longFormSummary" ILIKE lp.pat OR pt.description ILIKE lp.pat
    )) AS translations_with_content_tracking
)
SELECT json_build_object(
  'active_pins', active_pins,
  'total_translation_rows', total_translation_rows,
  'orphaned_translation_rows', orphaned_translation_rows,
  'pins_with_content_tracking', pins_with_content_tracking,
  'translations_with_content_tracking', translations_with_content_tracking
)::text
FROM counts;
"""
    raw_output = run_prod_sql(sql).strip()
    db_data = None
    for line in raw_output.splitlines():
        line = line.strip()
        if line.startswith('{') and line.endswith('}'):
            try:
                db_data = json.loads(line)
                break
            except Exception:
                pass

    if not db_data:
        print("Failed to parse database output:")
        print(raw_output)
        sys.exit(2)

    token = ensure_admin_token()
    due_pins = fetch_due_pins(token)

    state_counts = {'missing': 0, 'outdated': 0, 'incomplete': 0}
    for p in due_pins:
        for st in p.get('states', {}).values():
            if st in state_counts:
                state_counts[st] += 1

    active_pins = db_data['active_pins']
    expected_rows = active_pins * len(LOCALES)
    non_current_rows = state_counts['missing'] + state_counts['outdated'] + state_counts['incomplete']
    current_rows = max(0, expected_rows - non_current_rows)
    pct_current = round((current_rows / expected_rows) * 100, 2) if expected_rows else 100.0

    data = {
        'active_pins': active_pins,
        'total_translation_rows': db_data['total_translation_rows'],
        'orphaned_translation_rows': db_data['orphaned_translation_rows'],
        'expected_translation_rows': expected_rows,
        'current_rows': current_rows,
        'outdated_rows': state_counts['outdated'],
        'incomplete_rows': state_counts['incomplete'],
        'missing_rows': state_counts['missing'],
        'due_pins_count': len(due_pins),
        'pins_with_content_tracking': db_data['pins_with_content_tracking'],
        'translations_with_content_tracking': db_data['translations_with_content_tracking'],
        'percent_current': pct_current,
    }

    if json_mode:
        print(json.dumps(data, indent=2))
    else:
        print("=" * 60)
        print("Chronopin Production Translation Health Check")
        print("=" * 60)
        print(f"Active Pins:               {data['active_pins']:,}")
        print(f"Active Translation Rows:   {data['total_translation_rows']:,}")
        print(f"Expected Translation Rows: {data['expected_translation_rows']:,}")
        print("-" * 60)
        print(f"Current & Complete:        {data['current_rows']:,} ({data['percent_current']}%)")
        print(f"Outdated (text edited):    {data['outdated_rows']:,}")
        print(f"Incomplete (cut/tags):     {data['incomplete_rows']:,}")
        print(f"Missing (never done):      {data['missing_rows']:,}")
        print(f"Pins Due for Translation:  {data['due_pins_count']:,}")
        print("-" * 60)
        print(f"Prohibited Tracking in Pin Content:         {data['pins_with_content_tracking']:,}")
        print(f"Prohibited Tracking in Translation Content: {data['translations_with_content_tracking']:,}")
        print("=" * 60)

        if data['pins_with_content_tracking'] > 0 or data['translations_with_content_tracking'] > 0:
            print("❌ Prohibited tracking text found in public content!")
            print("   Run .agents/skills/prod-translations/scripts/audit_and_clean_content.py --apply to fix.")
            sys.exit(1)

        if data['due_pins_count'] > 0:
            print(f"⚠️  {data['due_pins_count']} pin(s) require translation update.")
            print("   Run .agents/skills/prod-translations/scripts/sync_translations.py to translate.")
            sys.exit(1)

        print("✅ 100% of production pins are translated, complete, and up to date with zero content leaks.")
        sys.exit(0)

if __name__ == '__main__':
    main()
