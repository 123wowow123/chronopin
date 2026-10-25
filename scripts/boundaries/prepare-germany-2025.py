"""Convert the Federal Returning Officer's generalised WGS84 shapefile.

Download https://bundeswahlleiterin.de/dam/jcr/556bec9c-be80-4818-a368-fe6596f15f08/btw25_geometrie_wahlkreise_shp_geo.zip
into .scrape/boundaries/germany2025-shp.zip over verified HTTPS first.
Install pyshp in a temporary venv, then run this script from the repo root.
"""
from pathlib import Path
import json
import zipfile
import shapefile

root = Path('.scrape/boundaries')
name = 'btw25_geometrie_wahlkreise_shp_geo'
with zipfile.ZipFile(root / 'germany2025-shp.zip') as archive:
    for suffix in ['shp', 'shx', 'dbf', 'prj', 'cpg']:
        (root / f'{name}.{suffix}').write_bytes(archive.read(f'{name}.{suffix}'))
reader = shapefile.Reader(str(root / f'{name}.shp'), encoding='utf-8')
features = [
    {'type': 'Feature', 'geometry': record.shape.__geo_interface__,
     'properties': {key: str(value) for key, value in record.record.as_dict().items()}}
    for record in reader.iterShapeRecords()
]
if len(features) != 299:
    raise ValueError(f'Expected 299 constituencies, got {len(features)}')
output = root / 'germany2025.geojson'
output.write_text(json.dumps({'type': 'FeatureCollection', 'features': features}, separators=(',', ':')))
print(f'{len(features)} districts; {output.stat().st_size} bytes; {output}')
