import { describe, expect, it } from 'vitest';
import { boundaryShape, mergeBoundary, type BoundaryInput } from './boundaryShape';
import type { PinSiteShapeJson } from './siteShape';

const ring = [[-118, 34], [-117, 34], [-117, 35], [-118, 34]];
const feature = (type = 'Polygon', coordinates: unknown = [ring]) => ({ type: 'Feature', geometry: { type, coordinates }, properties: {} });
const input: BoundaryInput = { kind: 'wildfire', name: 'Test fire final perimeter', source: 'NIFC', sourceUrl: 'https://data-nifc.opendata.arcgis.com/', observedAt: '2025-01-31T18:48:00Z' };
const shape = () => boundaryShape(feature(), input);

describe('boundaryShape', () => {
  it('keeps holes and disjoint polygons without converting them to a hull', () => {
    const hole = [[-117.8, 34.1], [-117.7, 34.1], [-117.7, 34.2], [-117.8, 34.1]];
    const s = boundaryShape(feature('MultiPolygon', [[ring, hole], [ring]]), input);
    expect(s.geojson.features[0].geometry.coordinates).toEqual([[ring, hole], [ring]]);
    expect(s.geojson.features[0].properties).toMatchObject(input);
  });
  it.each([
    feature('Point', [-118, 34]), feature('LineString', ring), feature('Polygon', []),
    feature('Polygon', [[[1, 1], [2, 1], [2, 2]]]),
    feature('Polygon', [[[1, 1], [1, 1], [1, 1], [1, 1]]]),
    feature('Polygon', [[[181, 34], [-117, 34], [-117, 35], [181, 34]]]),
    feature('Polygon', [[[1, NaN], [2, 1], [2, 2], [1, NaN]]]),
    { type: 'FeatureCollection', features: [] },
    { type: 'FeatureCollection', features: [feature()], exceededTransferLimit: true },
    { type: 'FeatureCollection', features: [feature()], crs: { type: 'name', properties: { name: 'EPSG:3857' } } },
    { type: 'Feature', geometry: null },
  ])('rejects malformed, projected, hotspot or incomplete input %#', (data) => {
    expect(() => boundaryShape(data, input)).toThrow();
  });
  it('requires HTTPS attribution and the source timestamp, never a check date', () => {
    expect(() => boundaryShape(feature(), { ...input, sourceUrl: 'javascript:alert(1)' })).toThrow();
    for (const observedAt of [undefined, '2025-13', '2025-02-30', '2025-02-30T12:00:00Z', 'yesterday']) {
      expect(() => boundaryShape(feature(), { ...input, observedAt })).toThrow();
    }
  });
  it('preserves published date precision and accepts official WGS84 CRS declarations', () => {
    for (const observedAt of ['2025', '2025-01', '2025-01-31']) {
      const data = { type: 'FeatureCollection', features: [feature()], crs: { type: 'name', properties: { name: 'EPSG:4326' } } };
      expect(boundaryShape(data, { ...input, observedAt }).geojson.features[0].properties.observedAt).toBe(observedAt);
    }
  });
  it('requires a district plan vintage', () => {
    expect(() => boundaryShape(feature(), { ...input, kind: 'district' })).toThrow();
    expect(boundaryShape(feature(), { ...input, kind: 'district', observedAt: undefined, vintage: '2024 adopted plan, 2025 election' }).geojson.features[0].properties.vintage).toContain('2025 election');
  });
});

describe('mergeBoundary', () => {
  it('replaces that kind only and preserves all other layers and their credits', () => {
    const old: PinSiteShapeJson = {
      source: 'OpenStreetMap', sourceUrl: 'https://www.openstreetmap.org/way/1',
      geojson: { type: 'FeatureCollection', features: [
        { ...feature(), properties: { kind: 'site' } } as PinSiteShapeJson['geojson']['features'][number],
        ...shape().geojson.features,
      ] },
    };
    const incoming = boundaryShape(feature(), { ...input, name: 'Revised perimeter' });
    const merged = mergeBoundary(old, incoming);
    expect(merged.geojson.features.map((f) => f.properties.kind)).toEqual(['site', 'wildfire']);
    expect(merged.geojson.features[0]).toEqual(old.geojson.features[0]);
    expect(merged.sourceUrl).toBe(old.sourceUrl);
    expect(merged.geojson.features[1].properties.sourceUrl).toBe(input.sourceUrl);
    expect(mergeBoundary(merged, incoming)).toEqual(merged);
    expect(mergeBoundary(null, incoming)).toEqual(incoming);
  });
});
