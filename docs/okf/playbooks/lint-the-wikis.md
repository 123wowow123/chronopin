---
type: Playbook
title: Lint the wikis
description: Run npm run okf:lint to check OKF conformance, re-read stale links, prune orphans, catch poor wikis and flag contradictions between a pin's links.
resource: ../../../scripts/okf/lint.ts
tags: [playbook, lint, maintenance]
generated: { by: claude-code/claude-opus-5, at: 2026-09-19T04:00:00Z }
---

# Run

```sh
npm run okf:lint                              # every check, report only
npm run okf:lint -- --fix                     # and fix what can be fixed
npm run okf:lint -- --check stale --check orphan
npm run okf:lint -- --pin 930                 # one pin and its links
npm run okf:lint -- --dir docs/okf            # only check a bundle on disk against the spec
```

Findings replace the previous run's findings for the same checks and pins. They're stored in [OkfLintFinding](../tables/okf-lint-finding.md) and shown under `lintFindings` in [`GET /api/pins/:id/sources`](../api/pin-sources.md). The stale check also runs by itself every night (see below). A nightly `npm run okf:lint -- --fix` would add the other checks.

# Checks

| Check | Looks at | `--fix` |
| --- | --- | --- |
| `conformance` | The bundle [okf:export](export-a-bundle.md) would write, against the OKF spec: frontmatter parses and has a `type`; `index.md` and `log.md` are well formed; actors and timestamps follow the conventions; every `[^id]` footnote has a `sources` entry; links resolve | Report only. A failure here means a renderer bug in [okf.ts](../../../src/lib/okf.ts) |
| `stale` | Links due for a re-read under the [re-read setting](#re-reading-links). Each is read again and compared | Rewrites the wiki if the change is about its subject, then rebuilds the summaries of the pins citing it |
| `orphan` | Links no live pin cites, first seen more than `--orphan-days` ago (default 7) | Deletes them and their wikis |
| `quality` | Wikis whose main page is thin for the amount of text, pages with an empty title, summary or body, sub-pages that repeat their parent, untagged pages, a lone topic page. Also pins with wikis but no summary | Queues a warning-level wiki for a rewrite, at most once per wiki version. Writes missing summaries |
| `contradiction` | A Claude call per pin with two or more wikis, comparing what the links say about its event (dates, figures, names, status, and the pin's own text as `[P]`) | Report only: `major` findings are warnings, `minor` are info, for an admin to review |

# Re-reading links

Set this in **Admin > Pins > Re-reading link wikis**. It's stored as the `wikiRecheck` app setting ([wikiRecheck.ts](../../../src/lib/wikiRecheck.ts), `GET`/`PUT /api/admin/wiki-recheck`). A nightly job in the server ([wikiRecheckJob.ts](../../../src/server/services/wikiRecheckJob.ts)) runs the stale check with `--fix` at midnight UTC.

The two options are separate, and either or both can be on:

| Option | Default | Meaning |
| --- | --- | --- |
| When someone opens a pin (`viewed`) | **on** | Clicking into a pin's page (a `PinView`; bots and cards seen on the timeline don't count) schedules the pin's links for that midnight, however old they are. The run takes pins opened during the day that just ended, since each link was last read |
| Read links again (`days`) | **never** | Links last read this many days ago (1–3650) are read again each night |

Every read, whichever option brought it on, is the link's last read. So with both on, a read triggered by an open also moves the link's next dated read out to N days after it. With both off, nothing is re-read.

The nightly run happens once per UTC day across all servers: the first server to claim the day in `AppSetting` runs it. A night when every server was down is caught up by the first check afterwards, which runs every 10 minutes, and it still counts only views from before that midnight. The admin page shows when it last ran.

For one manual run, `--viewed` and/or `--recheck-days N` (0 means now) replace the setting. Exported pages get `stale_after` (the time the link was last read, plus the days) whenever the days are set.

# How "changed" is decided

An exact text match means unchanged. Otherwise a changed line counts only if it has at least 4 significant words (4+ letters, not a bare year) and at least half of them appear in the link's wiki. That way a rotating "related news" sidebar resets the stored text without raising a finding, but an edited sentence about the subject does raise one. The thresholds are in [okfLint.ts](../../../src/lib/okfLint.ts) (`relevantChanges`).

# Costs and limits

- `stale` fetches pages (headless Chrome for script-built pages). By default only viewed pins' links are fetched, and `--limit` caps it at 50 links per run.
- `contradiction` is one Claude call per pin. A pin is checked again only when its title, description, dates, links or wiki versions change.
- `quality` rewrites cost a Claude call each. A wiki that comes back just as poor is reported, not queued again.
- With no API credit, `contradiction` stops and says how many pins are still due, and queued rewrites wait as `pending`. Do both by hand: see [Without API credit](without-api-credit.md).
