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
    python3 .agents/skills/prod-translations/scripts/check_translations.py [--json] [--since-days N] [--only NAME[,NAME]]
"""

import json
import os
import pathlib
import subprocess
import sys
import time
import urllib.request

sys.dont_write_bytecode = True

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
                        body = json.load(resp)
                        if isinstance(body, dict) and body.get('role') == 'admin':
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

    # The health check used to be one giant CTE query (minutes long, all-or-nothing).
    # It is now split into independent queries run one after another, each timed on stderr,
    # so a slow check is visible and can be run alone with --only NAME.
    LEAK_CTE = """
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
"""
    # Every leak pattern contains "Gemini" (Hindi: जेमिनी). Test that cheap substring first so the
    # 16-pattern ILIKE only runs on the handful of rows that already contain it.
    def hit(col):
        return f"""(({col} ILIKE '%gemini%' OR {col} LIKE '%जेमिनी%')
        AND EXISTS (SELECT 1 FROM leak_patterns lp WHERE {col} ILIKE lp.pat))"""

    def wrap(body, cte=''):
        return cte + "SELECT row_to_json(q)::text FROM (SELECT " + body + ") q;"

    queries = {}
    queries['counts'] = wrap("""
    (SELECT count(*) FROM "Pin" WHERE "utcDeletedDateTime" IS NULL) AS active_pins,
    (SELECT count(*) FROM "PinTranslation" pt JOIN "Pin" p ON p.id = pt."pinId" WHERE p."utcDeletedDateTime" IS NULL) AS total_translation_rows,
    (SELECT count(*) FROM "PinTranslation" pt LEFT JOIN "Pin" p ON p.id = pt."pinId" WHERE p.id IS NULL OR p."utcDeletedDateTime" IS NOT NULL) AS orphaned_translation_rows
""")
    queries['leak_pin'] = wrap(f"""
    (SELECT count(*) FROM "Pin" p WHERE p."utcDeletedDateTime" IS NULL AND (
      {hit('p."longFormSummary"')} OR {hit('p.description')}
      OR EXISTS (SELECT 1 FROM "PinProTip" t WHERE t."pinId" = p.id AND {hit('t.tip')})
    )) AS pins_with_content_tracking
""", LEAK_CTE)
    queries['leak_translation'] = wrap(f"""
    (SELECT count(*) FROM "PinTranslation" pt JOIN "Pin" p ON p.id = pt."pinId" WHERE p."utcDeletedDateTime" IS NULL
      AND ({hit('pt."longFormSummary"')} OR {hit('pt.description')}))
    + (SELECT count(*) FROM "PinProTipTranslation" ptt JOIN "PinProTip" t ON t.id = ptt."proTipId" JOIN "Pin" p ON p.id = t."pinId"
      WHERE p."utcDeletedDateTime" IS NULL AND {hit('ptt.tip')}) AS translations_with_content_tracking
