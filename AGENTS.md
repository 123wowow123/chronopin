<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->


## Daily job updates

Owner instructions (2026-10-13, 2026-10-28): apply routine, researched daily-job pin updates (sentiment, event/ticket readings, verified factual or date corrections, content/identity mismatch repairs) **without asking for confirmation again**, including pins whose authors are outside the curator allowlist. Use the authenticated admin APIs when the curator helper refuses, preserve authors, verify readbacks, and queue only specific evidence gaps, never an allowlist mismatch alone. This does not authorize production deployment. Full procedure: `.agents/skills/daily-news-job/` and `docs/okf/scraping/daily-jobs.md`.

## Construction and energy projects

Pins about something built carry a sourced `price`/`priceCurrency` (no FX conversion, null when unpublished), one status tag (`Proposed` / `In Progress` / `Completed` / `Withdrawn`, never inferred from an elapsed date), `PinPower` generation fields for power plants, and a `PinFactory` buildout profile (multi-plant pins are split into threaded per-plant pins). Details: `.agents/skills/construction-pin-research/`; the extraction prompt in `src/server/extract/systemPrompt.ts` carries the cost rule.

## Pin rubrics, reviews and competitors

Taste radar (food/drink), car performance (EV and gas), restaurant dining, AI model rubrics with spec graphs and media, and product competitors each have required fields, review minimums and save endpoints. Never invent figures or reviews; record specific research gaps instead. Details: `.agents/skills/pin-enrichment-rubrics/`.

## Deploying to production

Never deploy, restart, resize or build on the production VM (20.109.175.187) unless the user has asked for that deploy in this conversation, in words. Editing code, committing and pushing are not a request to deploy, and approval for one deploy does not cover the next. `npm run deploy` is the only deploy (GitHub builds the image, the VM pulls it). Never build on the VM. Set `DEPLOY_CONFIRMED=1` only after the user asked for this deploy, never to get around a refusal. If a build is already running (`pgrep -f next-build`), wait. Full flow: `.agents/skills/deploy-production/`.

## Pin media storage

Store pin images in Azure Blob Storage; never add pin photos or generated thumbnails to Git. Verify the public blob before switching a live pin reference, credit the source, and do not skip a picture over unclear licensing. Details, blocked-download workarounds and gallery rules: `.agents/skills/pin-media-azure/`.

## Restaurants

Guides, tabs, per-tab targets (China 35, Japan 30), west-to-east navigation, backing pins, exact-branch opening dates, menu transcription, specials and photo rules: `.agents/skills/restaurant-guide-research/`. Hard rules: restaurant `utcStartDateTime` is the branch's real opening date (never a research or promotion date), every card links to its native `/pin/[id]/[slug]` page, and never invent dates, discounts, ratings or menu items. Save content through `/api/admin/restaurant-content` and `/api/admin/restaurant-specials` (docs/okf/api/restaurant-content.md).

## Prediction market pins

In the 06:00 and 18:00 news job, create `Predicted` pins (`dateConfidence: 'estimated'`, dated to event onset) from Polymarket and Kalshi events, and monthly Brent and WTI threads that are updated with the realized settlement. Details: `.agents/skills/prediction-market-pins/`.

## Production pin translations

Owner instruction, 2026-10-29: keep active production pins translated across all 15 supported non-English locales (`es`, `fr`, `de`, `ja`, `zh`, `ko`, `hi`, `ar`, `th`, `it`, `ru`, `pt`, `ms`, `vi`, `id`) with matching `sourceHash` and complete `wholeTranslation` shapes (`title`, `description`, `longFormSummary`, `dateConfidenceReasoning`, `delayReasoning`). Never place model tracking notes (such as `Translations completed using Gemini 3.8 Flash.`) in public pin or translation content (`Pin.longFormSummary`, `Pin.description`, or `PinTranslation.*`); record translation attribution strictly in the backing `SourceWiki` without mutating `Source.status` or `Source.wikiVersion` on unbuilt sources. Use `.agents/skills/prod-translations/` to check coverage, synchronize due pins, and audit content for leaks.

## Project skills

Before starting a task, check `.agents/skills/` for a skill that covers it and read its `SKILL.md` first: `daily-news-job`, `deploy-production`, `pin-enrichment-rubrics`, `construction-pin-research`, `restaurant-guide-research`, `pin-media-azure`, `prediction-market-pins`, `pin-field-and-api-dev` and `prod-translations`. List the folder in case more have been added. Update the skill when its workflow changes.
