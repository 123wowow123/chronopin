"""Convert Elections Canada's 2023 Representation Order shapefile for map replay.

Download https://www.elections.ca/res/cir/mapsCorner/edb/FederalElectoralDistricts_SHP.zip
into .scrape/boundaries/canada-2023-shp.zip first (verified HTTPS). In a temporary
venv install pyshp, pyproj and shapely; run this script from the repository root.
The downloaded archive and generated polygons remain git-ignored.
"""
from pathlib import Path
import json
import zipfile
import shapefile
from pyproj import CRS, Transformer
from shapely.geometry import shape, mapping
from shapely import transform

root = Path('.scrape/boundaries')
with zipfile.ZipFile(root / 'canada-2023-shp.zip') as archive:
    # Only the known dataset files; ignore unexpected archive paths.
    for name in ['ED_CF.shp', 'ED_CF.shx', 'ED_CF.dbf', 'ED_CF.prj', 'ED_CF.cpg']:
        (root / name).write_bytes(archive.read('FederalElectoralDistricts_SHP/' + name))
reader = shapefile.Reader(str(root / 'ED_CF.shp'), encoding='utf-8')
projection = CRS.from_wkt((root / 'ED_CF.prj').read_text())
if not projection.is_projected or projection.axis_info[0].unit_name != 'metre':
    raise ValueError('Expected Elections Canada projected coordinates in metres')
project = Transformer.from_crs(projection, 'EPSG:4326', always_xy=True).transform
features = []
for record in reader.iterShapeRecords():
    geometry = shape(record.shape.__geo_interface__)
    if not geometry.is_valid:
        raise ValueError('Invalid source district topology')
    # 250m tolerance in the source's metric CRS, preserving holes and islands.
    simplified = geometry.simplify(250, preserve_topology=True)
    properties = record.record.as_dict()
    features.append({'type': 'Feature', 'geometry': mapping(transform(simplified, project, interleaved=False)),
                     'properties': {key: str(value) for key, value in properties.items()}})
if len(features) != 343:
    raise ValueError(f'Expected 343 federal districts, got {len(features)}')
output = root / 'canada-2023.geojson'
output.write_text(json.dumps({'type': 'FeatureCollection', 'features': features}, separators=(',', ':')))
print(f'{len(features)} districts; {output.stat().st_size} bytes; {output}')
