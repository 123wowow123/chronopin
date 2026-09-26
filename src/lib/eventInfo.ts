// Who performs at an event pin and how to get in (PinEventInfo, 0082): what
// the pin page shows under the date, and the performer and offers of its
// Event markup (src/lib/seo.ts). Read off pages, never typed from memory.

export type PerformerType = 'Person' | 'PerformingGroup';
export type Performer = { name: string; type: PerformerType; url?: string };

// Google's three: on sale (or free and open), sold out, announced but not
// yet on sale.
export const AVAILABILITIES = ['InStock', 'SoldOut', 'PreOrder'] as const;
export type Availability = (typeof AVAILABILITIES)[number];

export const EVENT_INFO_SOURCES = ['markup', 'claude', 'session', 'hand'] as const;
export type EventInfoSource = (typeof EVENT_INFO_SOURCES)[number];

export type PinEventInfoJson = {
  performers: Performer[];
  ticketUrl: string | null;
  lowPrice: number | null;
  highPrice: number | null;
  priceCurrency: string | null;
  availability: Availability | null;
  onSaleDate: string | null;
  source: EventInfoSource;
  sourceUrl: string | null;
  checkedAt: string;
};

// What a page states, before it is stored.
export type EventInfoFields = Omit<PinEventInfoJson, 'source' | 'sourceUrl' | 'checkedAt'>;

export const EMPTY_EVENT_INFO: EventInfoFields = {
  performers: [],
  ticketUrl: null,
  lowPrice: null,
  highPrice: null,
  priceCurrency: null,
  availability: null,
  onSaleDate: null,
};

// Whether a reading says anything at all.
export function hasEventInfo(info: EventInfoFields | null | undefined): boolean {
  return !!info && (info.performers.length > 0 || !!info.ticketUrl || info.lowPrice != null || !!info.availability);
}

type Node = Record<string, unknown>;
const text = (value: unknown): string | undefined => (typeof value === 'string' && value.trim() ? value.trim() : undefined);
const nodeTypes = (node: Node): string[] => [node['@type']].flat().filter((t): t is string => typeof t === 'string');
const isHttpUrl = (value: unknown): value is string => typeof value === 'string' && /^https?:\/\//i.test(value.trim());