""", LEAK_CTE)
    queries['mangled'] = wrap("""
    (SELECT count(*) FROM "PinTranslation" pt JOIN "Pin" p ON p.id = pt."pinId" WHERE p."utcDeletedDateTime" IS NULL AND (
      (length(regexp_replace(coalesce(p.description, ''), '<[^>]*>', '', 'g')) > 40 AND pt.description = p.description AND regexp_replace(coalesce(p.description, ''), '<[^>]*>', '', 'g') ~* '\\m(the|and|of|to|is|in|for|on|with|by|that|was|are|from|has|have|not|this|be|it)\\M')
      OR (length(regexp_replace(coalesce(p."longFormSummary", ''), '<[^>]*>', '', 'g')) > 60 AND pt."longFormSummary" = p."longFormSummary" AND regexp_replace(coalesce(p."longFormSummary", ''), '<[^>]*>', '', 'g') ~* '\\m(the|and|of|to|is|in|for|on|with|by|that|was|are|from|has|have|not|this|be|it)\\M')
      OR (length(coalesce(p."dateConfidenceReasoning", '')) > 40 AND pt."dateConfidenceReasoning" = p."dateConfidenceReasoning" AND coalesce(p."dateConfidenceReasoning", '') ~* '\\m(the|and|of|to|is|in|for|on|with|by|that|was|are|from|has|have|not|this|be|it)\\M')
      OR (length(coalesce(p."delayReasoning", '')) > 40 AND pt."delayReasoning" = p."delayReasoning" AND coalesce(p."delayReasoning", '') ~* '\\m(the|and|of|to|is|in|for|on|with|by|that|was|are|from|has|have|not|this|be|it)\\M')
      OR coalesce(pt.title, '') ~ '&(amp|lt|gt|quot|apos|nbsp|#[0-9]+|#x[0-9a-fA-F]+|ldquo|rdquo|laquo|raquo|ndash|atilde);'
      OR coalesce(pt."dateConfidenceReasoning", '') ~ '&(amp|lt|gt|quot|apos|nbsp|#[0-9]+|#x[0-9a-fA-F]+|ldquo|rdquo|laquo|raquo|ndash|atilde);'
      OR coalesce(pt."delayReasoning", '') ~ '&(amp|lt|gt|quot|apos|nbsp|#[0-9]+|#x[0-9a-fA-F]+|ldquo|rdquo|laquo|raquo|ndash|atilde);'
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
          (length(regexp_replace(coalesce(pt."longFormSummary", ''), '<[^>]*>', '', 'g')) > 60 AND regexp_replace(coalesce(pt."longFormSummary", ''), '<[^>]*>', '', 'g') !~ '[^\\x00-\\x7F]' OR regexp_replace(coalesce(pt."longFormSummary", ''), '<cite[^>]*></cite>', '', 'g') ~ '<li>[\\x20-\\x7E]{80,}</li>')
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
    )) AS untranslated_or_mangled_rows
""")
    queries['bullets'] = wrap("""
    (SELECT count(*) FROM (SELECT DISTINCT b."pinId", b.locale FROM (
  SELECT pt."pinId", pt.locale,
         regexp_replace(e.li, '<[^>]*>', '', 'g') AS en_li,
         regexp_replace(t.li, '<[^>]*>', '', 'g') AS tr_li
  FROM "PinTranslation" pt
  JOIN "Pin" p ON p.id = pt."pinId" AND p."utcDeletedDateTime" IS NULL
  CROSS JOIN LATERAL regexp_split_to_table(coalesce(p."longFormSummary", ''), '</li>') WITH ORDINALITY AS e(li, n)
  JOIN LATERAL (SELECT li, n FROM regexp_split_to_table(coalesce(pt."longFormSummary", ''), '</li>') WITH ORDINALITY AS x(li, n)) t ON t.n = e.n
  WHERE p."longFormSummary" ~ '<li>' /*SINCE*/
) b WHERE length(en_li) >= 60 AND en_li = tr_li AND en_li !~ '[^\\x00-\\x7F]' AND en_li ~* '\\m(the|and|of|to|is|in|for|on|with|by|that|was|are|from|has|have|not|this|be|it)\\M') x) AS identical_english_bullet_rows
""")
    queries['panels'] = """
