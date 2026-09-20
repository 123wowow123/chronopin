// Which of a busy day's cards the timeline shows before "View all": a
// weighted random pick, so a crowded day stays two rows tall and every pin
// gets its turn. A pin weighs what its card earns for being shown: opens and
// watches over times seen on the timeline, so one shown often and passed over
// makes room, and one people open or watch keeps its place. A pin whose links
// cite prediction markets also weighs the money traded on them. For a signed-in
// viewer it can weigh more still by their own preference wiki (userWiki.ts).

// Two rows: two columns from sm up, one column on phones.
export const BAG_LIMIT = 4;
export const BAG_LIMIT_PHONE = 2;

type Sampled = { id: number; viewCount?: number; favoriteCount?: number; impressionCount?: number; marketVolume?: number | null };

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

// Opens and watches per time seen, with the prior mixed in, times what the
// markets it cites are trading.
export function bagWeight(pin: Sampled): number {
  const earned = Math.max(0, pin.viewCount ?? 0) + WATCH_WEIGHT * Math.max(0, pin.favoriteCount ?? 0);
  return ((earned + PRIOR_OPENS) / (Math.max(0, pin.impressionCount ?? 0) + PRIOR_IMPRESSIONS)) * volumeWeight(pin.marketVolume);
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
