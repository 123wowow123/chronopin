"""Prepare IEBC's constituency geometry distributed by OCHA HDX.

Download the Admin2-constituencies.zip resource from
https://data.humdata.org/dataset/kenya-elections into
.scrape/boundaries/kenya-iebc-hdx.zip. Requires pyshp, shapely and pyproj.
Never use administrative subcounty shapes in place of these constituencies.
"""
from pathlib import Path
import json
import zipfile
import shapefile
from shapely.geometry import shape, mapping
from shapely import transform
from pyproj import Transformer

root = Path('.scrape/boundaries')
with zipfile.ZipFile(root / 'kenya-iebc-hdx.zip') as archive:
    for suffix in ['shp', 'shx', 'dbf', 'prj']:
        (root / f'kenya-iebc-constituencies.{suffix}').write_bytes(archive.read(f'constituencies.{suffix}'))
reader = shapefile.Reader(str(root / 'kenya-iebc-constituencies.shp'))
to_m = Transformer.from_crs('EPSG:4326', 'EPSG:6933', always_xy=True).transform
from_m = Transformer.from_crs('EPSG:6933', 'EPSG:4326', always_xy=True).transform
features, unassigned, codes = [], [], set()
for record in reader.iterShapeRecords():
    p = record.record.as_dict()
    geometry = shape(record.shape.__geo_interface__)
    if not geometry.is_valid:
        raise ValueError('Invalid IEBC source geometry')
    if not p['CONSTITUEN'].strip():
        # These five nonzero-area pieces have no constituency name and code 0.
        # Record them explicitly; assigning them to a constituency would invent data.
        if p['CONST_CODE'] != 0:
            raise ValueError('Unexpected unnamed constituency')
        unassigned.append({'sourceObjectId': p['OBJECTID'], 'code': 0, 'areaSquareDegrees': geometry.area})
        continue
    code = int(p['CONST_CODE'])
    if code in codes:
        raise ValueError('Duplicate IEBC constituency code')
    codes.add(code)
    # Metric overview only. Preserve topology and every named district/island.
    simplified = transform(geometry, to_m, interleaved=False).simplify(75, preserve_topology=True)
    features.append({'type': 'Feature', 'geometry': mapping(transform(simplified, from_m, interleaved=False)),
                     'properties': {'code': code, 'name': p['CONSTITUEN'], 'county': p['COUNTY_NAM']}})
if codes != set(range(1, 291)) or len(unassigned) != 5:
    raise ValueError('Expected 290 consecutively coded constituencies and five unassigned records')
(root / 'kenya-iebc-290.geojson').write_text(json.dumps({'type': 'FeatureCollection', 'features': features}, separators=(',', ':')))
(root / 'kenya-iebc-unassigned.json').write_text(json.dumps(unassigned, indent=2))
print('290 unique IEBC constituencies; five unnamed code-0 source pieces documented, not assigned')
