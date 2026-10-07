// Ad blocks: which Amazon Associates ads a slot shows, and where their links go.
// Pure, so the picking is the same in tests as on the server (src/server/model/ad.ts).
//
// Program ads (the "Ad" table, 0110) are Amazon's Special Program Commissions,
// Bonus Events and Trade-In, preferred over product ads (the Amazon listings
// on pins). Each kind is a pool with a fixed share of the picks, however many
// ads it holds, so a hundred product listings do not crowd out eight
// programs; inside a pool an ad's own weight decides. On top of that an ad
// weighs more for a viewer whose preference wiki leans to its categories or
// company, whose age is in its target range, and - in a pin page's slots -
// for being related to the pin. Two more factors ride on top, each kept
// small on purpose: the program's own bounty (rewardWeight, a richer payout
// nudges its odds) and how well it has actually converted in that specific
// slot (performanceWeight, a Bayesian shrinkage to the slot's own average
// click rate - the same ad can out- or under-perform in the timeline versus
// a pin page, so this is tracked and weighed per slot, not globally).

import type { UserPreference } from './userWiki';
import { affiliateUrl, amazonAssociateTag, ebayCampaignId, isEbayUrl } from './affiliate';
import { asinOf, sameBrand, sameProductFamily } from './adQuality';
import { AD_TIERS, type AdTier } from './culturalDays';
import { isCategory } from './categories';

// 'watch' ads (0130) are not Amazon's: the pre-owned luxury watches of one
// brand on eBay, which earns through the EPN campaign (affiliate.ts).
export type AdKind = 'special' | 'bonus' | 'tradein' | 'product' | 'watch' | 'sneaker';

// Each kind's share of the picks, before relatedness and preference.
// A watch pool is small, so on the timeline it only comes up now and then;
// on a Watches pin's page its ads are related (shared tag) and come first.
export const KIND_SHARE: Record<AdKind, number> = { special: 4, bonus: 2, tradein: 2, product: 2, watch: 1, sneaker: 1 };

// The watch brands advertised (Ad.program is `watch_<key>`), by the name the
// ad shows. Owner, 2026-10-05: "add ads for rolex and other desirable watches".
export const WATCH_BRANDS: Record<string, string> = {
  watch_rolex: 'Rolex',
  watch_omega: 'Omega',
  watch_patek: 'Patek Philippe',
  watch_ap: 'Audemars Piguet',
  watch_cartier: 'Cartier',
  watch_tudor: 'Tudor',
  watch_breitling: 'Breitling',
  watch_tag: 'TAG Heuer',
  watch_iwc: 'IWC',
  watch_gs: 'Grand Seiko',
};

export const watchBrand = (program: string | null | undefined): string | null => (program && WATCH_BRANDS[program]) || null;

// eBay sneaker searches, with model names rather than invented listing facts.
export const SNEAKER_ADS: Record<string, { title: string; brand: string }> = {
  sneaker_af1: { title: 'Nike Air Force 1', brand: 'Nike' },
  sneaker_dunk: { title: 'Nike Dunk', brand: 'Nike' },
  sneaker_jordan: { title: 'Air Jordan', brand: 'Nike' },
  sneaker_samba: { title: 'adidas Samba', brand: 'adidas' },
  sneaker_nb: { title: 'New Balance 990', brand: 'New Balance' },
  sneaker_asics: { title: 'ASICS GEL-Kayano', brand: 'ASICS' },
};

export const sneakerAd = (program: string | null | undefined) => (program && SNEAKER_ADS[program]) || null;

const FOOTWEAR_TAGS = new Set(['sneakers', 'sneaker', 'shoes', 'shoe', 'footwear']);
const hasFootwear = (names: string[]) => names.some((name) => FOOTWEAR_TAGS.has(name.trim().toLowerCase()));

export const AD_SLOTS = ['timeline-row', 'timeline-side', 'pin-strip', 'pin-side', 'drawer'] as const;
export type AdSlot = (typeof AD_SLOTS)[number];
// How many ads a slot asks for at most: what it shows at its widest. The
// timeline's side panel stops at five however tall the window is; a pin's
// side column runs taller, so it stops at seven.
export const SLOT_COUNT: Record<AdSlot, number> = { 'timeline-row': 7, 'timeline-side': 5, 'pin-strip': 2, 'pin-side': 7, drawer: 5 };
// Reserve one seasonal tile, leaving room for other categories in every block.
export const HOLIDAY_COUNT: Record<AdSlot, number> = { 'timeline-row': 1, 'timeline-side': 1, 'pin-strip': 1, 'pin-side': 1, drawer: 1 };
// Slots on a pin's page, whose ads are its related ones first.
export const PIN_SLOTS: readonly AdSlot[] = ['pin-strip', 'pin-side'];

