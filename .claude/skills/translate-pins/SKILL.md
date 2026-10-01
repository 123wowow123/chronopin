---
name: translate-pins
description: Find Chronopin prod pins that are missing a translation in the languages that are switched on, translate them with subagents (no API credit), check them, and save them to prod. Use when asked to translate untranslated or new prod pins, to "rescan", "run again" or "do again" after pins were added, or when on-save translation is off or out of credit.
---

# Translate untranslated prod pins

Chronopin translates a pin when it is saved, using the Anthropic API. When that key has no credit
it quietly stops, so new pins stay in English on every translated page. This skill does the same
work by hand: it asks prod which pins lack a translation, has subagents write the translations,
checks them, and saves them through `POST /api/admin/translations`.

Scope is the languages that are switched on in prod's multilingual setting
(`GET /api/admin/multilingual`). Do not translate the others without asking: that is thousands of
pins, and the first full run of one language cost about 25M subagent tokens.

The tool is `scripts/translate_pins.py` next to this file (Python 3, standard library only). Below,
`$T` stands for `python3 <this skill's directory>/scripts/translate_pins.py`.

## 1. Sign in (every session)

Credentials come from environment variables, never from the repo or the chat:

- `CHRONOPIN_EMAIL` and `CHRONOPIN_PASSWORD`: an admin account.
- `CHRONOPIN_URL`: optional, default `https://www.chronopin.com`.

Run `$T login`. If it says the variables are missing, tell the user to add them under the cloud
environment's settings (Edit, then environment variables) and start a new session. Do not ask them
to paste a password into the chat, and do not write one to a file. If the user pasted one anyway,
use it for this session only through the environment of a single command, never save it, and
suggest they change it.

If the sandbox blocks the call to prod, say what you were trying to do and why, and let the user
allow it. Do not look for another way around the block.

The prod host must be allowed under the environment's Network access setting.

## 2. Scan

`$T scan` prints the languages, how many pins are missing or outdated, and one `JOB` line per
chunk and language:

    JOB CHUNK=/tmp/chronopin-translate/chunks/r1001c00.json LOCALE=es OUT=/tmp/chronopin-translate/out/r1001c00__es.json PINS=25

Pins are 25 to a chunk. If it finds nothing, say so, run `$T logout`, and stop.

A pin is "outdated" when it was edited after it was translated. It is translated again in full.

For three pins or fewer, skip the subagents: translate them yourself into every language, write the
same JSON the instructions describe, and go to step 4.

## 3. Translate with subagents

Start one `general-purpose` subagent per `JOB` line, with `model: "sonnet"`. At most 20 may run at
once; start the rest as others finish. Keep the prompt short:

    Follow <this skill's directory>/subagent-instructions.md with CHUNK=<path> LOCALE=<code> OUT=<path>

Run them in the background. Each one reads its chunk, writes OUT, checks it with the validator and
replies `0 []`.

Cost: about 60k to 150k tokens per job. A 25-pin chunk in one language is about 90k.

## 4. Check and save, as agents finish

When an agent finishes (or every few minutes), run `$T sweep`. It checks every output file against
its chunk (same HTML tags and `<cite>` citations, same `sourceHash`, the right script, nothing
missing) and saves the ones that pass. Files that fail are listed and left alone: their agent is
usually still fixing them, so check again later. If one stays invalid after its agent has
finished, run that job again.

The save skips any pin edited since the scan ("the pin changed since it was exported"). That is
correct, not an error; the next scan picks it up.

## 5. Confirm and clean up

When every job is saved, run `$T status`. It should say 0 pins missing. If the other side added
pins meanwhile, scan again; a second round is normal. Then run `$T logout`, which deletes the
token. Report the pin count, the languages, and anything skipped.

## Notes

- Never print the token or password. The token lives in the work directory with mode 600
  (default `<tmp>/chronopin-translate`, or `CHRONOPIN_TRANSLATE_DIR`).
- Run `scan` once per round. Re-running it before the jobs are saved makes new chunk names for
  the same pins.
- Italian, Russian, Thai and Portuguese were added to the code but not switched on. If one is
  switched on later, a scan will list every pin for it. Warn the user about the size before
  starting.
- Once the Anthropic key has credit again, `npm run translations:sync` on a machine with the prod
  `.env` does the same work with no subagents.
