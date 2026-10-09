/**
 * One extra model call for a pin whose date neither the source page nor any
 * reference states outright (owner, 2026-09-30: "extra model call is fine").
 * It reads the source text and every reference the scrape found - their
 * titles, publication dates and reasoning - and estimates the day from the
 * evidence: a stated window, a schedule or calendar, the cadence of earlier
 * occurrences, how long comparable things run. Returns null when there is no
 * basis, so an undatable pin stays undated rather than getting a guess.
 *
 * No web search here: it works from what the scrape already gathered, so it
 * is one short call, and a URL it might cite must be one it was given.
 */

import type Anthropic from '@anthropic-ai/sdk';
import log from '../util/log';
import { describeError, getClient, MODEL, withNote } from '.';
import type { FoundReference } from './references';
import { PREDICTION_DATE_RULE } from './systemPrompt';

const MAX_SOURCE_CHARS = 20000;

export type DateEstimate = {
  startDateTime: string | null;
  endDateTime: string | null;
  allDay: boolean;
  basis: string;
};

export const ESTIMATE_SCHEMA = {
  type: 'object',
  properties: {
    startDateTime: { type: ['string', 'null'], description: 'When the event itself happens, ISO 8601 UTC ("2027-04-27T00:00:00Z"). Null when the evidence gives no basis for a day.' },
    endDateTime: { type: ['string', 'null'], description: 'The exclusive end (00:00Z of the day after the last day) for a span; null for a single moment.' },
    allDay: { type: 'boolean', description: 'True when no clock time is known, so the start is 00:00Z of the day.' },
    basis: { type: 'string', description: 'One or two sentences naming the evidence the estimate rests on (which sources, what they say, any cadence or schedule), and which parts are unconfirmed. Empty when startDateTime is null.' },
  },
  required: ['startDateTime', 'endDateTime', 'allDay', 'basis'],
  additionalProperties: false,
};

export const SYSTEM_PROMPT = `You estimate the date of an event for a pin on a timeline when no page states it outright. You are given the source the pin was made from and the references found for it (each with its title, publication date and what it says). Work out the single event the pin is about, then estimate the day it happens, or its span, from ALL of the evidence together:
- A window a source or reference states ("in Q1 2027", "spring 2027", "by end of year") is dated by its end: a year alone is 31 December, a quarter or season its last day, a month its last day - unless the wording says the event runs from that period, which takes its first day.
- ${PREDICTION_DATE_RULE}
- A schedule, calendar or cadence: the gap between earlier occurrences, the usual weekday and season, an agency's standing rhythm (e.g. a committee that meets at least every three months), how long comparable things take.
- Firmer sources outrank looser ones: an official calendar or filing over a news article's "later this year".
- A publication date is not the event's date; it only bounds it (an event reported as upcoming is after it; one reported as done is before it).
The current date is given. Do not date an event that already happened in the future or an upcoming one in the past unless the evidence says so. When the evidence gives no basis for a day, return null for startDateTime and an empty basis - a guess is worse than no date. Report only what the material supports; never invent a source or a fact, and do not use knowledge of the event beyond the material except for a well-known recurring schedule you are sure of, which you must say in the basis.`;

const dayOf = (iso: string | null | undefined) => (iso ? new Date(iso) : null);

// Validates the model's answer: a real start date, an end no earlier than it,
// and a basis that says what it rests on. Anything else is no estimate.
export function parseEstimate(answer: Partial<DateEstimate> | null | undefined): { start: Date; end?: Date; allDay: boolean; reasoning: string } | null {
  const start = dayOf(answer?.startDateTime);
  const basis = (answer?.basis || '').trim();
  if (!start || Number.isNaN(start.getTime()) || !basis) return null;
  let end = dayOf(answer?.endDateTime) ?? undefined;
  if (end && (Number.isNaN(end.getTime()) || end.getTime() <= start.getTime())) end = undefined;
  return { start, end, allDay: !!answer?.allDay, reasoning: /^estimated:/i.test(basis) ? basis : `Estimated: ${basis}` };
}

export function estimateInput({ pageUrl, pageText, references, today, note }: { pageUrl: string; pageText: string; references: FoundReference[]; today: string; note?: string }) {
  const refs = references
    .map((r, i) => `[${i + 1}] ${r.url}\n  title: ${r.title || '-'}\n  published: ${r.publishedDate || 'unknown'}; confidence ${r.confidence}${r.startDate ? `; its page dates the event ${r.startDate}${r.endDate ? ` to ${r.endDate}` : ''}` : ''}\n  ${r.reasoning || ''}`)
    .join('\n');
  return withNote(`Today: ${today}\n\nSource URL: ${pageUrl}\n\nSource text:\n\n${(pageText || '').trim().slice(0, MAX_SOURCE_CHARS)}\n\nReferences:\n${refs || '(none)'}`, note);
}

// The call as a task a Claude Code session can answer by hand.
export function estimateTask(input: Parameters<typeof estimateInput>[0]) {
  return { stage: 'estimateDate' as const, system: SYSTEM_PROMPT, schema: ESTIMATE_SCHEMA, input: estimateInput(input) };
}

// Null with no API key, no usable evidence, a refusal, a failed call or an
// answer with no basis: the pin stays undated and the scrape carries on.
export async function estimateDate(input: Parameters<typeof estimateInput>[0]): Promise<ReturnType<typeof parseEstimate>> {
  const anthropic = getClient();
  if (!anthropic) return null;
  if ((input.pageText || '').trim().length < 200 && !input.references.length) return null;
  try {
    const response = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      thinking: { type: 'adaptive' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM_PROMPT,
      output_config: { format: { type: 'json_schema', schema: ESTIMATE_SCHEMA } },
      messages: [{ role: 'user', content: estimateInput(input) }],
    });
    if (response.stop_reason === 'refusal') {
      log.warn('estimate date refused', log.stringify(response.stop_details));
      return null;
    }
    const block = response.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text');
    return block ? parseEstimate(JSON.parse(block.text) as DateEstimate) : null;
  } catch (err) {
    log.warn('estimate date failed', describeError(err));
    return null;
  }
}