export function isAdSlot(value: unknown): value is AdSlot {
  return typeof value === 'string' && (AD_SLOTS as readonly string[]).includes(value);
}

// One ad that could be shown.
export type AdCandidate = {
  key: string;
  kind: AdKind;
  // The program's message key (ads.programs.<program>), for a program ad.
  program: string | null;
  // The listing, untagged; the tag is added for the store when served.
  url: string;
  store: string;
  // A holiday ad (HolidayAd, 0121): the catalog holiday it is for and its
  // price tier. These are picked by pickHolidayAds, never by pickAds.
  holiday?: string | null;
  tier?: AdTier | null;
  // The product's own picture on Amazon's image host.
  imageUrl?: string | null;
  categories: string[];
  company: string | null;
  weight: number;
  // What a conversion on this program is worth, from the account's own rate
  // card (null for a product ad, and for a percentage program like Trade-In
  // whose payout depends on what is traded in, not a flat bounty).
  rewardUsd: number | null;
  minAge: number;
  targetAgeFrom: number | null;
  targetAgeTo: number | null;
  // A product ad's pin and what it shows.
  pinId: number | null;
  // The pin a chosen ad (PinAd, 0112) was picked for: first in that pin's
  // slots, and not hidden there like a pin's own listing is.
  forPinId: number | null;
  title: string | null;
  // The title is the pin's own (a listing whose pin names no product), so it
  // reads in the viewer's language through the pin's translation.
  titleFromPin?: boolean;
  price: number | null;
  // The listing's own brand as last read, shown in place of the company
  // (which stays what pins are matched on).
  brand?: string | null;
  // A listing's stars out of 5, as last read, for the one line about the product.
  rating?: number | null;
  // How many reviews those stars come from.
  reviewCount?: number | null;
  // What its page last said to hurry a buyer ("left:12", "low:90"), if anything.
  urgency?: string | null;
  thumbName: string | null;
  originalUrl: string | null;
};

// What a served ad carries to the browser.
export type AdJson = {
  key: string;
  kind: AdKind;
  program: string | null;
  url: string;
  title: string | null;
  price: number | null;
  currency: string | null;
  // The product's brand (a pin's company, or a chosen ad's) and stars out of 5,
  // shown beside the price as one line about it.
  brand?: string | null;
  rating?: number | null;
  // "left:12" or "low:90": the page's own reason to hurry, shown in place of
  // the brand and stars line (parseUrgency).
  urgency?: string | null;
  pinId: number | null;
  category: string | null;
  thumbName: string | null;
  originalUrl: string | null;
  // A holiday ad's picture, and the holiday's name in the viewer's language.
  imageUrl?: string | null;
  holiday?: string | null;
  // The store the viewer was served from: it can differ from where the link
  // goes (a US product ad shown in the UK), and the admin stats count by it.
  store: string;
};

// Rows of the admin Ads page (src/server/model/ad.ts).
export type AdClickRow = {
  id: number;
  at: string;
  adKey: string;
  kind: AdKind;
  program: string | null;
  adPinId: number | null;
  adTitle: string | null;
  slot: string;
  pinId: number | null;
  pinTitle: string | null;
  // The page's path and query (0111); null for older clicks.
  page: string | null;
  store: string;
  // The tracking id the clicked link carried.
  tag: string | null;
  userId: number | null;
  userName: string | null;
  ip: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  thumbName?: string | null;
  originalUrl?: string | null;
};

export type AdImpressionRow = { day: string; adKey: string; kind: AdKind; slot: string; store: string; tag: string; signedIn: boolean; count: number };

// A slot's own click-through history for one ad, over a trailing window
// (src/server/model/ad.ts).
export type AdPerformance = { impressions: number; clicks: number };

export type AdContext = {
  preference: UserPreference | null;
  // The viewer's age in whole years, when signed in with a birthday.
  age: number | null;
  // The pin whose page the slot is on.
  pin: { id: number; categories: string[]; tags: string[]; company: string | null; title?: string; day?: string | null } | null;
  // This slot's own recent performance, so an ad that actually gets clicked
  // more *here* shows more here, even where it does worse in other slots.
  // Undefined (not yet computed, or too little traffic to bother) leaves
  // every ad's performanceWeight at 1.
  performance?: { baselineCtr: number; byKey: Map<string, AdPerformance> };
};

