import { describe, expect, it } from 'vitest';
import { SITE_KINDS, SITE_STYLE, epochKind, roundCoords, districtLayers, mapFeaturesNear, simplifyForDisplay, type PinSiteShapeJson } from './siteShape';

describe('epochKind', () => {
  it("reads Epoch AI's annotation types as site kinds, in any case", () => {
    expect(epochKind('Building')).toBe('building');
    expect(epochKind('Cooling')).toBe('cooling');
    expect(epochKind('Backup generator')).toBe('generator');
    expect(epochKind('Power substation')).toBe('substation');
    expect(epochKind('Power generator')).toBe('power');
    expect(epochKind('BUILDING')).toBe('building');
  });
  it('leaves out a type it does not know', () => {
    expect(epochKind('Parking lot')).toBeNull();
    expect(epochKind(undefined)).toBeNull();
  });
});

describe('roundCoords', () => {
  it('rounds nested coordinates to six decimals', () => {
    expect(roundCoords([[[-90.0967254321, 32.5922181234]]])).toEqual([[[-90.096725, 32.592218]]]);
  });
});

describe('SITE_STYLE', () => {
  it('styles every kind the map draws', () => {
    for (const kind of SITE_KINDS) expect(SITE_STYLE[kind].color).toMatch(/^#[0-9a-f]{6}$/);
    expect(SITE_KINDS[0]).toBe('site');
  });
});


describe('district redraw display', () => {
  const feature = (longitude: number) => ({ type: 'Feature' as const, geometry: { type: 'Polygon' as const, coordinates: [[[longitude, 50], [longitude + 0.1, 50], [longitude, 51], [longitude, 50]]] }, properties: { kind: 'district' as const } });
  const plan = (label: string, longitude: number) => ({ label, vintage: '2026 plan', status: 'inEffect' as const, source: 'Election office', sourceUrl: 'https://example.com/plan', features: [feature(longitude)] });
  const redraw = { id: 'example', name: 'Example state', before: plan('2022 plan', 1), after: plan('2026 plan', 2) };
  const shape = { geojson: { type: 'FeatureCollection' as const, features: [feature(3)], districtRedraws: [redraw] }, source: 'Election office', sourceUrl: null };
  it('shows only default boundaries until a comparison is selected', () => {
    expect(districtLayers(shape, null, 'compare')).toEqual([{ version: null, features: shape.geojson.features }]);
    expect(districtLayers(shape, redraw, 'before').flatMap((x) => x.features)).toEqual(redraw.before.features);
    expect(districtLayers(shape, redraw, 'after').flatMap((x) => x.features)).toEqual(redraw.after.features);
    expect(districtLayers(shape, redraw, 'compare').filter((x) => x.features.length).map((x) => x.version)).toEqual(['before', 'after']);
  });
  it('unwraps displayed antimeridian islands without mutating stored WGS84 coordinates', () => {
    const features = [feature(179)];
    const wrapped = mapFeaturesNear(features, -77);
    expect((wrapped[0].geometry.coordinates as number[][][])[0][0][0]).toBe(-181);
    expect((features[0].geometry.coordinates as number[][][])[0][0][0]).toBe(179);
  });
});

describe('simplifyForDisplay', () => {
  const circle = (n: number, r: number, cx = 0, cy = 0): [number, number][] => {
    const pts = Array.from({ length: n }, (_, i): [number, number] => [cx + r * Math.cos((2 * Math.PI * i) / n), cy + r * Math.sin((2 * Math.PI * i) / n)]);
    return [...pts, pts[0]];
  };
  const shape = (coordinates: unknown): PinSiteShapeJson => ({
    geojson: { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'MultiPolygon', coordinates }, properties: { kind: 'wildfire' } }] },
    source: 's',
    sourceUrl: null,
  });

  it('leaves a shape under the budget untouched', () => {
    const small = shape([[circle(100, 1)]]);
    expect(simplifyForDisplay(small)).toBe(small);
  });

  it('shrinks an oversized perimeter under the budget, keeping closed rings and dropping specks', () => {
    const big = shape([[circle(200000, 1)], [circle(8, 0.00001, 5, 5)]]);
    const out = simplifyForDisplay(big, 5000);
    const polygons = out.geojson.features[0].geometry.coordinates as [number, number][][][];
    const ring = polygons[0][0];
    expect(ring.length).toBeLessThanOrEqual(5000);
    expect(ring.length).toBeGreaterThan(50);
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    expect(polygons).toHaveLength(1);
    expect((big.geojson.features[0].geometry.coordinates as unknown[][][]).length).toBe(2);
  });
});