WITH panel_items AS (
  SELECT pp."pinId",
         (SELECT count(*) FROM unnest(ARRAY['es','fr','de','ja','zh','ko','hi','ar','th','it','ru','pt','ms','vi','id']) loc
          WHERE (c->'i18n'->loc->>'title') IS NOT NULL AND (c->'i18n'->loc->>'unit') IS NOT NULL
            AND NOT (loc IN ('ja','zh','ko','ru','ar','hi','th') AND length(coalesce(c->>'title', '')) > 40 AND (c->>'title') ~* '\\m(the|and|of|to|is|in|for|on|with|by|that|was|are|from|has|have|not|this|be|it)\\M' AND coalesce(c->'i18n'->loc->>'title', '') !~ '[^\\x00-\\x7F]')
            AND (c->>'note' IS NULL OR (
              (c->'i18n'->loc->>'note') IS NOT NULL
              AND NOT (length(regexp_replace(c->>'note', '<[^>]*>', '', 'g')) > 40 AND regexp_replace(c->>'note', '<[^>]*>', '', 'g') ~* '\\m(the|and|of|to|is|in|for|on|with|by|that|was|are|from|has|have|not|this|be|it)\\M' AND (regexp_replace(c->'i18n'->loc->>'note', '<[^>]*>', '', 'g') = regexp_replace(c->>'note', '<[^>]*>', '', 'g') OR (loc IN ('ja','zh','ko','ru','ar','hi','th') AND regexp_replace(c->'i18n'->loc->>'note', '<[^>]*>', '', 'g') !~ '[^\\x00-\\x7F]')))
            ))
            AND NOT (loc = 'th' AND (c->'i18n'->'th')::text ~ 'พ\\.ศ\\.|(^|[^0-9])25[5-8][0-9]([^0-9]|$)')
            AND NOT ((c->'i18n'->loc)::text ~ '&(amp|lt|gt|quot|apos|nbsp|#[0-9]+|#x[0-9a-fA-F]+);')) AS locales_done
  FROM "PinPerf" pp
  JOIN "Pin" p ON p.id = pp."pinId" AND p."utcDeletedDateTime" IS NULL
  CROSS JOIN LATERAL jsonb_array_elements(pp.charts) c
  UNION ALL
  SELECT pp."pinId",
         (SELECT count(*) FROM unnest(ARRAY['es','fr','de','ja','zh','ko','hi','ar','th','it','ru','pt','ms','vi','id']) loc
          WHERE (t->'i18n'->loc->>'title') IS NOT NULL
            AND NOT (loc IN ('ja','zh','ko','ru','ar','hi','th') AND length(coalesce(t->>'title', '')) > 40 AND (t->>'title') ~* '\\m(the|and|of|to|is|in|for|on|with|by|that|was|are|from|has|have|not|this|be|it)\\M' AND coalesce(t->'i18n'->loc->>'title', '') !~ '[^\\x00-\\x7F]')
            AND jsonb_array_length(coalesce(t->'i18n'->loc->'columns', '[]'::jsonb)) = jsonb_array_length(coalesce(t->'columns', '[]'::jsonb))
            AND jsonb_array_length(coalesce(t->'i18n'->loc->'rows', '[]'::jsonb)) = jsonb_array_length(coalesce(t->'rows', '[]'::jsonb))
            AND NOT EXISTS (
              SELECT 1
              FROM jsonb_array_elements(coalesce(t->'rows', '[]'::jsonb)) WITH ORDINALITY AS er(erow, r_idx)
              CROSS JOIN LATERAL jsonb_array_elements_text(er.erow) WITH ORDINALITY AS ec(ecell, c_idx)
              WHERE (
                length(regexp_replace(ec.ecell, '<[^>]*>', '', 'g')) > 40
                AND regexp_replace(ec.ecell, '<[^>]*>', '', 'g') ~* '\\m(the|and|of|to|is|in|for|on|with|by|that|was|are|from|has|have|not|this|be|it)\\M'
                AND (
                  regexp_replace(coalesce((t->'i18n'->loc->'rows'->(er.r_idx::int - 1)) ->> (ec.c_idx::int - 1), ''), '<[^>]*>', '', 'g') = regexp_replace(ec.ecell, '<[^>]*>', '', 'g')
                  OR (loc IN ('ja','zh','ko','ru','ar','hi','th') AND regexp_replace(coalesce((t->'i18n'->loc->'rows'->(er.r_idx::int - 1)) ->> (ec.c_idx::int - 1), ''), '<[^>]*>', '', 'g') !~ '[^\\x00-\\x7F]')
                )
              )
              OR (length(ec.ecell) - length(replace(ec.ecell, '<cite', '')))
              != (length(coalesce((t->'i18n'->loc->'rows'->(er.r_idx::int - 1)) ->> (ec.c_idx::int - 1), '')) - length(replace(coalesce((t->'i18n'->loc->'rows'->(er.r_idx::int - 1)) ->> (ec.c_idx::int - 1), ''), '<cite', '')))
            )
            AND (t->>'note' IS NULL OR (
              (t->'i18n'->loc->>'note') IS NOT NULL
              AND NOT (length(regexp_replace(t->>'note', '<[^>]*>', '', 'g')) > 40 AND regexp_replace(t->>'note', '<[^>]*>', '', 'g') ~* '\\m(the|and|of|to|is|in|for|on|with|by|that|was|are|from|has|have|not|this|be|it)\\M' AND (regexp_replace(t->'i18n'->loc->>'note', '<[^>]*>', '', 'g') = regexp_replace(t->>'note', '<[^>]*>', '', 'g') OR (loc IN ('ja','zh','ko','ru','ar','hi','th') AND regexp_replace(t->'i18n'->loc->>'note', '<[^>]*>', '', 'g') !~ '[^\\x00-\\x7F]')))
            ))
            AND NOT (loc = 'th' AND (t->'i18n'->'th')::text ~ 'พ\\.ศ\\.|(^|[^0-9])25[5-8][0-9]([^0-9]|$)')
            AND NOT ((t->'i18n'->loc)::text ~ '&(amp|lt|gt|quot|apos|nbsp|#[0-9]+|#x[0-9a-fA-F]+);')
            AND (t->'stages' IS NULL OR jsonb_array_length(coalesce(t->'i18n'->loc->'stages', '[]'::jsonb)) = jsonb_array_length(t->'stages'))) AS locales_done
  FROM "PinPerf" pp
  JOIN "Pin" p ON p.id = pp."pinId" AND p."utcDeletedDateTime" IS NULL
  CROSS JOIN LATERAL jsonb_array_elements(pp.tables) t
),
panel_counts AS (
  SELECT
    count(*) AS total_panels,
    count(*) FILTER (WHERE locales_done = 15) AS panels_complete,
    count(*) FILTER (WHERE locales_done < 15) AS panels_incomplete,
    count(DISTINCT "pinId") FILTER (WHERE locales_done < 15) AS pins_with_incomplete_panels
  FROM panel_items
)
SELECT row_to_json(panel_counts)::text FROM panel_counts;
"""
    queries['pro_tips'] = """
