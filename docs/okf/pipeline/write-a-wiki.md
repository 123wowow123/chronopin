---
type: Process
title: Write a wiki
description: One Claude call turns a link's text into a tree of OKF pages; long sources are split into parts first.
resource: ../../../src/server/extract/wiki.ts
tags: [pipeline, claude, okf]
generated: { by: claude-code/claude-opus-5, at: 2026-09-19T02:00:00Z }
---

# Output

`writeWiki` returns a page tree that `Source.saveWiki` stores as [SourceWiki](../tables/source-wiki.md) rows, replacing any older tree in one transaction and bumping `wikiVersion`:

- **Main page**, whose OKF type is the link's kind: `Web Page`, `YouTube Video`, `Social Post` or `Podcast Episode`.
- **Topic pages** (up to 8), when the link covers several distinct things: a roundup's products, a keynote's announcements, a video's segments.
- **Part pages** (`Source Part`) for text over 60,000 characters. The text is split into up to 6 parts at paragraph or sentence breaks. Each part gets its own call and its own topic pages, and a final call writes the main page from the parts.

Every page has a title, a one-line summary, a markdown body and up to 8 lowercase tags. The main page also records the link's own publication or update date, when the text gives one.

# Rules the prompt sets

- Record only what the source says: events, dates in its own wording, places, people, organizations, figures with units, short quotes.
- Keep the source's hedges ("reportedly", "planned"). Add no outside knowledge or opinion.
- Leave out navigation, ads, comments, sponsor reads.

# Model

`claude-opus-5` with adaptive thinking, structured JSON output and `max_tokens` 16000. Above that, the SDK requires streaming. A declined request is retried server-side on a fallback model, and `generatedBy` records whichever model actually answered, as `chronopin-wiki/<model>`.

# Failures

A declined request, a response cut off by the token limit, or a bad request marks the link `failed` and uses up a try. Problems on Anthropic's side throw `ServiceError`, which leaves the link `pending` without using a try. See [Catch up and retry](../playbooks/catch-up-and-retry.md).
