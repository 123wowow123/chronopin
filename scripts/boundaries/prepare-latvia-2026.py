"""Build five Saeima constituencies from official 2026 administrative polygons.

Source: Ministry administrative territories 2026, CC0, EPSG:3059, via
https://data.gov.lv/dati/dataset/atr . Save its GeoJSON download to
.scrape/boundaries/latvia-2026-admin.geojson. Membership follows the current
Saeima Election Law, section 7(2): https://m.likumi.lv/ta/id/35261 .
Requires shapely and pyproj. Every source municipality/city must be assigned
exactly once; no inferred cultural/planning-region boundaries are used.
"""
from pathlib import Path
import json
from shapely.geometry import shape, mapping
from shapely import union_all, transform
from pyproj import Transformer

root = Path('.scrape/boundaries')
data = json.loads((root / 'latvia-2026-admin.geojson').read_text())
if data.get('crs', {}).get('properties', {}).get('name') != 'urn:ogc:def:crs:EPSG::3059':
    raise ValueError('Expected source EPSG:3059')
groups = {
    'Rīga': ['Rīga'],
    'Vidzeme': [x + ' novads' for x in ['Ādažu', 'Alūksnes', 'Cēsu', 'Gulbenes', 'Ķekavas', 'Limbažu', 'Madonas', 'Mārupes', 'Ogres', 'Olaines', 'Ropažu', 'Salaspils', 'Saulkrastu', 'Siguldas', 'Smiltenes', 'Valkas', 'Valmieras']] + ['Jūrmala'],
    'Latgale': [x + ' novads' for x in ['Augšdaugavas', 'Balvu', 'Krāslavas', 'Līvānu', 'Ludzas', 'Preiļu', 'Rēzeknes']] + ['Daugavpils', 'Rēzekne'],
    'Kurzeme': [x + ' novads' for x in ['Dienvidkurzemes', 'Kuldīgas', 'Saldus', 'Talsu', 'Ventspils']] + ['Liepāja', 'Ventspils'],
    'Zemgale': [x + ' novads' for x in ['Aizkraukles', 'Bauskas', 'Dobeles', 'Jelgavas', 'Jēkabpils', 'Tukuma']] + ['Jelgava'],
}
source = {f['properties']['nosaukums'].replace(' nov.', ' novads'): f for f in data['features']}
names = [name for members in groups.values() for name in members]
if len(names) != len(set(names)) or set(names) != set(source):
    raise ValueError(f'Membership mismatch: missing {set(source)-set(names)}, extra {set(names)-set(source)}')
project = Transformer.from_crs('EPSG:3059', 'EPSG:4326', always_xy=True).transform
features = []
for district, members in groups.items():
    polygons = [shape(source[name]['geometry']) for name in members]
    if any(not p.is_valid for p in polygons):
        raise ValueError('Invalid municipality in ' + district)
    polygon = union_all(polygons)
    if not polygon.is_valid:
        raise ValueError('Invalid district union')
    # Overview in the source's metric CRS; preserve islands and holes.
    simplified = polygon.simplify(75, preserve_topology=True)
    features.append({'type': 'Feature', 'geometry': mapping(transform(simplified, project, interleaved=False)),
                     'properties': {'district': district, 'members': members}})
(root / 'latvia-2026-saeima.geojson').write_text(json.dumps({'type': 'FeatureCollection', 'features': features}, separators=(',', ':')))
print(f'{len(source)} municipalities/cities matched exactly once to five section-7 constituencies')
