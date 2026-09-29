// Prediction markets a pin cites (Kalshi, Polymarket, Polymarket US): which links point at
// one, and the odds shape GET /api/pins/:id/odds answers with.

export type MarketSource = 'Kalshi' | 'Polymarket' | 'Polymarket US';

// What a link names: a Kalshi event or series ticker (uppercase, as the API
// wants it), a Polymarket event or market slug, or a Polymarket US event slug.
// Polymarket US (polymarket.us) is its own exchange, with its own markets and
// slugs, not polymarket.com's.
export type MarketRef =
  | { source: 'Kalshi'; kind: 'event' | 'series'; ticker: string; url: string }
  | { source: 'Polymarket'; kind: 'event' | 'market'; slug: string; url: string }
  | { source: 'Polymarket US'; kind: 'event'; slug: string; url: string };

export type MarketOutcome = {
  label: string;
  // The market's chance for this outcome, 0-1.
  probability: number | null;
  // The dollars traded on this outcome's own market, where the exchange says
  // (never for the two sides of a single yes/no market, which would count the
  // same money twice).
  volume?: number;
  // Which price history is this outcome's, for its trend (GET /api/pins/:id/trend).
  history?: string;
};

// A market's leading outcome over the past week: [unix seconds, chance 0-1].
export type MarketTrend = { source: MarketSource; title: string; label: string; points: [number, number][] };

export type MarketOdds = {
  source: MarketSource;
  url: string;
  title: string;
  outcomes: MarketOutcome[];
  // The dollars traded on the market. Polymarket reports this; Kalshi's is
  // its contracts at their last price, an estimate; Polymarket US publishes
  // none, so it is undefined there.
  volume?: number;
  closeTime?: string;
  closed: boolean;
  // When the server read the market.
  fetchedAt: string;
};

// kalshi.com/markets/{series}/{slug}/{event}, or a shorter link to the series.
// polymarket.com/[locale/]event/{slug}[/{market}] or /market/{slug}.
// polymarket.us/event/{slug} (its only market pages).
export function parseMarketUrl(raw: string | null | undefined): MarketRef | null {
  let url: URL;
  try {
    url = new URL((raw || '').trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, '');
  const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);

  if (host === 'kalshi.com') {
    if (parts[0] !== 'markets' || !parts[1]) return null;
    return parts[3]
      ? { source: 'Kalshi', kind: 'event', ticker: parts[3].toUpperCase(), url: url.href }
      : { source: 'Kalshi', kind: 'series', ticker: parts[1].toUpperCase(), url: url.href };
  }

  if (host === 'polymarket.com') {
    const at = parts.findIndex((p) => p === 'event' || p === 'market');
    if (at === -1 || !parts[at + 1]) return null;
    if (parts[at] === 'market') return { source: 'Polymarket', kind: 'market', slug: parts[at + 1], url: url.href };
    return parts[at + 2]
      ? { source: 'Polymarket', kind: 'market', slug: parts[at + 2], url: url.href }
      : { source: 'Polymarket', kind: 'event', slug: parts[at + 1], url: url.href };
  }

  if (host === 'polymarket.us') {
    if (parts[0] !== 'event' || !parts[1]) return null;
    return { source: 'Polymarket US', kind: 'event', slug: parts[1], url: url.href };
  }

  return null;
}

// The money on the markets a pin cites, in dollars: shown on the pin page
// beside each market, and kept on the pin ("marketVolume", schema 0053) for
// its timeline weight (lib/bagSample.ts). Markets that report no volume count
// as nothing, so a pin citing only those stays at zero.
export function totalMarketVolume(markets: { volume?: number }[]): number {
  return markets.reduce((sum, market) => sum + Math.max(0, market.volume ?? 0), 0);
}

// The key a market is known by, the same for any link to it.
export function marketRefKey(ref: MarketRef): string {
  return ref.source === 'Kalshi' ? `k:${ref.ticker}` : ref.source === 'Polymarket' ? `p:${ref.slug}` : `u:${ref.slug}`;
}

// Each distinct market a pin links to, from its source and its references.
export function pinMarketRefs(pin: { sourceUrl?: string | null; references?: { url?: string | null }[] | null }): MarketRef[] {
  const seen = new Set<string>();
  const refs: MarketRef[] = [];
  for (const link of [pin.sourceUrl, ...(pin.references ?? []).map((r) => r.url)]) {
    const ref = parseMarketUrl(link);
    if (!ref) continue;
    const key = marketRefKey(ref);
    if (!seen.has(key)) {
      seen.add(key);
      refs.push(ref);
    }
  }
  return refs;
}
