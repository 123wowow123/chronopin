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
> **Translation model tracking (e.g., `Translations completed using Gemini 3.8 Flash.`) must NEVER appear in public pin article content (`Pin.longFormSummary`, `Pin.description`, or `PinTranslation.*`).**
>
> **It belongs ONLY in the internal pin wiki (`SourceWiki`).**
>
> Public pin content is customer-facing. Appending attribution to `longFormSummary` renders tracking text in the live article body on `chronopin.com`.

---

## Quick Reference Commands

From the workspace root (`/Users/ianflynn/chronopin`):

| Task | Command |
|:---|:---|
| **Health Check** | `python3 .agents/skills/prod-translations/scripts/check_translations.py` |
| **Check JSON Output** | `python3 .agents/skills/prod-translations/scripts/check_translations.py --json` |
| **Sync All Due Pins** | `python3 .agents/skills/prod-translations/scripts/sync_translations.py` |
| **Sync with Batch Limit** | `python3 .agents/skills/prod-translations/scripts/sync_translations.py --limit 50` |
| **Sync Specific Pin** | `python3 .agents/skills/prod-translations/scripts/sync_translations.py --pin 15860` |
| **Preview Due Pins** | `python3 .agents/skills/prod-translations/scripts/sync_translations.py --dry-run` |
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
This inspects the production PostgreSQL database via `scripts/prod-sql.sh`, counts active pins, validates hashes, and reports any leaks.

### Step 2: Execute Sync
Run the automated synchronization script:
```bash
python3 .agents/skills/prod-translations/scripts/sync_translations.py
```
The script automatically:
1. Identifies pins with missing or outdated translations.
2. Extracts English text fragments while preserving HTML structure and `<cite data-ref="...">` citations.
3. Records model tracking metadata into the backing `SourceWiki` records (and never pin content).
4. Translates across all 15 locales with caching in `.scrape/translations-cache/`.
5. Fixes Thai Buddhist era years back to the Gregorian calendar (`+543` offset fix).
6. Handles pseudo-tag escaping (e.g., song title `<3` escaped to `&lt;3`).
7. Pushes translations in batches of 150 to `POST /api/admin/translations` using the authenticated admin token (refreshed automatically via `/auth/local`).

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
   import urllib.request, json
   token = open('.scrape/admin.token').read().strip()
   req = urllib.request.Request('https://www.chronopin.com/api/pins/15860/sources', headers={'Authorization': f'Bearer {token}'})
   data = json.loads(urllib.request.urlopen(req).read())
   for s in data.get('sources', []):
       if s.get('wiki'):
           print('Wiki summary:', s['wiki'].get('summary'))
   "
   ```

---

## Infrastructure Guardrails (AGENTS.md)

1. **Production VM Safety:** NEVER run `next build`, `npm run dev`, docker restarts, or resize commands on the production VM (`20.109.175.187`).
2. **Transactional Database Access:** Always run database commands via `scripts/prod-sql.sh`, which enforces single-transaction execution.
3. **Authentication:** The admin token is stored in `.scrape/admin.token` and auto-renewed using credentials in `.env.local` (`ADMIN_EMAIL` and `ADMIN_PASSWORD`).

---

## Detailed References

- [Locales, Hashing & HTML Rules](./references/locales_and_hashing.md)
- [OKF Source Wiki Schema & Attribution](./references/okf_source_wiki.md)

