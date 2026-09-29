/**
 * A pin's words in the other languages the site speaks: one call returns all
 * of them at once, as structured output, so a pin costs one request however
 * many languages there are. The HTML in the description and key points is
 * kept as it is, and so are the <cite data-ref> citations in the key points,
 * which link to the pin's references by URL.
 */

import type Anthropic from '@anthropic-ai/sdk';
import { LANGUAGE_NAMES, LOCALES, type Locale } from '@/lib/i18n/config';
import { TRANSLATED_FIELDS, type PinText } from '../model/pinTranslation';
import log from '../util/log';
import { describeError, getClient, MODEL } from '.';

export const TARGET_LOCALES = LOCALES.filter((l): l is Exclude<Locale, 'en'> => l !== 'en');
export type TargetLocale = (typeof TARGET_LOCALES)[number];

const SYSTEM_PROMPT = `You translate the text of one pin on Chronopin, a timeline of dated events (launches, releases, openings, matches, deadlines), into several languages for readers who browse the site in those languages.

For each language, translate every field you are given:
- Write the way a news site in that language would: natural, concise, not word for word.
- Keep proper names as they are commonly written in that language: product, film, game and company names usually stay in their original form; use an established local title only when one exists (a film's official Japanese title, say).
- Keep numbers, dates, prices, units, tickers and URLs exactly as they are.
- The description and key points are HTML. Keep every tag and attribute exactly, and translate only the text between them. Never translate or change a <cite data-ref="..."></cite> element; keep it where it sits in the sentence.
- The date reasoning may quote the source in quotation marks: translate the quotation, keeping it marked as a quotation.
- A field given as an empty string stays an empty string.
- If the text is already in the target language, return it unchanged.`;

const FIELD_SCHEMA = {
  type: 'object',
  properties: Object.fromEntries(TRANSLATED_FIELDS.map((field) => [field, { type: 'string' }])),
  required: [...TRANSLATED_FIELDS],
  additionalProperties: false,
};

function schemaFor(locales: readonly TargetLocale[]) {
  return {
    type: 'object',
    properties: Object.fromEntries(locales.map((l) => [l, FIELD_SCHEMA])),
    required: [...locales],
    additionalProperties: false,
  };
}

/**
 * Resolves to each language's translation, or to null when there is no API
 * key or the call failed or was declined: the pin is then shown in its own
 * words, and the backfill tries again later.
 */
export async function translatePinText(pin: PinText, locales: readonly TargetLocale[] = TARGET_LOCALES): Promise<Partial<Record<TargetLocale, PinText>> | null> {
  const anthropic = getClient();
  if (!anthropic || !locales.length || !pin.title?.trim()) return null;

  const source = Object.fromEntries(TRANSLATED_FIELDS.map((field) => [field, (pin[field] as string | null | undefined) ?? '']));
  const languages = locales.map((l) => `${l}: ${LANGUAGE_NAMES[l]}`).join('\n');
  try {
    // Five languages of a long description can run to many thousands of
    // tokens, so the answer is streamed rather than waited on.
    const response = await anthropic.beta.messages
      .stream({
        model: MODEL,
        max_tokens: 64000,
        output_config: { effort: 'medium', format: { type: 'json_schema', schema: schemaFor(locales) } },
        // A policy decline on Opus 5 is retried server-side on a fallback model.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `Languages, by the key to answer under:\n${languages}\n\nThe pin:\n${JSON.stringify(source, null, 2)}` }],
      })
      .finalMessage();

    if (response.stop_reason === 'refusal') {
      log.warn('pin translation refused', log.stringify(response.stop_details));
      return null;
    }
    if (response.stop_reason === 'max_tokens') {
      log.warn('pin translation cut off at max_tokens');
      return null;
    }
    const block = response.content.find((c): c is Anthropic.Beta.BetaTextBlock => c.type === 'text');
    if (!block) return null;
    const parsed = JSON.parse(block.text) as Record<string, Record<string, string>>;
    const out: Partial<Record<TargetLocale, PinText>> = {};
    for (const locale of locales) {
      const fields = parsed[locale];
      if (!fields?.title?.trim()) continue;
      // Empty stays empty: a field the pin does not have is not invented.
      out[locale] = {
        title: fields.title.trim(),
        description: source.description ? fields.description || null : null,
        longFormSummary: source.longFormSummary ? fields.longFormSummary || null : null,
        dateConfidenceReasoning: source.dateConfidenceReasoning ? fields.dateConfidenceReasoning || null : null,
        delayReasoning: source.delayReasoning ? fields.delayReasoning || null : null,
      };
    }
    return out;
  } catch (err) {
    log.warn('pin translation failed', describeError(err));
    return null;
  }
}
