// A pin's mapped outlines (PinSiteShape, 0203): a data centre's campus boundary
// and its parts, a course, pipeline, power line, wildfire perimeter or election
// district boundary, drawn on the pin page's map.

export const SITE_KINDS = ['site', 'wildfire', 'district', 'building', 'cooling', 'generator', 'substation', 'power', 'pipeline', 'powerline', 'route'] as const;
export type SiteKind = (typeof SITE_KINDS)[number];

// What a route feature may say about its course: a circuit's length, altitude
// and first seasons, and a profile of [km along the course, metres] points.
export type RouteFacts = { lengthM?: number; altitudeM?: number; opened?: number; firstGp?: number; profile?: [number, number][] };

// Boundary snapshots retain their own credit when mixed with other map layers.
export type BoundaryFacts = { name?: string; observedAt?: string; vintage?: string; source?: string; sourceUrl?: string };

export type SiteFeature = {
  type: 'Feature';
  geometry: { type: 'Polygon' | 'MultiPolygon' | 'LineString' | 'MultiLineString'; coordinates: unknown };
  properties: { kind: SiteKind } & RouteFacts & BoundaryFacts;
};

export type PinSiteShapeJson = {
  geojson: { type: 'FeatureCollection'; features: SiteFeature[] };
  source: string;
  sourceUrl: string | null;
};

// How each kind is drawn (its name in the key is the pin.siteKey.<kind> message).
export const SITE_STYLE: Record<SiteKind, { color: string; fill: number; dash?: string }> = {
  site: { color: '#2563eb', fill: 0.06, dash: '6 4' },
  wildfire: { color: '#dc2626', fill: 0.18 },
  district: { color: '#0f766e', fill: 0.08, dash: '5 3' },
  building: { color: '#7c3aed', fill: 0.45 },
  cooling: { color: '#0891b2', fill: 0.45 },
  generator: { color: '#ea580c', fill: 0.55 },
  substation: { color: '#ca8a04', fill: 0.5 },
  power: { color: '#16a34a', fill: 0.5 },
  pipeline: { color: '#78350f', fill: 0 },
  powerline: { color: '#475569', fill: 0, dash: '2 5' },
  route: { color: '#e11d48', fill: 0 },
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

// The facts a shape's route feature carries, if it has any.
export function routeFacts(shape: PinSiteShapeJson): RouteFacts | null {
  const f = shape.geojson.features.find((x) => x.properties.kind === 'route');
  if (!f) return null;
  const { lengthM, altitudeM, opened, firstGp, profile } = f.properties;
  return lengthM || altitudeM || opened || firstGp || profile?.length ? { lengthM, altitudeM, opened, firstGp, profile } : null;
}

// Points every `everyKm` along a line, with the distance each is at, and the line's
// whole length in km: where a course's distance markers go.
export function alongLine(line: [number, number][], everyKm: number): { marks: { lon: number; lat: number; km: number }[]; totalKm: number } {
  const marks: { lon: number; lat: number; km: number }[] = [];
  let total = 0;
  let next = everyKm;
  for (let i = 1; i < line.length; i++) {
    const [lon1, lat1] = line[i - 1];
    const [lon2, lat2] = line[i];
    const km = Math.hypot((lon2 - lon1) * 111.32 * Math.cos((((lat1 + lat2) / 2) * Math.PI) / 180), (lat2 - lat1) * 111.32);
    while (km > 0 && total + km >= next) {
      const t = (next - total) / km;
      marks.push({ lon: lon1 + (lon2 - lon1) * t, lat: lat1 + (lat2 - lat1) * t, km: next });
      next += everyKm;
    }
    total += km;
  }
  return { marks, totalKm: total };
}
