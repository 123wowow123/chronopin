---
name: prod-translations
description: >-
  Use this skill whenever translating pins on Chronopin production, checking translation coverage
  across the 15 supported locales, updating translations for newly added or edited pins, or auditing
  pin content to ensure model tracking notes remain strictly within the pin wiki and never leak into
  public article content.
---

# Production Translations Runbook

This skill provides the automated workflow, validation checks, and operational guardrails for maintaining production translations across all active Chronopin pins in 15 supported non-English locales.

---

## The Golden Rule of Attribution

> [!IMPORTANT]
> **Translation model tracking (e.g., `Translations completed using Gemini 4 Hydrogen (Medium).` or `Gemini 3.8 Flash.`) must NEVER appear in public pin article content (`Pin.longFormSummary`, `Pin.description`, or `PinTranslation.*`).**
>
> **It belongs ONLY in the internal pin wiki (`SourceWiki`).**
>
> Public pin content is customer-facing. Appending attribution to `longFormSummary` renders tracking text in the live article body on `chronopin.com`.

---

## Worker Delegation (`gemini-4-hydrogen-medium` — Parallel Swarm Workers)

- **Always use `gemini-4-hydrogen-medium` swarm workers (`swarm{action:"add", model:"gemini-4-hydrogen-medium", ...}`) instead of `flash` subagents (`invoke_subagent` has no medium Hydrogen setting) to perform translations (pin text, `PinPerf` panels, `PinProTip` pro tips, and secondary content tables):**
  1. **Prepare & List Due Pin IDs, Panel Pin IDs, and Pro-Tip Pin IDs:** Run `python3 .agents/skills/prod-translations/scripts/sync_translations.py --list-ids` (which runs `prepare_mangled_rows_for_repair()` and prints `DUE_PIN_IDS=...`, `DUE_PANEL_PIN_IDS=...`, and `DUE_PRO_TIP_PIN_IDS=...`).
  2. **Shard Work Across Parallel `gemini-4-hydrogen-medium` Swarm Workers:**
     - **Translate `PinPerf` Panels (`charts` and `tables` `i18n`) and `PinProTip` Pro Tips (`PinProTipTranslation`) If Not Done Yet:** Whenever `DUE_PANEL_PIN_IDS` is non-empty (`pins_with_incomplete_panels > 0`) or `DUE_PRO_TIP_PIN_IDS` is non-empty (`pins_with_incomplete_pro_tips > 0`), the translation job MUST also translate all due `PinPerf` panels (`PUT /api/pins/:id/performance`) and all due `PinProTip` tips (`POST /api/admin/pro-tip-translations`) across all 15 non-English locales.
     - **Spawn Workers via `swarm` (`model: "gemini-4-hydrogen-medium"`):** Name the swarm (`swarm{action:"title", title:"prod translations"}`) and add workers with `swarm{action:"add", name:"<worker>", model:"gemini-4-hydrogen-medium", brief:"..."}` (keep default `workspace: "inherit"` since workers do not edit repo files; include full rules in each brief because swarm workers start fresh). Kill workers when finished.
     - When `<= 25` pins (or panel/pro-tip pins) are due, dispatch 1 `gemini-4-hydrogen-medium` worker.
     - When `> 25` pins, panel pins, or pro-tip pins are due, partition the due IDs into disjoint shards (e.g. 20–100 pins per shard across 2–4 parallel `gemini-4-hydrogen-medium` workers; keep NMT endpoint concurrency conservative if calling `batchexecute` so it does not trigger anti-bot rate limits) so each worker runs:
       ```bash
       python3 .agents/skills/prod-translations/scripts/sync_translations.py --no-prep --pins <id1,id2,...>
       ```
       (or `--panels --pins <id1,id2,...>` when sharding panel-only pins, or `--pro-tips --no-prep --pins <id1,id2,...>` when sharding pro-tip-only pins).
     - If any fragment, pin, or pro tip requires direct LLM translation (e.g. when an NMT fragment is rejected by `acceptable()` or NMT is unavailable), the `gemini-4-hydrogen-medium` worker exports the pin with `--export /tmp/pin.json`, translates the target fields directly into the due locales following all HTML/`<cite data-ref>`/Thai Gregorian year rules, and applies + validates it via `--apply /tmp/done.json`.
  2b. **Same run, content tables:** after (or alongside) the pin shards, translate every secondary content table via `/api/admin/content-translations` (see [Content Translations](./references/content_translations.md)), sharding by table or `after` range across `gemini-4-hydrogen-medium` swarm workers. Do not end the run before they reach `due: 0`.
  3. **Audit the Workers' Work:** After all workers complete, run `python3 .agents/skills/prod-translations/scripts/check_translations.py` (or have a `gemini-4-hydrogen-medium` worker run it and inspect its output) to verify:
     - `0` due pins (`100.0%` current & complete)
     - `0` panels missing `i18n` (`panels_incomplete: 0`, `pins_with_incomplete_panels: 0` across all `PinPerf` charts and tables, including verifying that chart/table `note`s, `title`s, and table `rows` cells `> 40` chars with English stopwords were translated and not left in English or pure ASCII in non-Latin locales)
     - `0` pro tips missing `i18n` (`pro_tips_incomplete: 0`, `pins_with_incomplete_pro_tips: 0` across all `PinProTip` tips, verifying that `PinProTipTranslation` exists for all 15 locales with matching `sourceHash = sha1(tip)` and passes all plain-text/non-Latin/Thai Gregorian year rules)
     - `0` untranslated/mangled rows (no untranslated English prose, no pure-ASCII `title`s `> 40` chars with English stopwords in non-Latin locales `ja`/`zh`/`ko`/`ru`/`ar`/`hi`/`th`, no identical English `<li>` bullets of 60+ chars, no partial-English `<li>` bullets of 80+ ASCII chars in non-Latin locales, no unconverted Thai Buddhist Era years `2550..2589` or `พ.ศ.`, no raw HTML entities in plain-text fields, no mangled/double-escaped entities in HTML fields, and no `[⟦⟧]` delimiter leaks). Identical-to-English text is allowed only when the English source is itself non-English (see [Untranslated-English Detection Rules](./references/locales_and_hashing.md)).
     - `0` skipped rows and `0` content leaks
     - `due: 0` for every table in `GET /api/admin/content-translations`