// No ads at all, and nothing counted, for a signed-in viewer under this age.
export const MIN_AD_AGE = 13;
// A product ad needs no account of its own, so younger teens may see one.
export const PRODUCT_MIN_AGE = MIN_AD_AGE;
const AFFINITY_BOOST = 2;
const AGE_BOOST = 2;
const RELATED_CATEGORY_BOOST = 3;
const RELATED_COMPANY_BOOST = 4;
// A product chosen for this very pin outranks any merely related one; one
// whose brand is the pin's company (a Tamiya kit on a Tamiya pin) more so
// (owner, 2026-10-02: "the pin brand should influence the product").
const CHOSEN_FOR_PIN_BOOST = 12;
const CHOSEN_BRAND_BOOST = 8;

// A reward of this many dollars neither boosts nor discounts an ad; the
// richest programs ($40 Prime) and the thinnest ($1 Fresh) land at the clamp
// either side of it. Square-rooted and clamped tightly, so a bigger bounty
// nudges the pick toward it without letting dollars alone decide - "slightly
// more weight" (owner, 2026-10-02), on top of whatever performance and
// personal weight already say.
const REWARD_BASELINE_USD = 10;
const REWARD_WEIGHT_MIN = 0.75;
const REWARD_WEIGHT_MAX = 1.5;

// A product ad's standing with buyers: its stars and how many reviews they
// come from, so a well-reviewed product is picked more often than a thinly
// reviewed one. 4.3 stars and 1,000 reviews are neutral; every 0.5 star
// doubles or halves the stars' part (a quarter of a star is a factor of 1.4)
// and every tenfold in reviews moves the reviews' part by a third of a
// neutral. Each part is clamped so neither alone decides the pick. 1 where
// the stars are not known (a pin's own listing, a program).
const STAR_BASELINE = 4.3;
const STAR_WEIGHT_MIN = 0.5;
const STAR_WEIGHT_MAX = 2;
const REVIEWS_WEIGHT_MIN = 0.5;
const REVIEWS_WEIGHT_MAX = 1.6;

export function qualityWeight(ad: Pick<AdCandidate, 'rating' | 'reviewCount'>): number {
  if (!ad.rating) return 1;
  const stars = Math.min(STAR_WEIGHT_MAX, Math.max(STAR_WEIGHT_MIN, 2 ** ((ad.rating - STAR_BASELINE) * 2)));
  const reviews = Math.min(REVIEWS_WEIGHT_MAX, Math.max(REVIEWS_WEIGHT_MIN, Math.log10((ad.reviewCount ?? 0) + 10) / 3));
  return stars * reviews;
}

// How much more (or less) often an ad shows for how it has actually
// converted *in this slot*, relative to the slot's own average click
// rate - a Bayesian shrinkage to that average, weighted as if the baseline
// came from this many impressions of its own, so one lucky click on a
// freshly added ad or a lightly-trafficked slot cannot swing the result.
const PERFORMANCE_PRIOR_IMPRESSIONS = 200;
const PERFORMANCE_WEIGHT_MIN = 0.5;
const PERFORMANCE_WEIGHT_MAX = 2;

// A program's own payout nudges its weight: richer bounties earn a slightly
// better shot at being picked. 1 for a product ad or a percentage program
// (Trade-In) with no flat dollar figure to compare.
export function rewardWeight(ad: Pick<AdCandidate, 'rewardUsd'>): number {
  if (ad.rewardUsd == null || ad.rewardUsd <= 0) return 1;
  const lift = Math.sqrt(ad.rewardUsd / REWARD_BASELINE_USD);
  return Math.min(REWARD_WEIGHT_MAX, Math.max(REWARD_WEIGHT_MIN, lift));
}

// This slot's own history for the ad, shrunk toward the slot's average click
// rate. 1 when the slot has no performance data yet (baselineCtr 0).
export function performanceWeight(stats: AdPerformance | undefined, baselineCtr: number): number {
  if (!baselineCtr) return 1;
  const impressions = stats?.impressions ?? 0;
  const clicks = stats?.clicks ?? 0;
  const smoothedCtr = (clicks + PERFORMANCE_PRIOR_IMPRESSIONS * baselineCtr) / (impressions + PERFORMANCE_PRIOR_IMPRESSIONS);
  const lift = smoothedCtr / baselineCtr;
  return Math.min(PERFORMANCE_WEIGHT_MAX, Math.max(PERFORMANCE_WEIGHT_MIN, lift));
}

