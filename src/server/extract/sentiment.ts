/**
 * The tone of a comment, as a number from -1 to 1, so a pin's page can say how
 * people feel about it and which way that is moving (src/lib/commentMood.ts).
 *
 * One small call with structured output. The pin's title and, for a reply, the
 * comment it answers go in too: "Finally" under a bridge opening is glad, and
 * "Same" can only be read against what it agrees with.
 */

import type Anthropic from '@anthropic-ai/sdk';
import Comment from '../model/comment';
import log from '../util/log';
import { describeError, getClient, MODEL } from '.';

export const COMMENT_SENTIMENT_PROMPT = `You score the tone of one comment on an event timeline, where each pin is a real-world event (a launch, release, opening, match, deadline) and people comment on it.

Score how the commenter feels about the event or the discussion, from -1 to 1:
- 1: delighted, excited, grateful, strongly supportive
- 0.5: pleased, hopeful, approving
- 0: neutral - a question, a plain fact, a correction, a link, or feelings that genuinely cancel out
- -0.5: disappointed, sceptical, annoyed
- -1: angry, hostile, contemptuous

Read sarcasm and irony for what they mean, not what they say ("Great, another delay" is negative). Judge the commenter's feeling, not whether the event itself is good or bad news: "So sad he's gone, what a career" about a death is warm, not hostile. A reply's tone is its own, read in light of the comment it answers.`;

const SCHEMA = {
  type: 'object',
  properties: {
    sentiment: { type: 'number', description: 'From -1 (very negative) to 1 (very positive)' },
  },
  required: ['sentiment'],
  additionalProperties: false,
};

type SentimentInput = { text: string; pinTitle: string; parentText?: string | null };

/**
 * Resolves to the comment's score, rounded to two places, or to null when
 * there is no API key or the call failed or was declined - an unscored comment
 * just sits out of the mood until the backfill picks it up.
 */
export async function scoreSentiment(input: SentimentInput): Promise<number | null> {
  const anthropic = getClient();
  if (!anthropic) return null;

  const context = { pin: input.pinTitle, replyingTo: input.parentText ?? undefined, comment: input.text };
  try {
    const response = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      // A short read, not a hard problem.
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      // A policy decline on Opus 5 is retried server-side on a fallback model.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: COMMENT_SENTIMENT_PROMPT,
      messages: [{ role: 'user', content: JSON.stringify(context, null, 2) }],
    });

    if (response.stop_reason === 'refusal') {
      log.warn('comment sentiment refused', log.stringify(response.stop_details));
      return null;
    }
    const block = response.content.find((c): c is Anthropic.Beta.BetaTextBlock => c.type === 'text');
    if (!block) return null;
    const { sentiment } = JSON.parse(block.text) as { sentiment: number };
    if (typeof sentiment !== 'number' || !Number.isFinite(sentiment)) return null;
    return Math.round(Math.min(1, Math.max(-1, sentiment)) * 100) / 100;
  } catch (err) {
    log.warn('comment sentiment failed', describeError(err));
    return null;
  }
}

/**
 * Scores a stored comment and saves the score. Resolves to the pin id when a
 * score was saved (so the caller can refresh that pin's page), otherwise null.
 */
export async function scoreComment(commentId: number): Promise<number | null> {
  const context = await Comment.sentimentContext(commentId);
  if (!context) return null;
  const sentiment = await scoreSentiment(context);
  if (sentiment == null) return null;
  return (await Comment.setSentiment(commentId, context.text, sentiment)) ? context.pinId : null;
}