WITH pro_tip_items AS (
  SELECT t.id AS "proTipId",
         t."pinId",
         (SELECT count(*) FROM "PinProTipTranslation" ptt
          WHERE ptt."proTipId" = t.id
            AND btrim(ptt."sourceHash") = encode(digest(t.tip, 'sha1'), 'hex')
            AND length(btrim(ptt.tip)) > 0
            AND length(ptt.tip) <= 1500
            AND NOT (length(t.tip) > 40 AND ptt.tip = t.tip AND t.tip ~* '\\m(the|and|of|to|is|in|for|on|with|by|that|was|are|from|has|have|not|this|be|it)\\M')
            AND NOT (ptt.locale IN ('ja','zh','ko','ru','ar','hi','th') AND length(t.tip) > 40 AND t.tip ~* '\\m(the|and|of|to|is|in|for|on|with|by|that|was|are|from|has|have|not|this|be|it)\\M' AND ptt.tip !~ '[^\\x00-\\x7F]')
            AND NOT (ptt.locale = 'th' AND (ptt.tip ~ 'พ\\.ศ\\.' OR (ptt.tip ~ '(^|[^0-9])(25[5-8][0-9])([^0-9]|$)' AND replace(t.tip, ',', '') !~ '(^|[^0-9])(25[5-8][0-9])([^0-9]|$)')))
            AND NOT (ptt.tip ~ '&(amp|lt|gt|quot|apos|nbsp|#[0-9]+|#x[0-9a-fA-F]+|ldquo|rdquo|laquo|raquo|ndash|atilde);')
            AND NOT (ptt.tip ~ '[⟦⟧]')
         ) AS locales_done
  FROM "PinProTip" t
  JOIN "Pin" p ON p.id = t."pinId" AND p."utcDeletedDateTime" IS NULL
),
pro_tip_counts AS (
  SELECT
    count(*) AS total_pro_tips,
    count(*) FILTER (WHERE locales_done = 15) AS pro_tips_complete,
    count(*) FILTER (WHERE locales_done < 15) AS pro_tips_incomplete,
    count(DISTINCT "pinId") FILTER (WHERE locales_done < 15) AS pins_with_incomplete_pro_tips
  FROM pro_tip_items
)
SELECT row_to_json(pro_tip_counts)::text FROM pro_tip_counts;
"""

    # --since-days N limits the slowest check (bullets, ~80 s) to translation rows written in the
    # last N days. Default stays a full scan, so old bad rows are still caught on a normal run.
    if '--since-days' in sys.argv:
        days = int(sys.argv[sys.argv.index('--since-days') + 1])
        queries['bullets'] = queries['bullets'].replace(
            '/*SINCE*/', f"AND pt.\"utcUpdatedDateTime\" >= now() - interval '{days} days'")

    only = None
    if '--only' in sys.argv:
        only = sys.argv[sys.argv.index('--only') + 1].split(',')
        unknown = [n for n in only if n not in queries]
        if unknown:
            print(f"Unknown query name(s) {unknown}; choose from {list(queries)}")
            sys.exit(2)
        # --only is for timing/debugging one check; the report below needs every number.
        json_mode = True

    db_data = {}
    for name, sql in queries.items():
        if only and name not in only:
            continue
        t0 = time.time()
        try:
            raw_output = run_prod_sql(sql).strip()
        except subprocess.CalledProcessError as e:
            print(f"[{name}] query failed:\n{e.stderr.decode('utf-8', 'replace')}", file=sys.stderr)
            sys.exit(2)
        parsed = None
        for line in raw_output.splitlines():
            line = line.strip()
            if line.startswith('{') and line.endswith('}'):
                try:
                    parsed = json.loads(line)
                    break
                except Exception:
                    pass
        if parsed is None:
            print(f"[{name}] failed to parse database output:\n{raw_output}", file=sys.stderr)
            sys.exit(2)
        db_data.update(parsed)
        print(f"[{name}] {time.time() - t0:.1f}s", file=sys.stderr, flush=True)

    if only:
        print(json.dumps(db_data, indent=2))
        sys.exit(0)

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
        'untranslated_or_mangled_rows': db_data['untranslated_or_mangled_rows'] + db_data['identical_english_bullet_rows'],
        'identical_english_bullet_rows': db_data['identical_english_bullet_rows'],
        'total_panels': db_data['total_panels'],
        'panels_complete': db_data['panels_complete'],
        'panels_incomplete': db_data['panels_incomplete'],
        'pins_with_incomplete_panels': db_data['pins_with_incomplete_panels'],
        'total_pro_tips': db_data['total_pro_tips'],
        'pro_tips_complete': db_data['pro_tips_complete'],
        'pro_tips_incomplete': db_data['pro_tips_incomplete'],
        'pins_with_incomplete_pro_tips': db_data['pins_with_incomplete_pro_tips'],
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
        print(f"PinPerf Panels Complete:   {data['panels_complete']:,} / {data['total_panels']:,}")
        print(f"Panels Missing i18n:       {data['panels_incomplete']:,} ({data['pins_with_incomplete_panels']:,} pins)")
        print(f"PinProTip Tips Complete:   {data['pro_tips_complete']:,} / {data['total_pro_tips']:,}")
        print(f"Pro Tips Missing i18n:     {data['pro_tips_incomplete']:,} ({data['pins_with_incomplete_pro_tips']:,} pins)")
        print(f"Untranslated/Mangled Rows:                  {data['untranslated_or_mangled_rows']:,}")
        print(f"Prohibited Tracking in Pin Content:         {data['pins_with_content_tracking']:,}")
        print(f"Prohibited Tracking in Translation Content: {data['translations_with_content_tracking']:,}")
        print("=" * 60)

        if data['pins_with_content_tracking'] > 0 or data['translations_with_content_tracking'] > 0:
            print("❌ Prohibited tracking text found in public content!")
            print("   Run .agents/skills/prod-translations/scripts/audit_and_clean_content.py --apply to fix.")
            sys.exit(1)

        if data['untranslated_or_mangled_rows'] > 0:
            print(f"❌ {data['untranslated_or_mangled_rows']} row(s) contain untranslated English prose or mangled HTML entities!")
            print("   Run .agents/skills/prod-translations/scripts/sync_translations.py to auto-repair.")
            sys.exit(1)

        if data['due_pins_count'] > 0 or data['pins_with_incomplete_panels'] > 0 or data['pins_with_incomplete_pro_tips'] > 0:
            if data['due_pins_count'] > 0:
                print(f"⚠️  {data['due_pins_count']} pin(s) require translation update.")
            if data['pins_with_incomplete_panels'] > 0:
                print(f"⚠️  {data['pins_with_incomplete_panels']} pin(s) ({data['panels_incomplete']} panels) require PinPerf panel i18n translation.")
            if data['pins_with_incomplete_pro_tips'] > 0:
                print(f"⚠️  {data['pins_with_incomplete_pro_tips']} pin(s) ({data['pro_tips_incomplete']} pro tips) require PinProTip translation.")
            print("   Run .agents/skills/prod-translations/scripts/sync_translations.py to translate.")
            sys.exit(1)

        print("✅ 100% of production pins, PinPerf panels, and PinProTip tips are translated, complete, and up to date with zero content leaks.")
        sys.exit(0)

if __name__ == '__main__':
    main()
