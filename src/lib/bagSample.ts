import { pinConfidence, pinEvidence, TIMELINE_MIN_CONFIDENCE } from './referenceConfidence';
import type { PinJson } from './types';

// Which of a busy day's cards the timeline shows before "View all": a
// weighted random pick, so a crowded day stays two rows tall and every pin
// gets its turn. A pin weighs what its card earns for being shown: opens and
// watches over times seen on the timeline, so one shown often and passed over
// makes room, and one people open or watch keeps its place. A pin whose links
// cite prediction markets also weighs the money traded on them, and one whose
// sources back it well weighs more than one barely evidenced - further still
// when the thread it belongs to is well evidenced too. For a signed-in viewer
// it can weigh more still by their own preference wiki (userWiki.ts).

// Two rows, however wide the window: one column on a phone, two from sm, and
// another from a 1664px window and for about every 400px past it, to six (TimeBlock's
// WIDE_COLUMNS, which holds the widths). A day is always picked for the widest
// of those, and the cards a narrower window has no column for are hidden
// rather than left out of the pick, so widening the window only ever adds
// cards to a day - none of the ones already there move.
export const BAG_LIMIT = 4;
export const BAG_LIMIT_PHONE = 2;

// What the weight reads. The evidence fields are the ones pinEvidence needs,
// all of which a card already carries, so a pin's confidence is worked out
// here rather than sent: the server and the hydrating client compute the same
// number from the same row. threadConfidence cannot be - the rest of a thread
// is rarely on the page - so the timeline query sends it (model/pins.ts).
type Sampled = Partial<Pick<PinJson, 'sourceUrl' | 'dateConfidence' | 'utcCreatedDateTime' | 'references'>> & {
  id: number;
  viewCount?: number;
  favoriteCount?: number;
  impressionCount?: number;
  marketVolume?: number | null;
  threadConfidence?: number | null;
};

// A watch says more than an open.
const WATCH_WEIGHT = 3;
// Until it has been seen, a pin is taken to be opened one time in ten: a new
// pin starts level with a well-liked one, and a handful of impressions either
// way cannot swing it far.
const PRIOR_OPENS = 1;
const PRIOR_IMPRESSIONS = 10;

// Money on the question is a second vote, from people who are not here: a pin
// citing prediction markets (Pin.marketVolume, schema 0053) weighs more for
// the dollars traded on them. A quiet market says nothing, so the boost only
// starts at FLOOR, and from there every tenfold counts for half again - $100k
// x1.5, $1M x2, $10M and up x2.5 - which lifts a busy market's pin over an
// unseen one without letting it own the day.
const VOLUME_FLOOR = 10_000;
const VOLUME_PER_DECADE = 0.5;
const VOLUME_MAX = 2.5;

export function volumeWeight(marketVolume: number | null | undefined): number {
  if (!marketVolume || marketVolume <= VOLUME_FLOOR) return 1;
  return Math.min(VOLUME_MAX, 1 + Math.log10(marketVolume / VOLUME_FLOOR) * VOLUME_PER_DECADE);
}

// How well the pin's own sources back it (referenceConfidence.ts). The home
// timeline already hides anything under TIMELINE_MIN_CONFIDENCE, so the band
// a reader actually sees is 70-100 and the curve is drawn across exactly that:
// 70 weighs 1, 100 weighs CONFIDENCE_MAX. Below the threshold - a viewer can
// turn the filter off, and the day popup and search never applied it - it
// keeps falling on the same slope to a floor rather than off a cliff, because
// a thinly sourced pin should be rarer on a crowded day, not absent from it.
//
// An unscored pin weighs 1, neither helped nor buried: "pins with no score at
// all still show" is the rule the filter already keeps, and most of them are
// unscored for want of a reference rather than for want of truth.
const CONFIDENCE_MAX = 1.6;
const CONFIDENCE_FLOOR = 0.5;

export function confidenceWeight(confidence: number | null | undefined): number {
  if (confidence == null || !Number.isFinite(confidence)) return 1;
  const gain = (CONFIDENCE_MAX - 1) / (100 - TIMELINE_MIN_CONFIDENCE);
  return Math.max(CONFIDENCE_FLOOR, 1 + (confidence - TIMELINE_MIN_CONFIDENCE) * gain);
}

// The pins around it in its thread, scored the same way and counted at a
// third of the strength. A chain corroborates a pin without being its own
// evidence - a well-sourced launch schedule says something about each launch
// in it - so it nudges rather than decides: a perfect thread is worth x1.2
// where the pin's own perfect sources are worth x1.6. Null for a pin in no
// thread, and for a thread whose other pins are all unscored.
const THREAD_SHARE = 1 / 3;

export function threadWeight(threadConfidence: number | null | undefined): number {
  if (threadConfidence == null || !Number.isFinite(threadConfidence)) return 1;
  return 1 + (confidenceWeight(threadConfidence) - 1) * THREAD_SHARE;
}

// Opens and watches per time seen, with the prior mixed in, times what the
// markets it cites are trading, times how well it and its thread are sourced.
export function bagWeight(pin: Sampled): number {
  const earned = Math.max(0, pin.viewCount ?? 0) + WATCH_WEIGHT * Math.max(0, pin.favoriteCount ?? 0);
  const seen = (earned + PRIOR_OPENS) / (Math.max(0, pin.impressionCount ?? 0) + PRIOR_IMPRESSIONS);
  return seen * volumeWeight(pin.marketVolume) * confidenceWeight(pinConfidence(pinEvidence(pin))) * threadWeight(pin.threadConfidence);
}

// FNV-1a, folded into (0, 1).
function unitHash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) + 1) / 4294967297;
}

// Up to `limit` ids, the pick's best first. Weighted sampling without
// replacement (Efraimidis-Spirakis: key = u^(1/w), largest keys win), with u
// hashed from the seed and the pin rather than Math.random: the server and the
// hydrating client pick the same cards, and a pin arriving later displaces at
// most one of them instead of reshuffling the day. `keepId`, when here, is
// always picked first (the pin the timeline opened on). `boost`, when here,
// multiplies each pin's weight (the viewer's preference).
export function sampleBag<T extends Sampled>(pins: T[], limit: number, seed: string, keepId?: number | null, boost?: (pin: T) => number): number[] {
  const keyed = pins.map((p) => ({ id: p.id, key: Math.log(unitHash(`${seed}:${p.id}`)) / (bagWeight(p) * (boost?.(p) ?? 1)) }));
  keyed.sort((a, b) => (a.id === keepId ? -1 : b.id === keepId ? 1 : b.key - a.key || a.id - b.id));
  return keyed.slice(0, limit).map((k) => k.id);
}
