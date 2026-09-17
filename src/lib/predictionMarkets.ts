// Prediction markets a pin cites (Kalshi, Polymarket): which links point at
// one, and the odds shape GET /api/pins/:id/odds answers with.

export type MarketSource = 'Kalshi' | 'Polymarket';

// What a link names: a Kalshi event or series ticker (uppercase, as the API
// wants it), or a Polymarket event or market slug.
export type MarketRef =
  | { source: 'Kalshi'; kind: 'event' | 'series'; ticker: string; url: string }
  | { source: 'Polymarket'; kind: 'event' | 'market'; slug: string; url: string };

export type MarketOutcome = {
  label: string;
  // The market's chance for this outcome, 0-1.
  probability: number | null;
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
  volume?: number;
  closeTime?: string;
  closed: boolean;
  // When the server read the market.
  fetchedAt: string;
};

// kalshi.com/markets/{series}/{slug}/{event}, or a shorter link to the series.
// polymarket.com/[locale/]event/{slug}[/{market}] or /market/{slug}.
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

  return null;
}

// Each distinct market a pin links to, from its source and its references.
export function pinMarketRefs(pin: { sourceUrl?: string | null; references?: { url?: string | null }[] | null }): MarketRef[] {
  const seen = new Set<string>();
  const refs: MarketRef[] = [];
  for (const link of [pin.sourceUrl, ...(pin.references ?? []).map((r) => r.url)]) {
    const ref = parseMarketUrl(link);
    if (!ref) continue;
    const key = ref.source === 'Kalshi' ? `k:${ref.ticker}` : `p:${ref.slug}`;
    if (!seen.has(key)) {
      seen.add(key);
      refs.push(ref);
    }
  }
  return refs;
}
