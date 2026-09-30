# Arabic: what is done and what is left

Arabic (`ar`, Modern Standard Arabic,
right to left) is a site language in the code. Translating the prod pins is the
part still to do, and it has to be run where the prod database and the
Anthropic key are (the cloud session had neither, and its safety checks
blocked bulk reads from prod).

## Done

- **Language** (PR #10, merged): `ar` in `src/lib/i18n/config.ts`, UI
  dictionary `src/lib/i18n/messages/ar.ts`, date words in `formatWords.ts`,
  watch-alert messages, `<html dir="rtl">` for RTL languages (`isRtl`),
  migration `scripts/db/schema/0098_arabic_locale.sql` (widens the
  `PinTranslation.locale` and `User.localePreference` CHECK constraints).
- **Mirrored layout** (PR #10): physical Tailwind classes (`ml-`, `pl-`,
  `left-`, `text-left`, `border-l`, `rounded-l`...) became logical ones
  (`ms-`, `ps-`, `start-`, `text-start`, `border-s`, `rounded-s`...), chevrons
  and toggle knobs flip under `rtl:`, the mobile drawer opens from the reading
  edge, the select arrow moves.
  Kept left to right on purpose (`dir="ltr"`): the time and distance sliders,
  the search token editor, media and listing carousels, the tab row. Not
  converted: the map (`PinsMap.tsx`, `PinWebGraph.tsx`) and `/admin/*`.
- **Specialty-day names**: `src/server/data/specialtyDays.ar.json` names all
  3,298 days, wired into `src/server/specialtyDays.ts`.
- **Arabic fonts**: Noto Sans Arabic and IBM Plex Sans Arabic, non-preloaded
  `next/font` entries in `src/app/[lang]/layout.tsx`, listed after the Latin
  fonts in the stacks in `globals.css` (fetched only when a page holds Arabic).

## Left to do

1. **Deploy, then apply migration `0098_arabic_locale.sql` on prod**
   (`npm run create:db`). Prod already accepted `locale=ar` on
   `GET /api/admin/translations` (the code is live), but I never tried to
   save a row, so confirm the constraint is widened. Note master also has a
   second `0098_pin_series_fred.sql`; the runner tracks files by name, so two
   `0098_*` files should both apply, but check `schemaMigrations` afterwards.
   `0100_thai_italian_russian_portuguese_locales.sql` rewrites the same two
   CHECK constraints and keeps `ar` in them, so apply 0098 before it.
2. **Translate the prod pins into Arabic.** Pick one:

   - Straight from the machine with the prod `.env` (costs Anthropic credit,
     one Claude call per pin):

     ```
     npm run translations:sync -- --locale ar --dry-run   # how many
     npm run translations:sync -- --locale ar             # do them
     ```

     Start with `--limit 20` to read a few in Arabic before doing them all.

   - By hand, without credit. Export, have the translations written, apply:

     ```
     npm run translations:sync -- --export ar-todo.json --locale ar --limit 500
     # ...translate into ar-done.json, keeping each row's pinId and sourceHash...
     npm run translations:sync -- --apply ar-done.json
     ```

     `--apply` skips any pin edited since the export (its `sourceHash` no
     longer matches), so nothing is overwritten with stale text. On a server
     the same is `POST /api/admin/translations` (admin login, at most 500 rows
     per request, `GET ?locale=ar&limit=1000&after=<pin id>` lists what is
     missing).

3. **Offer Arabic on the site.** Languages are only shown when enabled in the
   admin multilingual setting (`/api/admin/multilingual`, default none).
   Until Arabic is switched on, `/ar/...` serves the English pages, the
   profile language picker leaves it out and hreflang does not list it. Turn
   it on after step 3 so readers do not see English pins under an Arabic page.
4. **Back up** the new rows: `npm run backup:data` (translations are kept in
   `scripts/backup/seedTranslations.json.gz`).
5. **Have a native speaker read** `src/lib/i18n/messages/ar.ts`, the
   specialty-day names, and a sample of translated pins. All of it was written
   by a model and has not been reviewed by a person.
6. **Look at it in a browser.** The mirrored layout and the RTL pages were
   never rendered (no database in the cloud session). Open `/ar`, a pin page,
   the map, the drawer, the profile page and a form, and fix anything that
   sits on the wrong side. Likely spots: `PinsMap.tsx` overlays, admin pages
   (still physical classes), anything `position: absolute` with a pixel offset.
   `npm run test:e2e` has `tests/e2e/i18n.spec.ts`; add an Arabic case.

## Notes

- The admin login was typed into the cloud chat while working on this. If it
  was a real prod password, change it.
- The cloud session left only scratch files outside the repo; nothing here
  depends on them.