// Age in whole years on `now`'s UTC date, from a "YYYY-MM-DD" birthday.
export function ageOn(birthday: string | null | undefined, now = new Date()): number | null {
  const match = birthday ? /^(\d{4})-(\d{2})-(\d{2})/.exec(birthday) : null;
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  let age = now.getUTCFullYear() - y;
  if (now.getUTCMonth() + 1 < m || (now.getUTCMonth() + 1 === m && now.getUTCDate() < d)) age -= 1;
  return age >= 0 && age < 150 ? age : null;
}

const lower = (names: string[]) => names.map((n) => n.trim().toLowerCase());

// Equivalent catalog labels, shared by every pin topic and ad source.
const TOPIC_ALIASES: Record<string, string> = {
  sneaker: 'shoes', sneakers: 'shoes', shoe: 'shoes', footwear: 'shoes',
  watch: 'watches', smartwatch: 'watches', smartwatches: 'watches',
  book: 'literature', books: 'literature',
  game: 'gaming', games: 'gaming', 'video games': 'gaming',
  movies: 'movie', film: 'movie', films: 'movie', television: 'tv',
};
const topicName = (name: string) => TOPIC_ALIASES[name.trim().toLowerCase()] ?? name.trim().toLowerCase();
const EVENT_TAGS = new Set(['release', 'launch', 'announcement', 'debut', 'premiere', 'opening', 'update', 'delay']);

function sharedTopics(ad: AdCandidate, pin: NonNullable<AdContext['pin']>): number {
  const tags = new Set(pin.tags.filter((name) => !EVENT_TAGS.has(topicName(name))).map(topicName));
  // Catalog kinds identify what is actually sold even when the ad only
  // carries a broad Fashion or Electronics tag.
  const topics = new Set([...ad.categories.map(topicName), topicName(adCategory(ad))]);
  return [...topics].filter((name) => tags.has(name)).length;
}

// How related an ad is to the pin: shared categories or tags, and the same
// company. 0 when nothing is shared.
export function relatedness(ad: AdCandidate, pin: AdContext['pin']): number {
  if (!pin) return 0;
  const pinNames = new Set([...pin.categories, ...pin.tags].map(topicName).filter((name) => !EVENT_TAGS.has(name)));
  const shared = [...new Set([...ad.categories.map(topicName), topicName(adCategory(ad))])].filter((c) => pinNames.has(c)).length;
  const sameCompany = sameBrand(ad.company, pin.company);
  const chosen = ad.forPinId === pin.id ? CHOSEN_FOR_PIN_BOOST + (sameCompany ? CHOSEN_BRAND_BOOST : 0) : 0;
  return RELATED_CATEGORY_BOOST * Math.min(shared, 2) + RELATED_CATEGORY_BOOST * Math.min(sharedTopics(ad, pin), 2) + (sameCompany ? RELATED_COMPANY_BOOST : 0) + chosen;
}

// Whether the viewer may see the ad at all: old enough, and not the product
// whose own buy buttons are already on the page (a chosen ad is the exception).
export function adAllowed(ad: AdCandidate, ctx: AdContext): boolean {
  if (ctx.pin && ad.pinId === ctx.pin.id && ad.forPinId !== ctx.pin.id) return false;
  if (ctx.age == null) return true;
  return ctx.age >= Math.max(MIN_AD_AGE, ad.kind === 'product' ? PRODUCT_MIN_AGE : ad.minAge);
}

// The ad's weight for this viewer, before its pool's share is applied.
export function personalWeight(ad: AdCandidate, ctx: AdContext): number {
  let weight = ad.weight;
  const pref = ctx.preference;
  if (pref) {
    const categories = new Map(pref.categories.map((a) => [a.name.toLowerCase(), a.share]));
    const companies = new Map(pref.companies.map((a) => [a.name.toLowerCase(), a.share]));
    const leaning =
      Math.min(1, lower(ad.categories).reduce((sum, c) => sum + (categories.get(c) ?? 0), 0)) +
      (ad.company ? (companies.get(ad.company.toLowerCase()) ?? 0) : 0);
    weight *= 1 + AFFINITY_BOOST * leaning;
  }
  if (ctx.age != null && (ad.targetAgeFrom != null || ad.targetAgeTo != null)) {
    const inRange = ctx.age >= (ad.targetAgeFrom ?? 0) && ctx.age <= (ad.targetAgeTo ?? 200);
    if (inRange) weight *= AGE_BOOST;
  }
  return weight;
}

