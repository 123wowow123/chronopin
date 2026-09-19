/**
 * A second opinion on a suggested duplicate pair. The suggestion itself is
 * cheap and loose (a close title, or the same source link, within a day), and
 * titles alone cannot tell one event from its neighbours: the iPhone 18 Pro
 * and Pro Max launch together and scored 0.81. References can, when read as
 * evidence: what each page is about, the dates it gives, and whether both pins
 * lean on pages about the same single thing.
 *
 * One call with structured output, no web tools: the references' titles,
 * dates and reasoning were written from the pages when they were found, and
 * the shared links are worked out here rather than left to the model.
 */

import type Anthropic from '@anthropic-ai/sdk';
import { urlKey } from '@/lib/citations';
import { DUPLICATE_VERDICTS, type DuplicateVerdict } from '../model/pinDuplicate';
import log from '../util/log';
import { describeError, getClient, MODEL } from '.';

// Enough of a description to say what the pin is; the rest is detail.
const MAX_DESCRIPTION_CHARS = 1500;

export type EvidencePin = {
  id: number;
  title: string;
  description: string | null;
  utcStartDateTime: Date | string;
  utcEndDateTime: Date | string | null;
  allDay: boolean;
  address: string | null;
  company: string | null;
  categories: string[];
  sourceUrl: string | null;
  references: {
    url: string;
    title: string | null;
    confidence: number;
    publishedDate: string | null;
    startDate: string | null;
    endDate: string | null;
    reasoning: string | null;
  }[];
};

export type Verdict = { verdict: DuplicateVerdict; reasoning: string };

const SYSTEM_PROMPT = `You check whether two pins on an event timeline are duplicates: the same real-world event pinned twice, usually by different people. They were paired automatically because their titles are close or they share a source link, and both start within a day of each other, so being similar is a given. Your job is to tell whether they are the same single event.

Pins are the same event when they describe one occurrence: the same launch, opening, release, match, announcement or deadline, even if worded differently, pinned from different sources, or dated a day apart because one is all-day and one is timed.

Pins are different events when they are related but distinct: separate products or models announced together, different editions, phases, stages or legs of one programme, the same venue or organisation doing two things, or an event and a follow-up about it (a preview, a review, a delay, a result).

Use each pin's references as evidence, alongside the titles and descriptions. A reference page's title says what that page is about, and its dates and reasoning say what it claims. Links both pins share are strong evidence when the page is specifically about one event, and weak when it is broad (a company's store or product-line page, a general Wikipedia article on a programme or series, a news homepage). References that name different products, editions or dates point to different events. Pins with no shared links can still be the same event when their references describe the same thing.

Answer same, different, or unsure. Say unsure when the evidence genuinely does not settle it, not to hedge a call it does support. reasoning is one or two sentences for the person deciding the pair, naming the evidence that settled it ("Both cite Apple's newsroom post, but one pin is the Pro and the other the Pro Max, which Apple sells as separate models").`;

const SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: [...DUPLICATE_VERDICTS] },
    reasoning: { type: 'string' },
  },
  required: ['verdict', 'reasoning'],
  additionalProperties: false,
};

const iso = (value: Date | string | null) => (value == null ? null : new Date(value).toISOString());

// What the model reads about one pin.
function describePin(label: string, pin: EvidencePin) {
  return {
    pin: label,
    title: pin.title,
    description: pin.description ? pin.description.slice(0, MAX_DESCRIPTION_CHARS) : null,
    start: iso(pin.utcStartDateTime),
    end: iso(pin.utcEndDateTime),
    allDay: pin.allDay,
    place: pin.address,
    company: pin.company,
    categories: pin.categories,
    sourceUrl: pin.sourceUrl,
    references: pin.references.map((r) => ({
      url: r.url,
      title: r.title,
      confidence: r.confidence,
      publishedDate: r.publishedDate,
      startDate: r.startDate,
      endDate: r.endDate,
      reasoning: r.reasoning,
    })),
  };
}

// Links (source or reference) that appear on both pins, compared as the
// references panel compares them.
export function sharedLinks(a: EvidencePin, b: EvidencePin): string[] {
  const links = (pin: EvidencePin) => [pin.sourceUrl, ...pin.references.map((r) => r.url)].filter((url): url is string => !!url);
  const keys = new Set(links(b).map(urlKey).filter(Boolean));
  const shared = new Map<string, string>();
  for (const url of links(a)) {
    const key = urlKey(url);
    if (key && keys.has(key) && !shared.has(key)) {
      shared.set(key, url);
    }
  }
  return [...shared.values()];
}

/**
 * Resolves to the verdict on two pins, or to null when there is no API key or
 * the call failed or was declined - a pair without a verdict is simply left
 * for people to judge as before.
 */
export async function verifyDuplicatePair(a: EvidencePin, b: EvidencePin): Promise<Verdict | null> {
  const anthropic = getClient();
  if (!anthropic) return null;

  const input = { pins: [describePin('A', a), describePin('B', b)], sharedLinks: sharedLinks(a, b) };
  try {
    const response = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      // A policy decline on Opus 5 is retried server-side on a fallback model.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM_PROMPT,
      output_config: { format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content: `Are these two pins the same event?\n\n${JSON.stringify(input, null, 2)}` }],
    });

    if (response.stop_reason === 'refusal') {
      log.warn(`duplicate verdict refused for pins ${a.id}/${b.id}`, log.stringify(response.stop_details));
      return null;
    }
    const block = response.content.find((c): c is Anthropic.Beta.BetaTextBlock => c.type === 'text');
    if (!block) return null;
    const parsed = JSON.parse(block.text) as Verdict;
    return DUPLICATE_VERDICTS.includes(parsed.verdict) && parsed.reasoning?.trim() ? { verdict: parsed.verdict, reasoning: parsed.reasoning.trim() } : null;
  } catch (err) {
    log.warn(`duplicate verdict failed for pins ${a.id}/${b.id}`, describeError(err));
    return null;
  }
}
