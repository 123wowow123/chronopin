"""Prepare INE's October 2026 federal single-member district overview.

Download https://pautas.ine.mx/transparencia/mapas/cob_2025/DISTRITO_FEDERAL.zip
to .scrape/boundaries/mexico-federal-2026.zip first. Requires pyshp,
Shapely and pyproj. No database writes. The source page, rather than the
historical URL directory, establishes the October 1, 2026 effective date.
"""
import json
import zipfile
from collections import Counter
from pathlib import Path

import shapefile
from pyproj import CRS, Transformer
from shapely import union_all
from shapely.geometry import mapping, shape
from shapely.ops import transform

root = Path('.scrape/boundaries')
with zipfile.ZipFile(root / 'mexico-federal-2026.zip') as archive:
    archive.extractall(root / 'mexico-federal-2026')
path = next((root / 'mexico-federal-2026').rglob('*.shp'))
reader = shapefile.Reader(str(path), encoding='utf-8')
expected = [3, 9, 2, 2, 8, 2, 13, 9, 22, 4, 15, 8, 7, 20, 40, 11,
            5, 3, 14, 10, 16, 6, 4, 7, 7, 7, 6, 8, 3, 19, 6, 4]
assert len(reader) == sum(expected) == 300
counts = Counter(record['entidad'] for record in reader.records())
assert counts == dict(enumerate(expected, 1))
to_wgs84 = Transformer.from_crs(
    CRS.from_wkt(path.with_suffix('.prj').read_text()), 4326, always_xy=True
).transform
source_url = 'https://pautas.ine.mx/transparencia/mapas/'
vintage = ('INE cartography effective 2026-10-01; 50m overview of 300 federal '
           'single-member districts for 2027 context. Five proportional-list '
           'regions, local districts and polling sections are not drawn; '
           'not a claim to the separately scheduled November election-product release.')
features, original, seen, report = [], [], set(), []
for record, raw in zip(reader.records(), reader.shapes()):
    state, district = record['entidad'], record['distrito_f']
    key = (state, district)
    assert key not in seen and 1 <= district <= expected[state - 1]
    seen.add(key)
    geometry = shape(raw.__geo_interface__)
    assert geometry.is_valid and not geometry.is_empty
    original.append(geometry)
    overview = geometry.simplify(50, preserve_topology=True)
    assert overview.is_valid and not overview.is_empty
    parts = lambda g: len(g.geoms) if g.geom_type == 'MultiPolygon' else 1
    assert parts(geometry) == parts(overview)
    area_delta = abs(overview.area / geometry.area - 1)
    assert area_delta < 0.01
    geographic = transform(to_wgs84, overview)
    assert geographic.is_valid and not geographic.is_empty
    xmin, ymin, xmax, ymax = geographic.bounds
    assert -119 < xmin <= xmax < -86 and 14 < ymin <= ymax < 33
    features.append({'type': 'Feature', 'properties': {
        'name': f'Mexico — federal district {state:02d}-{district:02d}',
        'vintage': vintage, 'source': 'Instituto Nacional Electoral (INE)',
        'sourceUrl': source_url,
    }, 'geometry': mapping(geographic)})
    report.append({'entity': state, 'district': district,
                   'parts': parts(overview), 'relativeAreaChange': area_delta})
assert seen == {(s, d) for s, n in enumerate(expected, 1) for d in range(1, n + 1)}
features.sort(key=lambda f: f['properties']['name'])
(root / 'mexico-federal-300.geojson').write_text(json.dumps(
    {'type': 'FeatureCollection', 'features': features}, ensure_ascii=False,
    separators=(',', ':')))
union = union_all(original)
# Preserve the source's tiny overlaps instead of silently repairing legal lines.
overlap = sum(g.area for g in original) - union.area
assert 0 <= overlap < 1000
(root / 'mexico-preparation.json').write_text(json.dumps({
    'features': 300, 'effectiveDate': '2026-10-01', 'sourceOverlapSquareMetres': overlap,
    'sourceAreaSquareMetres': union.area, 'districts': report,
}, indent=2))
entry = {'pinId': 2357, 'pinTitle': 'Mexico Elects a New Chamber of Deputies',
         'kind': 'district', 'name': 'Mexico — 300 federal single-member districts; proportional-list regions not drawn',
         'vintage': vintage, 'source': 'Instituto Nacional Electoral (INE)',
         'sourceUrl': source_url, 'file': str(root / 'mexico-federal-300.geojson'),
         'preserveFeatureCredits': True}
Path('scripts/boundaries/backfill-large3-2026-10-25.prod.json').write_text(
    json.dumps([entry], ensure_ascii=False, indent=2) + '\n')
print('Prepared 300 distinct valid INE federal district features')