// What an ad is, whichever key it has: an Amazon product by its ASIN (the same
// product can be a pin's own listing, another pin's, and a chosen ad), a
// program by its link. Two ads with one product key are the same ad to a viewer.
export function productKey(ad: Pick<AdCandidate, 'url' | 'key'>): string {
  const asin = asinOf(ad.url);
  return asin ? `asin:${asin}` : ad.key;
}

// Whether two product ads are variants of one product (sameProductFamily):
// a page shows one of them, not the single and the 8-pack side by side.
export function sameProduct(a: AdCandidate, b: AdCandidate): boolean {
  if (productKey(a) === productKey(b)) return true;
  if (a.kind !== 'product' || b.kind !== 'product') return false;
  return sameProductFamily({ ...a, brand: a.brand ?? a.company }, { ...b, brand: b.brand ?? b.company });
}

// The keys to avoid, widened to every ad that is the same product as one
// already on the page.
export function expandAvoid(candidates: AdCandidate[], avoid: Set<string>): Set<string> {
  if (!avoid.size) return avoid;
  const products = new Set(candidates.filter((ad) => avoid.has(ad.key)).map(productKey));
  const widened = new Set(avoid);
  for (const ad of candidates) if (products.has(productKey(ad))) widened.add(ad.key);
  return widened;
}

// Group by what the ad sells, rather than its brand or its ad kind. Product
// listings often inherit broad Fashion tags, so recognize watches and shoes
// before falling back to the first catalog category.
export function adCategory(ad: AdCandidate): string {
  const categories = ad.categories.map((name) => name.trim().toLowerCase());
  if (ad.kind === 'watch' || categories.some((name) => /^(?:watches|watch|smartwatches)$/.test(name)) || /\b(?:watches|watch|smartwatch)\b/i.test(ad.title ?? '')) return 'watches';
  if (ad.kind === 'sneaker' || hasFootwear(ad.categories) || /\b(?:sneakers?|shoes?|footwear)\b/i.test(ad.title ?? '')) return 'shoes';
  if (ad.holiday) return 'seasonal';
  return topicName(categories.find(isCategory) ?? categories.find(Boolean) ?? ad.program ?? 'products');
}

// Up to n ads, a weighted random pick without repeats. On a pin's page the
// ads favor the pin at every pick, balancing categories within related ads
// before using unrelated ads to fill the remaining space.
// Prefer at most two per category (one in a two-ad block), relaxing that limit
// when necessary to fill the requested count. Keys in `avoid` follow fresh ads.
// `initial` includes seasonal tiles already selected for this block.
export function pickAds(candidates: AdCandidate[], ctx: AdContext, n: number, avoid: Set<string> = new Set(), random = Math.random, initial: AdCandidate[] = []): AdCandidate[] {
  // A slot the holiday ads already fill asks for none more.
  if (n <= 0) return [];
  const allowed = candidates.filter((ad) => !ad.holiday && adAllowed(ad, ctx));
  const poolTotals = new Map<AdKind, number>();
  for (const ad of allowed) poolTotals.set(ad.kind, (poolTotals.get(ad.kind) ?? 0) + ad.weight);
  // A store whose program ads have no known reward (Japan, until its rate card
  // can be read) has nothing to prefer one by: each kind's share is then its
  // number of ads, so every program ad comes up as often as any other instead
  // of a lone Fresh or Trade-In ad taking a whole pool's share.
  const programs = allowed.filter((ad) => ad.kind !== 'product');
  const flat = programs.length > 0 && programs.every((ad) => ad.rewardUsd == null && ad.weight === programs[0].weight);
  const poolSize = new Map<AdKind, number>();
  for (const ad of programs) poolSize.set(ad.kind, (poolSize.get(ad.kind) ?? 0) + 1);
  const shareOf = (kind: AdKind) => (flat && kind !== 'product' ? (poolSize.get(kind) ?? 0) : KIND_SHARE[kind]);
  const weighed = allowed
    .map((ad) => {
      const total = poolTotals.get(ad.kind) || 1;
      const related = relatedness(ad, ctx.pin);
      const performance = performanceWeight(ctx.performance?.byKey.get(ad.key), ctx.performance?.baselineCtr ?? 0);
      const weight = (shareOf(ad.kind) / total) * personalWeight(ad, ctx) * (1 + related) * performance * rewardWeight(ad) * qualityWeight(ad);
      // Efraimidis-Spirakis: the n smallest -ln(u)/w are a weighted sample.
      return { ad, category: adCategory(ad), product: productKey(ad), related, topic: ctx.pin ? sharedTopics(ad, ctx.pin) : 0, brand: !!ctx.pin && sameBrand(ad.company, ctx.pin.company), own: ctx.pin != null && ad.forPinId === ctx.pin.id, fresh: !avoid.has(ad.key), score: weight > 0 ? -Math.log(1 - random()) / weight : Infinity };
    })
    .filter((w) => w.score !== Infinity);
  weighed.sort((a, b) => Number(b.fresh) - Number(a.fresh) || Number(b.own) - Number(a.own) || b.topic - a.topic || Number(b.brand) - Number(a.brand) || Number(b.related > 0) - Number(a.related > 0) || a.score - b.score);
  // Start with the ranked relevant ad, then balance category counts before
  // consulting that ranking again. Never fill a block with more of one topic
  // just because its inventory has more brands or better click statistics.
  const picked: AdCandidate[] = [];
  const counts = new Map<string, number>();
  for (const ad of initial) counts.set(adCategory(ad), (counts.get(adCategory(ad)) ?? 0) + 1);
  const categories = new Set([...initial.map(adCategory), ...weighed.map(({ category }) => category)]);
  const products = new Set(initial.map(productKey));
  const cap = categories.size <= 1 || n + initial.length <= 2 ? 1 : 2;
  while (picked.length < n) {
    const shown = [...initial, ...picked];
    const remaining = weighed.filter(({ product }) => !products.has(product));
    let eligible = remaining.filter(({ category }) => (counts.get(category) ?? 0) < cap);
    // Counts take precedence when the available inventory cannot meet the
    // variety target. Keep balancing categories while filling every slot.
    if (!eligible.length) eligible = remaining;
    if (!eligible.length) break;
    // Keep fresh and relevant choices ahead of fillers, then prefer distinct
    // product families within that pool. Exact duplicates were filtered above.
    const fresh = eligible.filter(({ fresh }) => fresh);
    if (fresh.length) eligible = fresh;
    const relevant = eligible.filter(({ related }) => related > 0);
    if (relevant.length) eligible = relevant;
    const distinct = eligible.filter(({ ad }) => !shown.some((p) => p.kind === 'product' && ad.kind === 'product' && sameProductFamily({ ...p, brand: p.brand ?? p.company }, { ...ad, brand: ad.brand ?? ad.company })));
    if (distinct.length) eligible = distinct;
    const least = Math.min(...eligible.map(({ category }) => counts.get(category) ?? 0));
    const { ad, category, product } = eligible.find(({ category }) => (counts.get(category) ?? 0) === least)!;
    picked.push(ad);
    counts.set(category, least + 1);
    products.add(product);
  }
  return picked;
}

