/**
 * Whether a podcast episode backs up a pin's event, read by Claude from the
 * episode's show notes and the transcript passages that mention the event
 * (src/server/services/podcastReferences.ts finds both).
 *
 * One small structured-output call per candidate episode, with no web search:
 * everything it may judge by is in the prompt.
 */

import type Anthropic from '@anthropic-ai/sdk';
import { describeError, getClient, MODEL } from '.';

const SYSTEM_PROMPT = `You check whether one podcast episode backs up an event pin. You get the pin (title, description, dates) and the episode (show, title, release date, show notes, and passages from its transcript that mention the event). Decide from those alone whether the episode is about this same event, and how strongly it supports the event happening on the pin's date.

Rate confidence 0-100:
- 90-100: an official or primary voice in the episode (the organization itself, a named participant) states the event and its date as firm.
- 75-89: a news or trade show reports the event on the same date as scheduled or confirmed, or reports it happening as it happened.
- 50-74: the event is discussed but the date is an estimate, a window, differs, or is not said.
- below 50: only a passing mention, speculation, a different event, or contradicting.

Then weigh the show: a little-known or hobbyist show, or one that only reads out other coverage, sits at least 15 points below what the same words would earn on an established news outlet's show, and never above 74. Say in the reasoning when that pulled it down.

reasoning is one or two sentences grounded in what the episode itself says - quote its key phrase where you can and name the show ("CNN 10 says the bridge opened to traffic on Sunday"). Resolve "today", "yesterday" or "on Sunday" against the release date only when that is unambiguous.`;

const SCHEMA = {
  type: 'object',
  properties: {
    sameEvent: { type: 'boolean', description: 'Whether the episode is about the pin\'s event.' },
    confidence: { type: 'integer', description: 'How strongly the episode supports the event on its date, 0-100.' },
    reasoning: { type: 'string' },
  },
  required: ['sameEvent', 'confidence', 'reasoning'],
  additionalProperties: false,
};

export type EpisodeVerdict = { sameEvent: boolean; confidence: number; reasoning: string };

export type EpisodeEvidence = {
  pin: { title: string; description?: string | null; start: string; end?: string | null };
  episode: { show: string; title: string; releaseDate?: string; description?: string };
  passages: string[];
};

// Thrown when the model could not be asked at all (no key, no credit, an
// outage), so the caller can fall back to its own check.
export class JudgeUnavailable extends Error {}

export async function judgeEpisode(evidence: EpisodeEvidence): Promise<EpisodeVerdict | null> {
  const anthropic = getClient();
  if (!anthropic) throw new JudgeUnavailable('no Anthropic key');
  let response: Anthropic.Beta.BetaMessage;
  try {
    response = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: JSON.stringify(evidence, null, 2) }],
    });
  } catch (err) {
    throw new JudgeUnavailable(describeError(err));
  }
  if (response.stop_reason === 'refusal') return null;
  const block = response.content.find((c): c is Anthropic.Beta.BetaTextBlock => c.type === 'text');
  if (!block) return null;
  const verdict = JSON.parse(block.text) as EpisodeVerdict;
  return {
    sameEvent: !!verdict.sameEvent,
    confidence: Math.round(Math.min(100, Math.max(0, Number(verdict.confidence) || 0))),
    reasoning: String(verdict.reasoning || '').slice(0, 2000),
  };
}
