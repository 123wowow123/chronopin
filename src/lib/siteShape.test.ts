import { describe, expect, it } from 'vitest';
import { SITE_KINDS, SITE_STYLE, epochKind, roundCoords, districtLayers, mapFeaturesNear } from './siteShape';

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