// An ad's urgency code as what it says: so many left, or a lowest price in so
// many days. Anything else (a stale or hand-edited value) says nothing.
export type Urgency = { kind: 'left'; count: number } | { kind: 'low'; days: number };

export function parseUrgency(code: string | null | undefined): Urgency | null {
  const match = code?.match(/^(left|low):(\d{1,3})$/);
  if (!match || !Number(match[2])) return null;
  return match[1] === 'left' ? { kind: 'left', count: Number(match[2]) } : { kind: 'low', days: Number(match[2]) };
}

// A holiday in its ad window: its catalog id and how many days it is from the
// holiday's first day (negative before it).
export type ActiveHoliday = { id: string; offset: number };

// How much more often a holiday's ads come up near the day itself than at the
// edges of its window: a week either side of it counts double, three days
// quadruple.
export function holidayWeight(offset: number): number {
  const days = Math.abs(offset);
  return days <= 3 ? 4 : days <= 10 ? 2 : 1;
}

// A holiday's ads for one slot: one holiday (weighted by how close it is,
// and only one the pin falls on, when `related` is given), and from it `count`
// ads in different price tiers - the inexpensive, middle and expensive choices
// together - cheapest first, and never two variants of one product. A holiday
// short of tiers repeats one it has; ads already on the page are used only
// when the rest run out.
export function pickHolidayAds(
  candidates: AdCandidate[],
  ctx: AdContext,
  active: ActiveHoliday[],
  count: number,
  related: ReadonlySet<string> | null = null,
  avoid: Set<string> = new Set(),
  random = Math.random,
): AdCandidate[] {
  if (count <= 0) return [];
  const offsets = new Map(active.map((h) => [h.id, h.offset]));
  const byHoliday = new Map<string, AdCandidate[]>();
  for (const ad of candidates) {
    if (!ad.holiday || !offsets.has(ad.holiday) || !adAllowed(ad, ctx)) continue;
    if (related && !related.has(ad.holiday)) continue;
    byHoliday.set(ad.holiday, [...(byHoliday.get(ad.holiday) ?? []), ad]);
  }
  let holidays = [...byHoliday.keys()];
  // A holiday whose ads are all on the page already comes last.
  const fresh = holidays.filter((id) => byHoliday.get(id)!.some((ad) => !avoid.has(ad.key)));
  if (fresh.length) holidays = fresh;
  if (!holidays.length) return [];
  const weights = holidays.map((id) => holidayWeight(offsets.get(id) ?? 0));
  let roll = random() * weights.reduce((sum, w) => sum + w, 0);
  let chosen = holidays[holidays.length - 1];
  for (const [i, id] of holidays.entries()) {
    roll -= weights[i];
    if (roll < 0) {
      chosen = id;
      break;
    }
  }
  const ads = byHoliday.get(chosen)!;
  // Within a tier, the better reviewed a listing the likelier it is.
  const pickOne = (pool: AdCandidate[]) => {
    const unseen = pool.filter((ad) => !avoid.has(ad.key));
    const from = unseen.length ? unseen : pool;
    let left = random() * from.reduce((sum, ad) => sum + qualityWeight(ad), 0);
    for (const ad of from) {
      left -= qualityWeight(ad);
      if (left < 0) return ad;
    }
    return from[from.length - 1];
  };
  const tiersHere = AD_TIERS.filter((tier) => ads.some((ad) => ad.tier === tier));
  // Which tiers to show when the slot holds fewer than there are: random ones,
  // each a different product: a tier whose every ad is a variant of one
  // already picked (the 8-pack of the single in the tier below) is skipped.
  const order = [...tiersHere].sort(() => random() - 0.5);
  const picked: AdCandidate[] = [];
  for (const tier of order) {
    if (picked.length === count) break;
    const pool = ads.filter((ad) => ad.tier === tier && !picked.some((p) => sameProduct(p, ad)));
    if (pool.length) picked.push(pickOne(pool));
  }
  picked.sort((a, b) => AD_TIERS.indexOf(a.tier!) - AD_TIERS.indexOf(b.tier!));
  // A tier with two ads fills a slot a missing tier leaves; never with a
  // variant of a product already shown - the slot's other ads take it instead.
  const rest = ads.filter((ad) => !picked.some((p) => sameProduct(p, ad)));
  while (picked.length < count && rest.length) {
    const ad = rest.splice(Math.floor(random() * rest.length), 1)[0];
    if (!picked.some((p) => sameProduct(p, ad))) picked.push(ad);
  }
  return picked;
}