---

## Secondary content tables (company hubs, restaurants, people, wikis, horoscopes, ...)

The translation agent translates the **other content tables** in the **same single run** as the pins, panels
and pro tips; there is no separate pass. Content-creating sessions only save English and say translations
are left to this agent. These tables use the `<Source>Translation` tables from migration `0265` through
`/api/admin/content-translations` (not `sync_translations.py`). Full flow, table list, JSON-shape rules
and verification: [Content Translations Reference](./references/content_translations.md).

One run, in order: pins, panels and pro tips (`sync_translations.py`) -> every table in the reference
until `due: 0` (`gemini-4-hydrogen-medium` swarm workers, shard by table) -> one audit. The run is finished only when
`check_translations.py` shows 0 due pins AND the coverage call shows `due: 0` for every table.

```bash
# coverage across all content tables (needs the admin token from check_translations.ensure_admin_token())
curl -s -H "Authorization: Bearer $(cat .scrape/admin.token)" https://www.chronopin.com/api/admin/content-translations
```

---

## Quick Reference Commands

From the workspace root (`/Users/ianflynn/chronopin`):

| Task | Command |
|:---|:---|
| **Health Check (Pins + Panels + Pro Tips)** | `python3 .agents/skills/prod-translations/scripts/check_translations.py` |
| **Check JSON Output** | `python3 .agents/skills/prod-translations/scripts/check_translations.py --json` |
| **Quick health check (recent rows only)** | `python3 .agents/skills/prod-translations/scripts/check_translations.py --since-days 7` |
| **Time/debug one check** | `python3 .agents/skills/prod-translations/scripts/check_translations.py --only bullets` (names: `counts`, `leak_pin`, `leak_translation`, `mangled`, `bullets`, `panels`, `pro_tips`) |
| **Prep & List Due Pin + Panel + Pro-Tip IDs** | `python3 .agents/skills/prod-translations/scripts/sync_translations.py --list-ids` |
| **Sync Assigned Pin Shard (swarm worker)** | `python3 .agents/skills/prod-translations/scripts/sync_translations.py --no-prep --pins 15801,15802,...` |
| **Sync Assigned Panel Shard (swarm worker)** | `python3 .agents/skills/prod-translations/scripts/sync_translations.py --panels --pins 20678,20688,...` |
| **Sync Assigned Pro-Tip Shard (swarm worker)** | `python3 .agents/skills/prod-translations/scripts/sync_translations.py --pro-tips --no-prep --pins 5093,4022,...` |
| **Export Due Pins for Direct LLM Translation** | `python3 .agents/skills/prod-translations/scripts/sync_translations.py --no-prep --pins 15860 --export /tmp/todo.json` |
| **Validate & Apply Direct LLM Translations** | `python3 .agents/skills/prod-translations/scripts/sync_translations.py --apply /tmp/done.json` |
| **Sync All Due Pins, Panels & Pro Tips (Chunked)** | `python3 .agents/skills/prod-translations/scripts/sync_translations.py --chunk-size 25` |
| **Sync with Batch Limit** | `python3 .agents/skills/prod-translations/scripts/sync_translations.py --limit 50` |
| **Sync Specific Pin (Text + Panels + Pro Tips)** | `python3 .agents/skills/prod-translations/scripts/sync_translations.py --pin 15860` |
| **Sync Specific Locale** | `python3 .agents/skills/prod-translations/scripts/sync_translations.py --locale de` |
| **Preview Due Pins, Panels & Pro Tips** | `python3 .agents/skills/prod-translations/scripts/sync_translations.py --dry-run` |
| **Audit Content for Leaks** | `python3 .agents/skills/prod-translations/scripts/audit_and_clean_content.py` |
| **Clean Accidental Leaks** | `python3 .agents/skills/prod-translations/scripts/audit_and_clean_content.py --apply` |

