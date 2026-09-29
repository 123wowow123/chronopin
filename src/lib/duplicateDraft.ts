// What happens to a pin someone was about to post when it turns out the event
// is already pinned: its link (and the references it found) can go onto the
// existing pin instead.

import { urlKey } from './citations';
import { formToReferences, type PinFormValues } from './pinForm';
import { SOURCE_CONFIDENCE } from './referenceConfidence';
import type { PinReferenceJson } from './types';

// The most references one request may add to someone's pin.
export const MAX_ADDED_REFERENCES = 10;

// The longest note on what an existing pin is missing (AiFeedback.feedback).
export const AI_FEEDBACK_MAX = 2000;

// The draft's source link as a reference, rated the way the source of a pin is
// (its date confidence, "unknown" when unrated) and carrying the dates the
// draft gives in the author's calendar, followed by the draft's own references.
export function draftAsReferences(values: PinFormValues): PinReferenceJson[] {
  const url = values.sourceUrl.trim();
  const source: PinReferenceJson[] = /^https?:\/\//i.test(url)
    ? [
        {
          url,
          title: values.title.trim().slice(0, 1024) || undefined,
          confidence: SOURCE_CONFIDENCE[values.dateConfidence.toLowerCase()] ?? SOURCE_CONFIDENCE.unknown,
          startDate: values.startDate || undefined,
          endDate: values.startDate && values.endDate > values.startDate ? values.endDate : undefined,
          reasoning: values.dateConfidenceReasoning.trim().slice(0, 2000) || undefined,
        },
      ]
    : [];
  return [...source, ...formToReferences(values).map(({ id: _id, utcCreatedDateTime: _added, ...r }) => r)];
}

// The candidates a pin does not already have: not its source, not one of its
// references, one per page, in the order given.
export function referencesToAdd<R extends Pick<PinReferenceJson, 'url'>>(
  pin: { sourceUrl?: string | null; references?: Pick<PinReferenceJson, 'url'>[] },
  candidates: R[],
): R[] {
  const taken = new Set([pin.sourceUrl ?? '', ...(pin.references ?? []).map((r) => r.url)].map(urlKey).filter(Boolean));
  const fresh: R[] = [];
  for (const candidate of candidates) {
    const key = urlKey(candidate.url);
    if (!key || taken.has(key)) continue;
    taken.add(key);
    fresh.push(candidate);
  }
  return fresh;
}
