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

Findings replace the previous run's findings for the same checks and pins. They're stored in [OkfLintFinding](../tables/okf-lint-finding.md) and shown under `lintFindings` in [`GET /api/pins/:id/sources`](../api/pin-sources.md). Nothing runs the stale check on a schedule (see below). A nightly `npm run okf:lint -- --fix` would add the other checks.

# Checks

| Check | Looks at | `--fix` |
| --- | --- | --- |
| `conformance` | The bundle [okf:export](export-a-bundle.md) would write, against the OKF spec: frontmatter parses and has a `type`; `index.md` and `log.md` are well formed; actors and timestamps follow the conventions; every `[^id]` footnote has a `sources` entry; links resolve | Report only. A failure here means a renderer bug in [okf.ts](../../../src/lib/okf.ts) |
| `stale` | Links due for a re-read ([re-reading links](#re-reading-links)). Each is read again and compared | Rewrites the wiki if the change is about its subject, then rebuilds the summaries of the pins citing it |
| `orphan` | Links no live pin cites, first seen more than `--orphan-days` ago (default 7) | Deletes them and their wikis |
| `quality` | Wikis whose main page is thin for the amount of text, pages with an empty title, summary or body, sub-pages that repeat their parent, untagged pages, a lone topic page. Also pins with wikis but no summary | Queues a warning-level wiki for a rewrite, at most once per wiki version. Writes missing summaries |
| `contradiction` | A Claude call per pin with two or more wikis, comparing what the links say about its event (dates, figures, names, status, and the pin's own text as `[P]`) | Report only: `major` findings are warnings, `minor` are info, for an admin to review |
| `imprecise` | Every future pin whose date is only as precise as the year its source gave (a bare year sits on 31 December by convention, which is a placeholder, not a claim about the day). These are the pins where one better reference buys the most: a later article naming the month or the day retires a whole year of uncertainty. Report only, and no fetch or Claude call, so it runs on every lint. Past pins are left out - a bare year on a 12th-century event is as good as it will ever get. |

# Re-reading links

Links are only re-read by hand. There used to be an automatic re-read (a setting under Admin, a nightly timer, then briefly a task of the midnight daily job, reading the links of pins opened since they were last read); it was removed on 2026-09-22.

For a run, `--viewed` (links of pins opened since those links were last read) and/or `--recheck-days N` (links last read N days ago; 0 means now) say which links to read; with neither, the check is skipped. Exported pages no longer get `stale_after`, since no re-read is dated.

# How "changed" is decided

An exact text match means unchanged. Otherwise a changed line counts only if it has at least 4 significant words (4+ letters, not a bare year) and at least half of them appear in the link's wiki. That way a rotating "related news" sidebar resets the stored text without raising a finding, but an edited sentence about the subject does raise one. The thresholds are in [okfLint.ts](../../../src/lib/okfLint.ts) (`relevantChanges`).

# Costs and limits

- `stale` fetches pages (headless Chrome for script-built pages). By default only viewed pins' links are fetched, and `--limit` caps it at 50 links per run.
- `contradiction` is one Claude call per pin. A pin is checked again only when its title, description, dates, links or wiki versions change.
- `quality` rewrites cost a Claude call each. A wiki that comes back just as poor is reported, not queued again.
- With no API credit, `contradiction` stops and says how many pins are still due, and queued rewrites wait as `pending`. Do both by hand: see [Without API credit](without-api-credit.md).
