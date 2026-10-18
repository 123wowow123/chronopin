---
type: Design
title: Scraping API
description: Design of a job-based Scraping API built on the scraper stages, with a pluggable LLM driver (Anthropic or a Claude Code session) so a scrape never stalls when credit runs out. Not built yet.
resource: ../../../src/app/api/scrape/route.ts
tags: [api, scraping, design, fallback]
generated: { by: claude-code/claude-opus-5, at: 2026-09-19T20:00:00Z }
---

**Status: design, with the task hand-off already built.** Today `GET /api/scrape?url=` runs every stage in one request (120 seconds) and returns a draft pin; `GET /api/scrape/images` finds pictures. When the LLM is unavailable (no key, no credit or a failed call) the draft carries `llm: "session"` and `llmTasks` (`extract` and `references`: system prompt, schema, input) and every non-LLM stage still ran, including fields read from the page's own metadata. What is still design is the job record, the answer endpoints and batches below. The stages in the [Scraping strategy](../scraping/strategy.md) already exist as functions. This page says how to expose them as a resumable API, and how the LLM steps hand off to a session when the key has no credit.

# Why a job

The one-shot route cannot pause: with no credit the extractor returns null and the scrape ends with a nearly empty draft. Stages that call Claude become **tasks** a driver can answer, so the job can wait for a session and continue. It also gives batches, retries and an audit trail.

# LLM driver

```ts
interface ScrapeDriver {
  extract(input: { url: string; text: string }): Promise<ExtractedFields | null>;          // stage 2
  references(input: { url: string; text: string; kind: SourceKind }): Promise<FoundReferences>; // stage 3
  // later: summary, contradictions (already exportable via wiki:export)
}
```

- **AnthropicDriver** is today's `extractPinFields` and `findReferences`.
- **SessionDriver** writes the task (system prompt, JSON schema, input) to the job and returns *pending*. An answer supplied later (by a Claude Code session, through the API or `scripts/scrape/apply.ts`) is validated against the same schema and the job resumes. A missing key selects the SessionDriver instead of returning null.

The prompts and schemas stay in one place ([systemPrompt.ts](../../../src/server/extract/systemPrompt.ts), `SCHEMA`, `RECORD_TOOL`), so both drivers do exactly the same job. This mirrors `wiki:export` / `wiki:apply` ([Without API credit](../playbooks/without-api-credit.md)).

# Endpoints (proposed)

All require a signed-in user; creating or saving for a curator needs that curator's account or an admin.

| Endpoint | Purpose |
| --- | --- |
| `POST /api/scrape/jobs` | `{ url, vertical?, driver?: "anthropic" \| "session", curatorId? }` creates a job (idempotent per `urlKey`); answers `{ id, status }` |
| `GET /api/scrape/jobs/:id` | Status, per-stage results, the draft pin so far, `lastError` |
| `GET /api/scrape/jobs/:id/tasks` | Pending LLM tasks: `[{ id, stage, system, schema, input }]` |
| `PUT /api/scrape/jobs/:id/tasks/:taskId` | The answer, validated against the task's schema; resumes the job |
| `POST /api/scrape/jobs/:id/save` | Saves the reviewed draft through `POST /api/pins`; answers the pin |
| `POST /api/scrape/batches` | `{ urls[] }` or `{ listUrl, vertical, limit }`; creates jobs with per-host throttling |
| `GET /api/scrape?url=` | Kept: creates and runs a job synchronously with the AnthropicDriver and answers the draft, as today |

# Job record

`ScrapeJob(id, urlKey, url, kind, vertical, driver, status, stages jsonb, draft jsonb, pinId, attempts, lastError, userId, utcCreatedDateTime, utcUpdatedDateTime)`. `status` is `queued`, `fetching`, `awaiting-llm`, `enriching`, `ready`, `saved` or `failed`. `stages` holds each stage's output and its own status, so a failed image search never blocks the pin. Fetched text is kept through `Source.rememberText` so the link wiki is written without a second fetch.

# Rules the API enforces

1. **Idempotent by source.** The same `urlKey` reuses its job; `rejectDuplicateSourceUrl` still guards the save, and a duplicate subject is offered as a reference on the existing pin.
2. **Soft failure per stage**, hard failure only for the fetch and the save; a hard failure records `lastError` and the stage, and a retry resumes from that stage.
3. **Host politeness.** Per-host throttle with exponential backoff on 429; the YouTube caption and Wikimedia CDN limits in [Sources](../scraping/sources.md) are enforced in one place, not per caller.
4. **SSRF guard.** Only `http(s)` URLs to public hosts; no private ranges, no redirects off the requested page (the scraper already blocks navigation away).
5. **Validation before save.** The quality bar in the strategy (title, dates, delay fields, references at 70+ with valid dates, categories from the list, no shared roundup `sourceUrl`) is checked, and violations come back as `problems[]` rather than a 500.
6. **Never fabricate.** A task answer with a URL the job's fetch and search stages never returned is rejected for references, images and purchase links.
7. **Attribution.** The pin's author is the curator; every reference is attributed to them, as `POST /api/pins` does.

# Scripts that complement it

`scripts/scrape/export.ts` writes pending tasks to a directory with the prompts, `scripts/scrape/apply.ts` reads `results/` back, in the same layout as `wiki:export` (`DIR/prompts.md`, `DIR/tasks/<id>.json`, `DIR/results/<id>.json`), for sessions that work from files rather than HTTP. The existing `references:list`, `references:apply`, `media:screen`, `media:studio-locations`, `tags:sync` and `threads:prequels` remain the by-hand versions of stages 3, 4, 5, 7 and 8.

# Build order

1. Extract the stage functions behind the `ScrapeDriver` seam without changing behaviour.
2. Add `ScrapeJob` and the read endpoints; make `GET /api/scrape` create and run a job.
3. Add the SessionDriver, the task endpoints and the export/apply scripts.
4. Add batches and the per-host throttle.
5. Keep [Learnings](../scraping/learnings.md) current: each job's failures feed the throttle table and the fetch-recognition rules.
