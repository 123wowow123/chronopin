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
