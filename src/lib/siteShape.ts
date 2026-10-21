// A data centre's mapped outlines (PinSiteShape, 0203): the campus boundary and
// its parts, drawn on the pin page's map.

export const SITE_KINDS = ['site', 'building', 'cooling', 'generator', 'substation', 'power'] as const;
export type SiteKind = (typeof SITE_KINDS)[number];

export type SiteFeature = {
  type: 'Feature';
  geometry: { type: 'Polygon' | 'MultiPolygon' | 'LineString'; coordinates: unknown };
  properties: { kind: SiteKind };
};

export type PinSiteShapeJson = {
  geojson: { type: 'FeatureCollection'; features: SiteFeature[] };
  source: string;
  sourceUrl: string | null;
};

// How each kind is drawn (its name in the key is the pin.siteKey.<kind> message).
export const SITE_STYLE: Record<SiteKind, { color: string; fill: number; dash?: string }> = {
  site: { color: '#2563eb', fill: 0.06, dash: '6 4' },
  building: { color: '#7c3aed', fill: 0.45 },
  cooling: { color: '#0891b2', fill: 0.45 },
  generator: { color: '#ea580c', fill: 0.55 },
  substation: { color: '#ca8a04', fill: 0.5 },
  power: { color: '#16a34a', fill: 0.5 },
};

// Epoch AI's annotation types, as ours.
export function epochKind(type: string | undefined): SiteKind | null {
  switch ((type ?? '').toLowerCase()) {
    case 'building':
      return 'building';
    case 'cooling':
      return 'cooling';
    case 'backup generator':
      return 'generator';
    case 'power substation':
      return 'substation';
    case 'power generator':
      return 'power';
    default:
      return null;
  }
}

// Coordinates to 6 decimals (about 0.1 m), which is all a site outline needs.
export function roundCoords(c: unknown): unknown {
  if (typeof c === 'number') return Math.round(c * 1e6) / 1e6;
  return Array.isArray(c) ? c.map(roundCoords) : c;
}
