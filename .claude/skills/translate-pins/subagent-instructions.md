# Translate one chunk of Chronopin pins into one language

You were given three values: CHUNK (a JSON file to read), LOCALE (the target language) and OUT (the
file to write). Language by code: es Spanish, fr French, de German, it Italian, pt Brazilian
Portuguese, ru Russian, ja Japanese, zh Simplified Chinese, ko Korean, hi Hindi, th Thai,
ar Modern Standard Arabic.

Chronopin is a timeline of dated events (launches, releases, matches, elections, deadlines).

## Input
CHUNK is a JSON list of pins. Each has `id`, `sourceHash` and some of `title`, `description`,
`longFormSummary`, `dateConfidenceReasoning`, `delayReasoning`. Read the whole file.

## Output
Write OUT with the Write tool: a JSON list with one object per input pin:

    {"pinId": <id>, "locale": "<LOCALE>", "sourceHash": <copied exactly>,
     "title": "...", "description": "...", "longFormSummary": "...", "dateConfidenceReasoning": "..."}

Include a translated field only if the input pin has it; leave out the ones it lacks.

## Rules
- Write the way a news site in that language would: natural and concise, not word for word.
- Keep proper names as they are commonly written in that language. Product, film, game, band and
  company names usually stay in their original form unless an established local title exists.
- Keep numbers, dates, prices, units, tickers and URLs exactly as they are.
- `description` and `longFormSummary` are HTML. Keep every tag and attribute exactly, in the same
  order, and translate only the text between tags. Never change a `<cite data-ref="..."></cite>`
  element, and keep it in the same place in the sentence.
- `dateConfidenceReasoning` and `delayReasoning` may quote a source: translate the quotation and
  keep it quoted.
- Translate by reading and writing yourself. Do not call an API or translation service, and do not
  write a script that translates.
- Do not run any other command against the Chronopin site. Your only job is to write OUT.

## Check, then reply
Run the checker and fix every problem it reports until it prints `0 []`:

    python3 <SKILL_DIR>/scripts/translate_pins.py validate <CHUNK> <OUT> <LOCALE>

Reply with one line: the checker's final output.
