/**
 * How a scraped review feels about its product, -1 to 1, scored from the
 * review's title and quote, so a pin's sentiment graph (src/components/pin/
 * PinReviewSentiment.tsx) can plot the independent reviews kept beside its
 * rubric (PinReview in src/lib/pinReviews.ts) over their publication dates.
 */

import type Anthropic from '@anthropic-ai/sdk';
import log from '../util/log';
import { describeError, getClient, MODEL } from '.';

export const REVIEW_SENTIMENT_PROMPT = `You score how one independent product review feels about the product it reviews, from -1 to 1:
- 1: rave - best in class, a must-buy
- 0.5: favourable, with minor caveats
- 0: balanced or neutral - strengths and weaknesses cancel out, or no verdict
- -0.5: unfavourable, with some redeeming points
- -1: scathing - avoid it

Judge the reviewer's verdict on the product itself, from the title and the quoted extract. Read sarcasm for what it means. Ignore price news, release dates and anything that is not the reviewer's opinion.`;

const SCHEMA = {
  type: 'object',
  properties: { sentiment: { type: 'number', description: 'From -1 (scathing) to 1 (rave)' } },
  required: ['sentiment'],
  additionalProperties: false,
};

export type ReviewSentimentInput = { pinTitle: string; title: string | null; quote: string };

// The score rounded to two places, or null with no API key, a failed or
// declined call - an unscored review just sits out of the graph until the
// backfill (npm run reviews:sentiment) picks it up.
export async function scoreReviewSentiment(input: ReviewSentimentInput): Promise<number | null> {
  const anthropic = getClient();
  if (!anthropic) return null;
  try {
    const response = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: REVIEW_SENTIMENT_PROMPT,
      messages: [{ role: 'user', content: JSON.stringify({ product: input.pinTitle, reviewTitle: input.title, quote: input.quote }, null, 2) }],
    });
    if (response.stop_reason === 'refusal') {
      log.warn('review sentiment refused', log.stringify(response.stop_details));
      return null;
    }
    const block = response.content.find((c): c is Anthropic.Beta.BetaTextBlock => c.type === 'text');
    if (!block) return null;
    const { sentiment } = JSON.parse(block.text) as { sentiment: number };
    if (typeof sentiment !== 'number' || !Number.isFinite(sentiment)) return null;
    return Math.round(Math.min(1, Math.max(-1, sentiment)) * 100) / 100;
  } catch (err) {
    log.warn('review sentiment failed', describeError(err));
    return null;
  }
}
