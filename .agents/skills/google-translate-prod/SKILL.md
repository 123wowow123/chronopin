---
name: google-translate-prod
description: >-
  Use when the owner says "Google Translate prod" or asks to translate production content with Google
  Translate (NMT) instead of LLM workers: pins, PinPerf panels, pro tips, and the secondary content
  tables (restaurant, person/company wikis, critic reviews, industry forecasts, ...).
---

# Google Translate on production

Owner-triggered only (see AGENTS.md: content sessions never run translations). Rules, locale hashing and the
attribution Golden Rule live in `.agents/skills/prod-translations/`; this skill is the short Google path.

## Steps (from `/Users/ianflynn/chronopin`)

1. **Pins, panels, pro tips**
   ```bash
   python3 .agents/skills/prod-translations/scripts/sync_translations.py --list-ids
   python3 .agents/skills/prod-translations/scripts/sync_translations.py --no-prep --pins <DUE_PIN_IDS>
   python3 .agents/skills/prod-translations/scripts/sync_translations.py --panels --pins <DUE_PANEL_PIN_IDS>
   python3 .agents/skills/prod-translations/scripts/sync_translations.py --pro-tips --no-prep --pins <DUE_PRO_TIP_PIN_IDS>
   ```
   Skip a line when its list is empty. For more than ~25 pins, shard the ids across runs.
   **Slow run (owner says "slowly"), verified 2026-11-27 on 246 pins:** prefix with `TRANSLATE_WORKERS=1 TRANSLATE_DELAY=3`.
   Pilot 5 pins first, then ONE run over all ids with `--chunk-size 25 --pins "$IDS"`: it chunks, pushes per chunk and, when
   the id list includes the panel and pro-tip pins, also does panels and pro tips in the same run (no separate lines needed).
   Re-run `--list-ids` right before the full run: new pins become due between listings. Launch with
   `nohup ... > .scrape/logs/gt-pins-$(date +%F).log 2>&1 &`; the "completed" task notification is only the launcher
   shell exiting. Check `pgrep -f "sync_translations.py --no-prep"` and grep the log for `chunk|Batch|Successfully|Completed`.
   macOS has no `timeout` command. About 20-25 min for 246 pins (3690 rows).
2. **Secondary content tables** (all with due rows, smallest first; slow, so run it in the background):
   ```bash
   mkdir -p .scrape/logs
   TRANSLATE_DELAY=2 nohup python3 .agents/skills/prod-translations/scripts/content_translations.py \
     > .scrape/logs/content-translations-$(date +%F).log 2>&1 &
   ```
   Options: `--tables a,b`, `--locale es,de`, `--max-rows N` (pilot), `--after N`, `--dry-run`.
   About 45 s per wiki row (15 locales) with a cold cache. Never start a second copy while one runs.
3. **Audit**
   ```bash
   python3 .agents/skills/prod-translations/scripts/check_translations.py
   curl -s -H "Authorization: Bearer $(cat .scrape/admin.token)" https://www.chronopin.com/api/admin/content-translations
   ```
   `check_translations.py` covers pins, panels and pro tips only; step 2's tables (e.g. `pin-critic-review` had 24 due
   after the 2026-11-27 pin run) are audited by the curl and still need `content_translations.py`.
   Done = 0 due pins, 0 mangled/leaks, and `due: 0` for every table. On a 401 renew the token via the
   admin-login-refresh skill; never ask the owner.

## Traps

- **CAPTCHA:** a `google.com/sorry` page or HTTP 429 stops the run. Never retry, wait out or bypass it, and never
  swap in another translator; report and ask whether to use LLM workers (`prod-translations` SKILL.md).
- A row-locale is saved only if every fragment passes `acceptable()`; leftovers show as `untranslated` /
  `unbuilt` in the log and stay due. Re-run later or translate them directly with LLM workers.
- New prose keys in a table's JSON field must be added to `JSON_PROSE_KEYS` in `content_translations.py`,
  or they stay English.
- Thai uses Gregorian years (handled by `fix_thai_years`). No model tracking notes in any public field.
- Fragment cache: `.scrape/translations-cache/content/<locale>.json` (reused across runs; keep it).
- **Name-only fragments** (degree/citation lists like `B.A., Huntingdon College (1969)`) come back identical to
  English and `acceptable()` rejects them; `name_only()` in `content_translations.py` accepts them for Latin locales.
- **Stray backticks** (transliterations like ``al-`Iqāriyyah``) once broke the footnote/code token check across
  lines (`structure changed, not saved`); `tokens()` now matches inline code within one line only.
- Check the log's `done:` lines: `unbuilt` or `bad_structure` above 0 means rows stayed due.
- **Fragments Google can't do** (mistranslated company names, a sentence cut at `U.S.`): translate them yourself and write them into the
  locale cache with `st._save_locale_cache_atomic(ct.CACHE_DIR/'<loc>.json', {src: tr})`, then re-run the script for that table; it
  builds, structure-checks and saves the rows as usual. Keep company/case names Latin; mirror a truncated source as is.
- **Finding the stuck fragments** (worked 2026-11-27, `restaurant-content`: 4 rows, 13 row-locales, 11 fragments, mostly
  Italian dish descriptions plus one Japanese review and one fragment with an English suffix). The log only says
  `unbuilt`, so list them with a throwaway script (keep it in the scratchpad, not the repo):
  1. `import content_translations as ct` (add `.agents/skills/prod-translations/scripts` to `sys.path`, `sys.dont_write_bytecode = True`),
     `tok = ct.st.ensure_admin_token()`, `kinds = {f['name']: f['kind'] for f in defs[table]['fields']}` from
     `GET /api/admin/content-translations`.
  2. Page through ALL due rows (`GET ...?table=T&locale=<all>&limit=50&after=N`, follow `next`); the due row may not be
     on the first page.
  3. For each row and each `loc` in `r['locales']`: `ct.map_fields(table, kinds, r['fields'], lambda t: frags.add(t) or t)`,
     then keep fragments where `not ct.LocaleCache(loc).data.get(f)`.
  4. Translate each yourself per locale and write with `ct.st._save_locale_cache_atomic(ct.CACHE_DIR/f'{loc}.json', {src: tr})`
     (it merges, so it is safe). A fragment already in the target language (Italian text for `it`) is mirrored as is.
     Keep the English suffix's meaning (translate it too), dish/venue names, prices and URLs unchanged.
  5. Re-run `content_translations.py --tables <table>` (no other copy running); expect `saved: N, unbuilt: 0`.
- Rows can become due while you work (new pins, edited critic reviews, horoscopes). After the last run, re-check the
  curl audit and `--list-ids` and run one more small pass until everything reads `due: 0`.
