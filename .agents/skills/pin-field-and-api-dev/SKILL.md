---
name: pin-field-and-api-dev
description: >-
  Use this skill when adding a new field to the Pin or User model in Chronopin, or when exercising the
  authenticated API from scripts (getting a token, who may edit a pin, safe PUT round-trips, posting pins).
---

# Adding fields and driving the API

This repo's Next.js has breaking changes: read the relevant guide in `node_modules/next/dist/docs/` before
writing Next code.

## New Pin field checklist (a miss is silent)
1. Schema: new numbered file in `scripts/db/schema/` (`ALTER TABLE "Pin" ADD COLUMN ...`), plus
   `CREATE OR REPLACE VIEW "PinBaseView"` if exposed. Apply with `npm run create:db`.
2. Write SQL: `createPin` in `src/server/model/pinShared.ts`, `updatePinRow` in `src/server/model/pin.ts`.
3. Timeline: `PAGE_COLUMNS` in `src/server/model/pins.ts` is explicit.
4. Server model: `BasePinProp` in `src/server/model/basePin.ts`.
5. Types/UI: `PinJson` in `src/lib/types.ts`; `PinCard.tsx`, pin page `src/app/pin/[id]/[slug]/page.tsx`;
   JSON-LD in `src/lib/seo.ts` if relevant.
6. Extraction: `SCHEMA` in `src/server/extract/index.ts`, `systemPrompt.ts`, `applyExtracted`, `applyScrape`.
7. **Edit form (destroys data if missed):** `pinToForm`/`formToPin` in `src/lib/pinForm.ts` and `PinForm.tsx`; the
   PUT writes every column so a missing field is NULLed on the next edit. Add to `pinForm.test.ts`.
8. PinBaseCache: pins read from the cache; a new table needs the three pinBaseCache triggers.
9. UI strings: edit every `messages/*.ts` locale in the same change.
Verify: `curl /api/pins/:id`, `curl /api/main`, `npm test`, `npm run test:e2e`.

## New User field
Five column lists in `src/server/model/user.ts`; user-editable fields must join `patchableUserProps` or
`PATCH /api/users/me` silently ignores them.

## Authenticated API
- Token: `POST /auth/local {email,password}` (or signup `POST /api/users` with firstName/lastName). Send
  `Authorization: Bearer <jwt>`. Tokens last ~5h; never print them; do not delete token files.
- Edit/delete a pin: author or admin only (`loadModifiable` in `src/app/api/pins/[id]/route.ts`).
- Throwaway accounts: sign up, test, then delete rows by SQL. `scripts/data/e2eAdmin.ts` promotes an e2e account.
- **PUT is a whole-pin write**: GET omits null fields, so round-trip carefully and never send partial bodies.
- Admin tables: `/api/admin/db` CRUD (audited).

## Posting pins to prod
Only when asked. Log in as the vertical's curator, check duplicates via `GET /api/pins/search?q=`, validate drafts,
post **one pin at a time** gated on homepage latency (<6s) with a pause between posts, set `parentId` from the
previous pin, record draft-to-id in `posted.json`, mirror work in gitignored `.scrape/prod-batches/`. Read pins
back afterwards. Agents draft JSON only; they get no tokens.
