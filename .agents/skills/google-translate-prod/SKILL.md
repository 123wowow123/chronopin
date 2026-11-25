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
