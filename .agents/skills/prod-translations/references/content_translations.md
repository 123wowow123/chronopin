# Content translations: the secondary tables

Pins, `PinPerf` panels and pro tips are translated by `sync_translations.py`. Everything else with
English prose has its own `<Source>Translation` table (migration `0265`), served by one endpoint:
`/api/admin/content-translations` (`src/server/model/contentTranslations.ts` holds the registry).

**One run:** the translation agent translates these tables in the same run as the pins (the run is not
done until both are at zero due). Content sessions (pin research, restaurants, company hubs, people, horoscopes...)
never write these rows; they save English and the translation agent fills them.

| `table` name | Source table | Translated fields |
|:---|:---|:---|
| `company-product` | `CompanyProduct` | `name`, `summary` |
| `product-blurb` | `ProductBlurb` | `blurb` |
| `pin-review` | `PinReview` | `comment` |
| `pin-critic-review` | `PinCriticReview` | `reviews` (json), `basis` |
| `restaurant-content` | `RestaurantContent` | `profile` (json) |
| `restaurant-special-venue` | `RestaurantSpecialVenue` | `profile` (json) |
| `person-wiki` | `PersonWiki` | `page`, `profile` (json) |
| `person-research-note` | `PersonResearchNote` | `note` |
| `company-wiki` | `CompanyWiki` | `page` |
| `industry-forecast` | `IndustryForecast` | `title`, `note` |
| `daily-horoscope` | `DailyHoroscope` | `text` (last 2 days only) |
| `transit-horoscope` | `TransitHoroscope` | `text` (last 2 days only) |
| `pin-project` | `PinProject` | `note` |
| `pin-candidate` | `PinCandidate` | `name`, `artist` |
| `pin-taste` | `PinTaste` | `basis` |

Not translated on purpose: `CompanyHub` (no text of its own; the hub copy is the hub pin, which
the pin translation step covers), `Comment` / `Message` (conversation, not content).

## Flow (per table, per shard)

1. **Coverage:** `GET /api/admin/content-translations` lists every table with `sources`, `complete`, `due`.
2. **Due rows:** `GET ...?table=company-wiki&locale=de,ja&limit=100&after=<next>` returns
   `{ rows: [{ key, sourceHash, fields, locales }], next, note }`. Follow `next` until it is `null`.
   `locales` is what is still missing for that row (missing or hash no longer matches).
3. **Translate** each field into each listed locale (`gemini-4-hydrogen-medium` swarm workers via
   `swarm{action:"add", model:"gemini-4-hydrogen-medium"}`, shard by table or by `after` range, as for pins).
   Follow `note` for the table and the rules below. Keep direct LLM generation payloads small per turn to avoid
   response-header timeouts; if Google NMT hits a CAPTCHA gate and thousands of rows remain due, pause NMT
   immediately and confirm with the user whether to proceed directly or pause content tables.
4. **Save:** `POST` `{ table, translations: [{ key, locale, sourceHash, fields }] }` (max 300 rows).
   Send back the `key` and `sourceHash` exactly as received; `fields` has the same field names as the GET.
   The response lists `skipped` rows with a reason (`the source changed since`, `... too long`,
   `... changed shape`, ...). Re-GET and redo only those.
5. **Verify:** re-run step 1; every table must show `due: 0`.

Use the admin token the same way as for pins (`check_translations.ensure_admin_token()`).

## Rules

- Text fields: plain text or the source's own Markdown; keep `[ref]` markers, links, `<cite data-ref>` tags.
  Not empty, within the field's length cap (the save checks).
- JSON fields (`profile`, `reviews`): return the same JSON with identical keys, array lengths and
  non-string values. The save rejects a reshaped value. Translate prose only; keep dish/venue/person
  names, prices, dates, addresses, scores, outlets and URLs as they are.
- Thai: Gregorian years, never Buddhist Era (same as for pins).
- A field that is `null` in English stays `null`; send `null`.
- No model tracking notes in any field (see the Golden Rule in `SKILL.md`); attribution goes to the wiki
  / the run log, never these tables.
- Hash: sha1 of `JSON.stringify` of the field values in registry order with sorted object keys. You never
  compute it; copy it from the GET.
- Editing the English source retires its translations automatically (hash mismatch) and the row shows up
  as due again next run. Rows cascade away with the source row.

## Reading (UI)

`contentTranslation(table, locale, key)` returns the translated fields only when the row's hash still
matches the English, else `null` (show English). Pages adopt it as they are localised; until then the
rows are stored but not shown.
