---
type: Playbook
title: Without API credit
description: When the app's Anthropic key has no credit, export the Claude jobs, do them in a Claude Code session with the app's own prompts, and apply the answers.
resource: ../../../scripts/wiki/export.ts
tags: [playbook, claude, fallback]
generated: { by: claude-code/claude-opus-5, at: 2026-09-19T04:00:00Z }
---

# When

The app's key has no credit, or no key is set. Links stay `pending` without using up a try, summaries stay behind, and `okf:lint` leaves contradiction checks due. Nothing is lost: it all waits for these jobs.

# Steps

1. **Export** every job that is due:

   ```sh
   npm run wiki:export -- --out /tmp/wiki-jobs            # everything
   npm run wiki:export -- --out /tmp/wiki-jobs --pin 930  # one pin
   ```

   | File | Job |
   | --- | --- |
   | `prompts.md` | The app's own system prompts and JSON schemas, the same text the API calls use. Follow them exactly |
   | `wikis/<sourceId>.json` | Write up a link. `parts` holds the full message for each call; a long link has several |
   | `summaries/<pinId>.json` | Compose a pin's summary from `input`, citing `[S]`, `[1]`, ... |
   | `contradictions/<pinId>.json` | Check a pin's links against each other from `input` |

2. **Do the jobs** in a Claude Code session. Write each answer to `results/<kind>/<id>.json`:
   - A wiki is one page object for a single-part link, or `{ "parts": [...], "root": {...} }` for a longer one.
   - A summary is `{ "pinId", "versions", "longFormSummary" }`, with `versions` copied from the job.
   - A contradiction check is `{ "pinId", "signature", "contradictions" }`, with `signature` copied from the job.
   - YouTube transcripts are auto-captions: correct names the captions mishear when the description or another link confirms them.

3. **Apply** the answers:

   ```sh
   npm run wiki:apply -- --dir /tmp/wiki-jobs     # --by claude-code/claude-opus-5 is the default actor
   ```

   Wikis are saved with `generated.by` set to that actor. A summary or contradiction check is skipped if its pin's wikis changed after the export.

4. **Export again.** Summaries and contradiction checks need their links' wikis, so a pin whose wikis were only just written shows up in the next round. Repeat until the export reports 0 jobs, then run `npm run backup:data`.

# Worked example

Pin 930 (MOSE's last flood gate) was done this way on 2026-09-19:

- Round 1: four wikis.
- Round 2: a contradiction check, which found five minor disagreements, such as the video description's "40 tonnes" gates against 210–450 t elsewhere.
- Round 3: the summary, rebuilt from the wikis.
