import type { PinJson, PinReferenceJson } from './types';

// A reference counts half as much for every HALF_LIFE_DAYS it is older than
// the pin's newest reference. Measured from the newest reference rather than
// today, so a pin's confidence only changes when its references do.
export const HALF_LIFE_DAYS = 180;

const DAY_MS = 24 * 60 * 60 * 1000;

// How far a pin's own source supports it, read from the date confidence its
// source was rated with. A source with no rating is listed but not scored.
export const SOURCE_CONFIDENCE: Record<string, number> = {
  confirmed: 90,
  scheduled: 75,
  estimated: 50,
  delayed: 40,
  unknown: 25,
};

// A reference, or the pin's source standing in as one.
export type Evidence = Omit<PinReferenceJson, 'confidence'> & { confidence?: number; isSource?: boolean };

type Weighable = Pick<Evidence, 'confidence' | 'publishedDate' | 'utcCreatedDateTime'>;

// Everything backing a pin: its source first (dated when the pin was posted),
// then its references. The source is left out when a reference repeats it.
export function pinEvidence(
  pin: Pick<PinJson, 'sourceUrl' | 'dateConfidence' | 'utcCreatedDateTime' | 'references'>,
): Evidence[] {
  const references: Evidence[] = pin.references || [];
  const sourceUrl = pin.sourceUrl?.trim();
  if (!sourceUrl || references.some((r) => r.url === sourceUrl)) {
    return references;
  }
  const source: Evidence = {
    url: sourceUrl,
    isSource: true,
    confidence: SOURCE_CONFIDENCE[(pin.dateConfidence || '').toLowerCase()],
    utcCreatedDateTime: pin.utcCreatedDateTime,
  };
  return [source, ...references];
}

// When the reference was published, or failing that when it was added.
export function referenceTime(reference: Pick<Weighable, 'publishedDate' | 'utcCreatedDateTime'>): number | undefined {
  const value = reference.publishedDate || reference.utcCreatedDateTime;
  const time = value ? new Date(value).getTime() : NaN;
  return isNaN(time) ? undefined : time;
}

// Each scored reference with its recency weight and its share (0-1) of the
// overall confidence. Undated references weigh as much as the newest.
export function weighReferences<T extends Weighable>(references: T[] | undefined) {
  const scored = (references || []).filter((r) => r.confidence != null && Number.isFinite(Number(r.confidence)));
  const times = scored.map(referenceTime);
  const known = times.filter((t): t is number => t !== undefined);
  const newest = known.length ? Math.max(...known) : 0;
  const weights = times.map((time) => Math.pow(0.5, (time === undefined ? 0 : (newest - time) / DAY_MS) / HALF_LIFE_DAYS));
  const total = weights.reduce((sum, w) => sum + w, 0);
  return scored.map((reference, i) => ({ reference, time: times[i], weight: weights[i], share: weights[i] / total }));
}

// The overall confidence (0-100): the references' confidence averaged,
// weighted toward the most recent. Undefined when no reference has a confidence.
export function pinConfidence<T extends Weighable>(references: T[] | undefined): number | undefined {
  const weighed = weighReferences(references);
  if (!weighed.length) {
    return undefined;
  }
  return Math.round(weighed.reduce((sum, { reference, share }) => sum + Number(reference.confidence) * share, 0));
}