---

## Supported Locales & Architecture

Chronopin supports **15 non-English target locales**:
`es` (Spanish), `fr` (French), `de` (German), `ja` (Japanese), `zh` (Chinese), `ko` (Korean), `hi` (Hindi), `ar` (Arabic), `th` (Thai), `it` (Italian), `ru` (Russian), `pt` (Portuguese), `ms` (Malay), `vi` (Vietnamese), `id` (Indonesian).

- **Source Hash:** SHA-1 of `[title, description, longFormSummary, dateConfidenceReasoning, delayReasoning].join('\n--\n')`.
- **Field Hashes:** JSON object storing individual SHA-1 digests per field.
- **State Definition:** Only translations matching the exact English `sourceHash` with complete shapes are `'current'`.
- See [Locales & Hashing Reference](./references/locales_and_hashing.md) for full algorithm specifications.

---

## Step-by-Step Execution Workflow

### Step 1: Health Check
Run the translation health check to inspect how many pins require translation updates:
```bash
python3 .agents/skills/prod-translations/scripts/check_translations.py
```
This queries both the production PostgreSQL database (`scripts/prod-sql.sh`) and `GET /api/admin/translations` to count active pins, break down rows by state (`current`, `outdated`, `incomplete`, `missing`), and verify zero content leaks across all 15 localized tracking strings.

The check runs seven separate SQL queries one after another and prints each one's time on stderr (a full run is about 3 minutes on prod; `bullets` is the slowest at ~80 s). `--since-days N` limits `bullets` to translation rows written in the last N days (~11 s); the default is a full scan, so use the full run for the final audit and `--since-days` for quick mid-job checks. `--only NAME[,NAME]` runs just those queries and prints raw JSON, not the report (it is for timing and debugging, not for the audit). Leak patterns are prefiltered on the substring `gemini`/`जेमिनी`, so any new leak pattern must contain one of them or be added to that prefilter in `hit()`.

### Step 2: Execute Sync
Run the automated synchronization script:
```bash
python3 .agents/skills/prod-translations/scripts/sync_translations.py --chunk-size 25
```
The script automatically:
1. Runs `prepare_mangled_rows_for_repair()` to unescape any raw HTML entities in plain-text fields (`title`, `dateConfidenceReasoning`, `delayReasoning`) and mark any row with untranslated English prose, mangled HTML entities (`&amp;amp;`, ` amp;`, `＆amp;`, `&amp;#39;`), delimiter leaks (`[⟦⟧]`), or missing native script in non-Latin locales for per-field repair (`sourceHash = 'repair'` + `fieldHashes` updated for the affected field).
2. Queries `GET /api/admin/translations` to identify pins with `missing`, `outdated`, or `incomplete` translations, and translates only the due locales and edited fields (`changed`).
3. Distinguishes **HTML fields** (`description`, `longFormSummary`) from **plain-text fields** (`title`, `dateConfidenceReasoning`, `delayReasoning`):
   - Only HTML fields are split by `<[^>]*>` and have `&`, `<`, `>` escaped on output (`&amp;`, `&lt;`, `&gt;`), while preserving inline tag surrounding whitespace (`<strong>`, `<em>`, `<a>`, `<cite>`) and `<cite data-ref="...">` citations.
   - Plain-text fields are never split on `<[^>]*>` and never HTML-escaped on output (preventing literal `&amp;` or `&#x27;` in React text nodes).
   - All English text fragments are decoded via `html.unescape()` before translation so entities like `&amp;` or `&#39;` never split sentences mid-clause.