// Amazon's stores by the country they sell to. A country with no store of its
// own shops at the one it is sent to here.
export const AMAZON_STORES: Record<string, string> = {
  US: 'www.amazon.com',
  CA: 'www.amazon.ca',
  MX: 'www.amazon.com.mx',
  BR: 'www.amazon.com.br',
  GB: 'www.amazon.co.uk',
  IE: 'www.amazon.ie',
  DE: 'www.amazon.de',
  FR: 'www.amazon.fr',
  IT: 'www.amazon.it',
  ES: 'www.amazon.es',
  NL: 'www.amazon.nl',
  BE: 'www.amazon.com.be',
  SE: 'www.amazon.se',
  PL: 'www.amazon.pl',
  TR: 'www.amazon.com.tr',
  AE: 'www.amazon.ae',
  SA: 'www.amazon.sa',
  EG: 'www.amazon.eg',
  IN: 'www.amazon.in',
  JP: 'www.amazon.co.jp',
  SG: 'www.amazon.sg',
  AU: 'www.amazon.com.au',
};
const STORE_FOR: Record<string, string> = { AT: 'DE', CH: 'DE', LU: 'DE', LI: 'DE', NZ: 'AU', PR: 'US' };

// The store a page language points to, for a viewer whose country is unknown
// (no address match, no region in Accept-Language). Only a language one
// Amazon store serves best: Spanish, Arabic, English and the like say nothing.
const STORE_FOR_LOCALE: Record<string, string> = { ja: 'JP', de: 'DE', fr: 'FR', it: 'IT', es: 'ES', pt: 'BR', hi: 'IN' };

export function storeForLocale(locale: string | null | undefined): string | null {
  return (locale && STORE_FOR_LOCALE[locale]) || null;
}

export function storeForCountry(country: string | null | undefined): string | null {
  if (!country) return null;
  const code = country.toUpperCase();
  return AMAZON_STORES[code] ? code : (STORE_FOR[code] ?? null);
}

