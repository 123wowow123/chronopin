// The main competing products a product pin lists (PinCompetitor, 0211), each
// linked to the pin for that product when there is one.

export type PinCompetitorJson = {
  rank: number;
  name: string;
  maker: string | null;
  // The pin for the rival, already shaped for pinPath(), with the picture a
  // list shows for it (its first image).
  pin: { id: number; title: string; thumbName: string | null; originalUrl: string | null } | null;
  summary: string | null;
  sourceUrl: string | null;
};

// A competitor row as it is backed up and restored.
export type StoredPinCompetitor = Omit<PinCompetitorJson, 'pin'> & { pinId: number; competitorPinId: number | null };

// A competitor an extraction names for a goods pin, sent with the pin and saved
// once it exists (server/services/createPin.ts). No rival pin or source is
// known at that point: the productCompetitors task links and sources them.
export type ScrapedCompetitor = { name: string; maker: string | null; summary: string | null };

export const MAX_SCRAPED_COMPETITORS = 5;

// A body's competitors, cleaned: named, no repeats, at most five. Anything else
// is dropped rather than refused, so a bad entry never costs the pin.
export function parseScrapedCompetitors(raw: unknown): ScrapedCompetitor[] {
  if (!Array.isArray(raw)) return [];
  const out: ScrapedCompetitor[] = [];
  const text = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    const name = text(r.name, 200);
    if (!name || out.some((c) => c.name.toLowerCase() === name.toLowerCase())) continue;
    out.push({ name, maker: text(r.maker, 200), summary: text(r.summary, 400) });
    if (out.length === MAX_SCRAPED_COMPETITORS) break;
  }
  return out;
}