4. Records model tracking metadata into the backing `SourceWiki` records (and never pin content) without marking unbuilt sources as `ready` or bumping `wikiVersion` from `0`.
5. Translates in outer chunks (`--chunk-size 25`) using multi-RPC `batchexecute` (`MkEWBc`) HTTP `POST` across due locales with caching in `.scrape/translations-cache/`, never falling back to untranslated English on failure.
6. Fixes Thai Buddhist era years back to the Gregorian calendar (`+543` offset fix) and validates `wholeTranslation` completeness before pushing each chunk in batches of 150 to `POST /api/admin/translations`.
7. **Translates `PinPerf` Panels (`charts` and `tables` `i18n`):** Checks `"PinPerf"` for any active pin whose performance/benchmark/spec/telemetry/timeline panels lack complete 15-locale `i18n` entries (`title`, `unit`, `note` on charts; `title`, `columns`, `rows`, `note`, `stages` on tables), translates missing locales while enforcing `src/lib/pinPerf.ts` (`perfProblem`) length bounds (`title <= 120`, `unit <= 40`, `column <= 80`, `cell <= 200`, `stage <= 40`, `note <= 500`) and preserving `<cite data-ref="...">` tags, and saves them via `PUT /api/pins/:id/performance`.
8. **Translates `PinProTip` Pro Tips (`PinProTipTranslation`):** Checks `"PinProTip"` for any active pin whose pro tips lack current, valid `"PinProTipTranslation"` rows (`sourceHash = sha1(tip)`, `length <= 1500`, plain-text unescaped, native script in non-Latin locales, Gregorian CE years in Thai) across all 15 non-English locales, translates missing locales, records attribution in `SourceWiki`, and saves them via `POST /api/admin/pro-tip-translations`.

### Step 3: Verification & Read-Back
1. **Database Check:**
   Re-run the health check to confirm 0 due pins and 0 content leaks:
   ```bash
   python3 .agents/skills/prod-translations/scripts/check_translations.py
   ```
2. **Public API Spot-Check:**
   Verify sample pins across languages:
   ```bash
   python3 -c "
   import urllib.request, json
   for lang in ['es', 'ja', 'de']:
       url = f'https://www.chronopin.com/api/pins/15860?lang={lang}'
       data = json.loads(urllib.request.urlopen(url).read())
       assert 'Translations completed' not in (data.get('longFormSummary') or '')
       print(f'[{lang}] Title:', data.get('title'))
   "
   ```
3. **Internal Wiki Spot-Check:**
   Verify admin sources view (`GET /api/pins/:id/sources`):
   ```bash
   python3 -c "
   import sys, urllib.request, json
   sys.path.insert(0, '.agents/skills/prod-translations/scripts')
   from check_translations import ensure_admin_token
   token = ensure_admin_token()
   req = urllib.request.Request('https://www.chronopin.com/api/pins/15860/sources', headers={'Authorization': f'Bearer {token}'})
   data = json.loads(urllib.request.urlopen(req).read())
   for s in data.get('sources', []):
       if s.get('wiki'):
           print('Wiki summary:', s['wiki'].get('summary'), '| summaryStale:', s.get('summaryStale'))
   "
   ```

---

## Infrastructure Guardrails (AGENTS.md)

1. **Production VM Safety:** NEVER run `next build`, `npm run dev`, docker restarts, or resize commands on the production VM (`20.109.175.187`).
2. **Transactional Database Access:** Always run database commands via `scripts/prod-sql.sh`, which enforces single-transaction execution.
3. **Authentication:** The admin token is stored in `.scrape/admin.token` and auto-renewed using credentials in `.env.local` (`ADMIN_EMAIL` and `ADMIN_PASSWORD`).

---

## Detailed References

- [Content Translations (secondary tables)](./references/content_translations.md)
- [Locales, Hashing & HTML Rules](./references/locales_and_hashing.md)
- [OKF Source Wiki Schema & Attribution](./references/okf_source_wiki.md)

