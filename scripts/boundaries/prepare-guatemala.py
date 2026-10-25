"""Derive 23 congressional districts from CONRED/OCHA administrative geometry.

Download the GeoJSON ZIP from https://data.humdata.org/dataset/cod-ab-gtm
and extract under .scrape/boundaries/gtm-conred-hdx. This source has matching
department and municipality polygons. Congress has a separate capital district
and the remainder of Guatemala department. Do not import 22 departments alone.
Requires shapely and pyproj. Existing source geometry is never repaired.
"""
from pathlib import Path
import json
from shapely.geometry import shape, mapping
from shapely import union_all, transform
from pyproj import Transformer

root = Path('.scrape/boundaries')
folder = root / 'gtm-conred-hdx'
departments = json.loads((folder / 'gtm_admin1.geojson').read_text())['features']
municipalities = json.loads((folder / 'gtm_admin2.geojson').read_text())['features']
capital = [f for f in municipalities if f['properties']['adm2_pcode'] == 'GT0101']
if len(departments) != 22 or len(capital) != 1:
    raise ValueError('Missing exact capital municipality or department set')
city = shape(capital[0]['geometry'])
metric = Transformer.from_crs('EPSG:4326', 'EPSG:6933', always_xy=True).transform
wgs84 = Transformer.from_crs('EPSG:6933', 'EPSG:4326', always_xy=True).transform
features = []
source_shapes = []
for f in departments:
    p = f['properties']
    g = shape(f['geometry'])
    if not g.is_valid or not city.is_valid:
        raise ValueError('Invalid source geometry')
    source_shapes.append(g)
    if p['adm1_pcode'] == 'GT01':
        if not city.covered_by(g):
            raise ValueError('Capital not contained by its own source department')
        features.append({'type': 'Feature', 'geometry': mapping(city), 'properties': {'name': 'Distrito Central (Guatemala municipality)'}})
        g = g.difference(city)
        name = 'Distrito de Guatemala (department excluding capital municipality)'
    else:
        name = p['adm1_name']
    features.append({'type': 'Feature', 'geometry': mapping(g), 'properties': {'name': name}})
if len(features) != 23:
    raise ValueError('Expected 23 electoral districts')
# Before generalisation, district coverage must exactly equal the source country.
coverage = union_all([shape(f['geometry']) for f in features])
if coverage.symmetric_difference(union_all(source_shapes)).area > 1e-10:
    raise ValueError('District split lost or added geographic area')
for f in features:
    g = transform(shape(f['geometry']), metric, interleaved=False).simplify(75, preserve_topology=True)
    f['geometry'] = mapping(transform(g, wgs84, interleaved=False))
(root / 'guatemala-23-districts.geojson').write_text(json.dumps({'type': 'FeatureCollection', 'features': features}, separators=(',', ':')))
print('23 districts; capital separated; exact pre-generalisation country coverage verified')
