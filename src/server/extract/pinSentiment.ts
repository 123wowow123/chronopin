/**
 * How a pin reads as news for its company, as a number from -1 to 1, and
 * which of the company's products it is about, so a company search can graph
 * how its news has run over time, and each major product's on its own
 * (src/lib/companySentiment.ts). The same one small call as a comment's tone
 * (./sentiment.ts), over the pin's title and summary.
 */

import type Anthropic from '@anthropic-ai/sdk';
import PinSentiment, { cleanProduct, sentimentHash, type SentimentText } from '../model/pinSentiment';
import log from '../util/log';
import { describeError, getClient, MODEL } from '.';

export const PIN_SENTIMENT_PROMPT = `You score one pin on an event timeline, where each pin is a real-world event (a launch, release, opening, ruling, deadline, result) tied to a company.

Score how the event reads as news for that company, from -1 to 1:
- 1: a clear win - a record launch, a major award, a big contract, a hit release, strong results
- 0.5: good news - a release or opening going ahead, a partnership, an expansion, a well-received announcement
- 0: routine or neutral - a scheduled date, an ordinary update, an event whose outcome is not yet known
- -0.5: bad news - a delay, a price rise that draws complaint, a lukewarm reception, a layoff, a probe
- -1: serious trouble - a recall, a disaster, a lawsuit lost, a product cancelled, a failure

Judge the event for the company, not for the world: a rival's win is not the company's, and a fine is bad for the one fined. An upcoming event scores by what is known now - a launch set for next month is mildly good, not a win yet. Stay near 0 when the text does not say how it went.

Also name the product the event is about: the company's own product line as people know it, without the model number, generation, size or year - "iPhone" for an iPhone 18 Pro, "Apple Watch" for an Apple Watch Ultra 4, "PlayStation" for a PS6, "Sora" for Sora 2. For a film, series, game or anime, the franchise or series title, not the season or sequel ("Ghost in the Shell", "God of War"). Empty when the event is about the company as a whole (results, layoffs, a lawsuit, an IPO, a headquarters) or no one product. When the company's known products include this one, use that name exactly as given.`;

// The product lines a single call names at most: enough to steer toward the
// company's existing names without a long prompt.
const KNOWN_PRODUCTS = 40;

const SCHEMA = {
  type: 'object',
  properties: {
    sentiment: { type: 'number', description: 'From -1 (bad news for the company) to 1 (good news)' },
    product: { type: 'string', description: 'The product line the event is about, or empty for none' },
  },
  required: ['sentiment', 'product'],
  additionalProperties: false,
};

export const clampSentiment = (value: number) => Math.round(Math.min(1, Math.max(-1, value)) * 100) / 100;

export type PinScore = { sentiment: number; product: string | null };

/**
 * Resolves to the score and product, or null when there is no API key, or the
 * call failed or was declined: the pin sits out of the graph until the
 * backfill (npm run companies:sentiment) scores it. `products` are the names
 * the company's other pins already use.
 */
export async function scorePinText(input: SentimentText & { company: string; products?: string[] }): Promise<PinScore | null> {
  const anthropic = getClient();
  if (!anthropic) return null;
  try {
    const response = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: PIN_SENTIMENT_PROMPT,
      messages: [
        {
          role: 'user',
          content: JSON.stringify(
            { company: input.company, knownProducts: (input.products ?? []).slice(0, KNOWN_PRODUCTS), title: input.title, summary: input.description ?? '' },
            null,
            2,
          ),
        },
      ],
    });
    if (response.stop_reason === 'refusal') {
      log.warn('pin sentiment refused', log.stringify(response.stop_details));
      return null;
    }
    const block = response.content.find((c): c is Anthropic.Beta.BetaTextBlock => c.type === 'text');
    if (!block) return null;
    const { sentiment, product } = JSON.parse(block.text) as { sentiment: number; product?: string };
    return typeof sentiment === 'number' && Number.isFinite(sentiment) ? { sentiment: clampSentiment(sentiment), product: cleanProduct(product) } : null;
  } catch (err) {
    log.warn('pin sentiment failed', describeError(err));
    return null;
  }
}

/**
 * Scores a pin that has a company, unless its stored score was read from the
 * text it has now. True when a new score was saved.
 */
export async function scorePin(pinId: number): Promise<boolean> {
  const context = await PinSentiment.context(pinId);
  if (!context || context.textHash === sentimentHash(context)) return false;
  const score = await scorePinText({ ...context, products: await PinSentiment.productsOf(context.companyId) });
  if (!score) return false;
  await PinSentiment.set(pinId, context, score.sentiment, score.product);
  return true;
}
