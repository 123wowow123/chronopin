import { roundCoords, type BoundaryFacts, type PinSiteShapeJson, type SiteFeature } from './siteShape';

export type BoundaryKind = 'wildfire' | 'district';
export type BoundaryInput = {
  kind: BoundaryKind;
  name: string;
  source: string;
  sourceUrl: string;
  observedAt?: string;
  vintage?: string;
};

function https(value: string): boolean {
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}

// Preserve the source's precision instead of inventing a day or time.
function validObservation(value: string | undefined): boolean {
  if (!value) return false;
  if (/^\d{4}$/.test(value)) return Number(value) > 0;
  if (/^\d{4}-\d{2}$/.test(value)) return Number(value.slice(0, 4)) > 0 && Number(value.slice(5)) >= 1 && Number(value.slice(5)) <= 12;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 19) === value.slice(0, 19);
}

function ring(value: unknown): boolean {
  if (!Array.isArray(value) || value.length < 4) return false;
  if (!value.every((p) => Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === 'number' && Number.isFinite(n)) && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90)) return false;
  const first = value[0];
  const last = value[value.length - 1];
  return first[0] === last[0] && first[1] === last[1] && new Set(value.map((p) => p.join(','))).size >= 3;
}

function polygon(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0 && value.every(ring);
}

// Accept only actual boundary polygons in WGS84, never FIRMS hotspot points,
// projected ArcGIS coordinates, or an unexamined/truncated service response.
export function boundaryShape(data: unknown, input: BoundaryInput): PinSiteShapeJson {
  if (input.kind !== 'wildfire' && input.kind !== 'district') throw new Error('Unknown boundary kind');
  if (!input.name.trim() || !input.source.trim() || !https(input.sourceUrl)) throw new Error('A boundary needs a name, source and HTTPS sourceUrl');
  if (input.kind === 'wildfire' && !validObservation(input.observedAt)) throw new Error('Wildfire boundaries need the source observation date (ISO year, month, day or UTC timestamp)');
  if (input.kind === 'district' && !input.vintage?.trim()) throw new Error('District boundaries need the election/plan vintage');
  if (!data || typeof data !== 'object') throw new Error('Expected GeoJSON');
  const collection = data as Record<string, unknown>;
  const crs = collection.crs as { type?: string; properties?: { name?: string } } | undefined;
  const wgs84 = !crs || (crs.type === 'name' && ['EPSG:4326', 'urn:ogc:def:crs:OGC:1.3:CRS84', 'urn:ogc:def:crs:EPSG::4326'].includes(crs.properties?.name ?? ''));
  if (!wgs84 || collection.exceededTransferLimit) throw new Error('Request complete WGS84 GeoJSON (outSR=4326)');
  const features = collection.type === 'FeatureCollection' ? collection.features : collection.type === 'Feature' ? [collection] : null;
  if (!Array.isArray(features) || !features.length) throw new Error('Expected a nonempty GeoJSON FeatureCollection or Feature');
  const properties: { kind: BoundaryKind } & BoundaryFacts = {
    kind: input.kind, name: input.name.trim(), source: input.source.trim(), sourceUrl: input.sourceUrl,
    ...(input.observedAt ? { observedAt: input.observedAt } : {}),
    ...(input.vintage ? { vintage: input.vintage.trim() } : {}),
  };
  const mapped: SiteFeature[] = features.map((feature: unknown) => {
    if (!feature || typeof feature !== 'object') throw new Error('Invalid boundary feature');
    const f = feature as Record<string, unknown>;
    const g = f.geometry as Record<string, unknown> | null;
    if (f.type !== 'Feature' || !g || !['Polygon', 'MultiPolygon'].includes(String(g.type))) throw new Error('Boundaries must be Polygon or MultiPolygon features');
    const coordinates = roundCoords(g.coordinates);
    const valid = g.type === 'Polygon' ? polygon(coordinates) : Array.isArray(coordinates) && coordinates.length > 0 && coordinates.every(polygon);
    if (!valid) throw new Error('Invalid boundary: use closed, nonempty WGS84 polygon rings in [longitude, latitude] order');
    return { type: 'Feature', geometry: { type: g.type as 'Polygon' | 'MultiPolygon', coordinates }, properties: { ...properties } };
  });
  return { geojson: { type: 'FeatureCollection', features: mapped }, source: input.source.trim(), sourceUrl: input.sourceUrl };
}

// Replace only this kind. Keep legacy credit at row level; boundary features
// carry their own credit so adding one never relabels an existing route/site.
export function mergeBoundary(old: PinSiteShapeJson | null, incoming: PinSiteShapeJson): PinSiteShapeJson {
  const kind = incoming.geojson.features[0]?.properties.kind;
  if (kind !== 'wildfire' && kind !== 'district') throw new Error('Expected boundary features');
  if (incoming.geojson.features.some((f) => f.properties.kind !== kind)) throw new Error('Expected one boundary kind');
  const keep = old?.geojson.features.filter((f) => f.properties.kind !== kind) ?? [];
  return {
    geojson: { type: 'FeatureCollection', features: [...keep, ...incoming.geojson.features] },
    source: keep.length && old ? old.source : incoming.source,
    sourceUrl: keep.length && old ? old.sourceUrl : incoming.sourceUrl,
  };
}
