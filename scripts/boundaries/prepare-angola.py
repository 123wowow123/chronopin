"""Prepare 21 current provinces and an explicit 18/21 historical comparison.

Run fetch-angola.mjs first. Requires Shapely. Preserves source coordinate
precision, islands and holes; no simplification or geometric repairs.
"""
import json
from pathlib import Path

from shapely import union_all
from shapely.geometry import shape

root = Path('.scrape/boundaries')
current_url = 'https://services.arcgis.com/iQ1dY19aHwbSDYIF/ArcGIS/rest/services/WB_GAD/FeatureServer/17'
old_url = 'https://www.geoboundaries.org/api/current/gbOpen/AGO/ADM1/'
source = 'World Bank Global Administrative Divisions (CC BY 4.0)'
old_source = 'US Census Bureau 2021 via geoBoundaries AGO-ADM1-26408823 (Public Domain)'
vintage = ('World Bank GAD service updated 2026-09-16; post-2024 division effective '
           '2025-01-01, checked 2026-10-25. Current 21 provincial electoral areas '
           'as context for 2027; national-list and presidential geography not '
           'drawn separately; not a final 2027 polling map or seat allocation.')
old_vintage = ('2021 Census province geometry via geoBoundaries; 18-province '
               'historical reference, superseded by the reorganisation effective '
               '2025-01-01. Cross-source coast/line differences are not all legal redraws.')
expected = {
    'AGO001': 'Bengo', 'AGO002': 'Benguela', 'AGO003': 'Bié', 'AGO004': 'Cabinda',
    'AGO006': 'Cuanza Norte', 'AGO007': 'Cuanza Sul', 'AGO008': 'Cunene',
    'AGO009': 'Huambo', 'AGO010': 'Huíla', 'AGO011': 'Luanda',
    'AGO012': 'Lunda Norte', 'AGO013': 'Lunda Sul', 'AGO014': 'Malanje',
    'AGO015': 'Moxico', 'AGO016': 'Namibe', 'AGO017': 'Uíge', 'AGO018': 'Zaire',
    'AGO019': 'Cuando', 'AGO020': 'Cubango', 'AGO021': 'Icolo E Bengo',
    'AGO022': 'Moxico Leste',
}
current = json.loads((root / 'angola-wb-large5.geojson').read_text())
old = json.loads((root / 'angola-2021-provinces.geojson').read_text())
assert len(current['features']) == len(expected) == 21
assert {f['properties']['ADM1CD_t']: f['properties']['NAM_1'] for f in current['features']} == expected
assert len(old['features']) == len({f['properties']['shapeID'] for f in old['features']}) == 18
assert {f['properties']['shapeName'] for f in old['features']} == (
    set(expected.values()) - {'Cuando', 'Cubango', 'Icolo E Bengo', 'Moxico Leste'}
) | {'Cuando Cubango'}
assert all(f['properties']['ISO_A3'] == 'AGO' for f in current['features'])
assert all(f['properties']['shapeGroup'] == 'AGO' for f in old['features'])
assert any(f['properties']['shapeName'] == 'Cuando Cubango' for f in old['features'])


def prepare(features, field, label, credit, url):
    output = []
    geometries = []
    for f in sorted(features, key=lambda f: f['properties'][field]):
        g = shape(f['geometry'])
        assert g.geom_type in {'Polygon', 'MultiPolygon'} and g.is_valid and not g.is_empty
        xmin, ymin, xmax, ymax = g.bounds
        assert 11 < xmin <= xmax < 25 and -19 < ymin <= ymax < -4
        geometries.append(g)
        output.append({'type': 'Feature', 'geometry': f['geometry'], 'properties': {
            'kind': 'district', 'name': 'Angola — ' + f['properties'][field],
            'vintage': label, 'source': credit, 'sourceUrl': url,
        }})
    union = union_all(geometries)
    assert union.is_valid
    overlap = sum(g.area for g in geometries) - union.area
    assert abs(overlap) < 1e-8
    parts = sum(len(g.geoms) if g.geom_type == 'MultiPolygon' else 1 for g in geometries)
    return output, {'features': len(output), 'components': parts, 'overlapSquareDegrees': overlap}


features, report = prepare(current['features'], 'NAM_1', vintage, source, current_url)
historical, old_report = prepare(old['features'], 'shapeName', old_vintage, old_source, old_url)
assert report['components'] == 115
(root / 'angola-provinces-21.geojson').write_text(json.dumps(
    {'type': 'FeatureCollection', 'features': features}, ensure_ascii=False, separators=(',', ':')))
redraws = [{
    'id': 'angola-provinces', 'name': 'Angola — 18 to 21 provinces',
    'before': {'label': '18 provinces — 2021 historical geography', 'status': 'superseded',
               'source': old_source, 'sourceUrl': old_url, 'vintage': old_vintage, 'features': historical},
    'after': {'label': '21 provinces — current geography', 'status': 'inEffect',
              'source': source, 'sourceUrl': current_url, 'vintage': vintage, 'features': features},
}]
(root / 'angola-province-redraws.json').write_text(json.dumps(redraws, ensure_ascii=False, separators=(',', ':')))
entry = {
    'pinId': 2361, 'pinTitle': 'Angola Elects a National Assembly and President',
    'kind': 'district', 'name': 'Angola — 21 provincial electoral areas; current geography for 2027',
    'vintage': vintage, 'source': source, 'sourceUrl': current_url,
    'file': str(root / 'angola-provinces-21.geojson'), 'preserveFeatureCredits': True,
    'redrawFile': str(root / 'angola-province-redraws.json'),
}
Path('scripts/boundaries/backfill-large5-2026-10-25.prod.json').write_text(json.dumps([entry], ensure_ascii=False, indent=2) + '\n')
(root / 'angola-preparation.json').write_text(json.dumps({'current': report, 'historical': old_report,
    'defaultFeatures': 21, 'comparisonFeatures': 39, 'coordinatePrecisionPreserved': True}, indent=2))
print('Prepared 21 valid current provinces and 18/21 before-after comparison')