// "https://schema.org/SoldOut", "http://schema.org/InStock", "SoldOut" ->
// one of ours. LimitedAvailability is still on sale; PreSale and PreOrder are
// not yet. Anything else (Discontinued, OutOfStock) says nothing an event
// search can use, so it is dropped rather than guessed.
export function availabilityOf(value: unknown): Availability | null {
  const name = text(value)?.replace(/^https?:\/\/schema\.org\//i, '');
  switch (name) {
    case 'InStock':
    case 'LimitedAvailability':
    case 'OnlineOnly':
    case 'InStoreOnly':
      return 'InStock';
    case 'SoldOut':
      return 'SoldOut';
    case 'PreOrder':
    case 'PreSale':
      return 'PreOrder';
    default:
      return null;
  }
}

function performerOf(value: unknown): Performer | undefined {
  if (typeof value === 'string') {
    return text(value) ? { name: value.trim(), type: 'Person' } : undefined;
  }
  if (!value || typeof value !== 'object') return undefined;
  const node = value as Node;
  const name = text(node.name);
  if (!name) return undefined;
  const group = nodeTypes(node).some((t) => /Group|Band|Team|Organization|Ensemble|Orchestra|Choir/i.test(t));
  const url = [node.url, node.sameAs].flat().find(isHttpUrl);
  return { name, type: group ? 'PerformingGroup' : 'Person', ...(url ? { url: url.trim() } : {}) };
}

const price = (value: unknown): number | null => {
  const digits = typeof value === 'string' ? value.replace(/[^0-9.]/g, '') : '';
  const n = typeof value === 'number' ? value : digits ? Number(digits) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
};

// The performer and offers an Event node on a page states. An offer list
// spans its cheapest to dearest price; it is on sale if any offer is, else
// not yet if any is pre-sale, else sold out if they all are.
export function eventInfoFromMarkup(event: Node | undefined): EventInfoFields {
  if (!event) return { ...EMPTY_EVENT_INFO };
  const performers = [event.performer, event.performers]
    .flat()
    .map(performerOf)
    .filter((p): p is Performer => !!p && !isEventItself(p.name, event))
    .filter((p, i, all) => all.findIndex((o) => o.name.toLowerCase() === p.name.toLowerCase()) === i);

  const offers = [event.offers]
    .flat()
    .flatMap((o) => (o && typeof o === 'object' ? [o as Node, ...[(o as Node).offers].flat().filter((x): x is Node => !!x && typeof x === 'object')] : []));
  const prices = offers.flatMap((o) => [price(o.price), price(o.lowPrice), price(o.highPrice)]).filter((p): p is number => p != null);
  const availabilities = offers.map((o) => availabilityOf(o.availability)).filter((a): a is Availability => !!a);
  const availability = availabilities.includes('InStock')
    ? 'InStock'
    : availabilities.includes('PreOrder')
      ? 'PreOrder'
      : availabilities.length && availabilities.every((a) => a === 'SoldOut')
        ? 'SoldOut'
        : null;
  const ticketUrl = offers.map((o) => o.url).find(isHttpUrl)?.trim() ?? null;
  const currency = offers.map((o) => text(o.priceCurrency)).find((c) => !!c && /^[A-Z]{3}$/i.test(c));
  const onSale = offers.map((o) => text(o.validFrom)).find((d) => !!d && !Number.isNaN(Date.parse(d)));

  return {
    performers,
    ticketUrl,
    lowPrice: prices.length ? Math.min(...prices) : null,
    highPrice: prices.length ? Math.max(...prices) : null,
    priceCurrency: prices.length && currency ? currency.toUpperCase() : null,
    availability,
    onSaleDate: availability === 'PreOrder' && onSale ? new Date(onSale).toISOString() : null,
  };
}

const DAY_MS = 86_400_000;

const HOUR_MS = 3_600_000;
const ZONED_TIME = /T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/;

// How far an Event node's start is from the pin's, or undefined when it cannot
// be the pin's event. A start with a time and zone is an instant: within six
// hours of a timed pin's (doors against show time). Otherwise the day as the
// page writes it (its local date): on an all-day pin's days, or a day either
// side of a timed pin's UTC day, since the local date may differ from it.
function distanceFrom(node: Node, pin: { utcStartDateTime: string; utcEndDateTime?: string | null; allDay?: boolean }): number | undefined {
  const written = text(node.startDate);
  if (!written) return undefined;
  const pinStart = Date.parse(pin.utcStartDateTime);
  if (!pin.allDay && ZONED_TIME.test(written)) {
    const gap = Math.abs(Date.parse(written) - pinStart);
    return gap <= 6 * HOUR_MS ? gap : undefined;
  }
  const day = Date.parse(written.slice(0, 10));
  const startDay = Date.parse(pin.utcStartDateTime.slice(0, 10));
  if (!Number.isFinite(day)) return undefined;
  if (pin.allDay) {
    // An all-day pin's stored end is the day after its last.
    const endDay = pin.utcEndDateTime ? Date.parse(pin.utcEndDateTime.slice(0, 10)) : startDay + DAY_MS;
    return day >= startDay && day < Math.max(endDay, startDay + DAY_MS) ? day - startDay : undefined;
  }
  const gap = Math.abs(day - startDay);
  return gap <= DAY_MS ? gap : undefined;
}

// The Event node among a page's JSON-LD blocks (and their @graph lists) that
// is this pin's event. A tour's page lists every night and a festival's site
// describes last year's edition, so only an Event starting when the pin does
// counts - the closest, when a tour plays on consecutive nights - and one with
// no date to check never does.
export function findEventNode(
  jsonLd: unknown[] | null | undefined,
  pin: { utcStartDateTime: string; utcEndDateTime?: string | null; allDay?: boolean },
): Node | undefined {
  const nodes = (jsonLd ?? []).flatMap((n) => (n && typeof n === 'object' ? [n as Node, ...[(n as Node)['@graph']].flat().filter((g): g is Node => !!g && typeof g === 'object')] : []));
  let best: { node: Node; distance: number } | undefined;
  for (const node of nodes) {
    if (!nodeTypes(node).some((t) => t.endsWith('Event'))) continue;
    const distance = distanceFrom(node, pin);
    if (distance != null && (!best || distance < best.distance)) best = { node, distance };
  }
  return best?.node;
}

// Whether a named performer is really the event or its organizer, which some
// sites put in the performer slot ("Anime Expo" performing at Anime Expo 2026).
function isEventItself(name: string, event: Node): boolean {
  const plain = (value: unknown) =>
    (typeof value === 'string' ? value : typeof value === 'object' && value ? String((value as Node).name ?? '') : '')
      .toLowerCase()
      .replace(/\b(19|20)\d{2}\b/g, '')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();
  const own = plain(name);
  return !!own && [event.name, ...[event.organizer].flat()].some((other) => plain(other) === own);
}