// The store a viewer's ads come from: their country's, when it has a tracking
// id (its own, or the US one under Global Earning) and ads to show, else the US.
export function servingStore(country: string | null, tags: Record<string, string>, storesWithAds: Set<string>): string {
  const store = storeForCountry(country);
  return store && store !== 'US' && tagForStore(store, tags) && storesWithAds.has(store) ? store : 'US';
}

// The ad's link with the store's Associates id on it.
// The stores Amazon's Global Earning covers (the US account's rate plan lists
// each of them with the one tracking id): a link with the US id, to amazon.com
// or to the store itself, earns for a shopper there, and an amazon.com
// product link is sent to the shopper's local store by Amazon. They need no
// id of their own; an id set for one (AppSetting "amazonTags") still wins.
export const GLOBAL_EARNING_STORES: ReadonlySet<string> = new Set(['CA', 'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'PL', 'SE']);

// Clicks that went to amazon.com although the clicker's own store is a separate
// Associates program (not under Global Earning): each such click earned
// nothing, or earned at the US rate, where an id and ads for that store
// would have counted. By store code; the click's own `store` is where it went.
export function missedStoreClicks(clicks: { country: string | null; store: string }[]): Record<string, number> {
  const missed: Record<string, number> = {};
  for (const c of clicks) {
    const store = storeForCountry(c.country);
    if (store && store !== 'US' && !GLOBAL_EARNING_STORES.has(store) && c.store !== store) missed[store] = (missed[store] ?? 0) + 1;
  }
  return missed;
}

// The Associates tracking id a store's links carry, or null when it has none.
export function tagForStore(store: string, tags: Record<string, string>): string | null {
  if (store === 'US') return amazonAssociateTag;
  return tags[store] || (GLOBAL_EARNING_STORES.has(store) ? amazonAssociateTag : null);
}

// The tracking id an ad's link carries: the EPN campaign for an eBay link,
// else the store's Associates id (null when it has none).
export function adTag(ad: Pick<AdCandidate, 'url' | 'store'>, tags: Record<string, string>): string | null {
  return isEbayUrl(ad.url) ? ebayCampaignId : tagForStore(ad.store, tags);
}

export function taggedAdUrl(url: string, store: string, tags: Record<string, string>): string {
  if (isEbayUrl(url)) return affiliateUrl(url);
  const tag = tagForStore(store, tags);
  if (!tag) return url;
  try {
    const parsed = new URL(url);
    if (!/(^|\.)amazon\.[a-z.]+$/i.test(parsed.hostname)) return url;
    parsed.searchParams.set('tag', tag);
    return parsed.toString();
  } catch {
    return url;
  }
}

// The region of the first language tag that names one ("en-GB" -> "GB"):
// where a viewer probably is when the address says nothing.
export function regionFromAcceptLanguage(header: string | null | undefined): string | null {
  for (const part of (header ?? '').split(',')) {
    const match = /^[a-z]{2,3}[-_]([a-z]{2})\b/i.exec(part.trim());
    if (match) return match[1].toUpperCase();
  }
  return null;
}

// The stored Associates ids by store, from AppSetting "amazonTags" ({ "GB": "xyz-21" }).
export function parseAmazonTags(value: unknown): Record<string, string> {
  const tags: Record<string, string> = {};
  if (!value || typeof value !== 'object') return tags;
  for (const [store, tag] of Object.entries(value as Record<string, unknown>)) {
    if (AMAZON_STORES[store.toUpperCase()] && typeof tag === 'string' && /^[\w-]{3,40}$/.test(tag)) tags[store.toUpperCase()] = tag;
  }
  return tags;
}

// A submitted set of store ids (the admin page): each store but the US (its id
// is fixed in src/lib/affiliate.ts) to its id, or "" to take the store off.
// Answers the ids to keep, or the first problem.
export function validateAmazonTags(value: unknown): { tags: Record<string, string> } | { problem: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { problem: 'Expected { "GB": "id-21", ... }' };
  const tags: Record<string, string> = {};
  for (const [store, raw] of Object.entries(value as Record<string, unknown>)) {
    const code = store.toUpperCase();
    if (code === 'US') return { problem: 'The US id is fixed in the code and cannot be set here.' };
    if (!AMAZON_STORES[code]) return { problem: `${store} is not an Amazon store we link to.` };
    if (typeof raw !== 'string') return { problem: `The ${code} id must be text.` };
    const tag = raw.trim();
    if (!tag) continue;
    if (!/^[\w-]{3,40}$/.test(tag)) return { problem: `The ${code} id "${tag}" can only have letters, digits, - and _ (3-40 characters).` };
    tags[code] = tag;
  }
  return { tags };
}
