"""Prepare reviewed US congressional plan comparisons from cached official sources.

Run from the repo root with pyshp, pyproj and shapely installed. The source
catalog documents HTTPS URLs. Store downloaded files under .scrape/boundaries.
The script validates counts, converts source CRSs and uses 100m topology-
preserving overview simplification for state shapefiles. It never repairs an
invalid source polygon or drops islands. GeoJSON and geometry stay ignored.
"""
from pathlib import Path
import json
import shapefile
import zipfile
from pyproj import CRS, Transformer
from shapely.geometry import shape, mapping
from shapely import transform

root = Path('.scrape/boundaries')
catalog = json.load(open('scripts/boundaries/us-redraw-sources-2026-10-25.json'))
# The downloader saves official archives. Extract only source geometry files.
for state in catalog['states']:
    archive = root / f"{state['id']}-official.zip"
    if not state.get('shapefileDirectory') or not archive.exists():
        continue
    with zipfile.ZipFile(archive) as zipped:
        for name in zipped.namelist():
            parts = Path(name).parts
            if '__MACOSX' in parts or Path(name).name.startswith('._') or Path(name).suffix.lower() not in ['.shp', '.shx', '.dbf', '.prj', '.cpg']:
                continue
            destination = root / state['shapefileDirectory'] / Path(name).name
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(zipped.read(name))
old = json.loads((root / 'us119-redraw.geojson').read_text())['features']
new = json.loads((root / 'us120-redraw.geojson').read_text())['features']
assert len(old) == len(new) == 435

def converted(state):
    files = [p for p in (root / state['shapefileDirectory']).rglob('*.shp') if '__MACOSX' not in p.parts and not p.name.startswith('._')]
    if len(files) != 1:
        raise ValueError('Expected one shapefile: ' + state['id'])
    path = files[0]
    metric = Transformer.from_crs(CRS.from_wkt(path.with_suffix('.prj').read_text()), 'EPSG:5070', always_xy=True).transform
    from_metric = Transformer.from_crs('EPSG:5070', 'EPSG:4326', always_xy=True).transform
    features = []
    district_ids = set()
    for record in shapefile.Reader(str(path), encoding='utf-8').iterShapeRecords():
        properties = record.record.as_dict()
        district_id = int(properties.get('DISTRICT', properties.get('DISTRICT_I')))
        if district_id in district_ids:
            raise ValueError('Duplicate official district ID: ' + state['id'])
        district_ids.add(district_id)
        source = shape(record.shape.__geo_interface__)
        if not source.is_valid:
            raise ValueError('Invalid original topology: ' + state['id'])
        source = transform(source, metric, interleaved=False).simplify(100, preserve_topology=True)
        geometry = transform(source, from_metric, interleaved=False)
        features.append({'type': 'Feature', 'geometry': mapping(geometry), 'properties': {}})
    if len(features) != state['count'] or district_ids != set(range(1, state['count'] + 1)):
        raise ValueError('Wrong count: ' + state['id'])
    return features

comparisons = []
defaults = []
by_state = {s['fips']: s for s in catalog['states']}
for f in new:
    state = f['properties']['STATE']
    if state not in by_state:
        defaults.append({**f, 'properties': {'kind': 'district', 'name': 'US House — other states, 2026 election districts', 'vintage': '120th Congress, 2026 election; reviewed 2026-10-25', 'source': 'US Census Bureau, TIGERweb', 'sourceUrl': catalog['afterCensusSourceUrl']}})
for state in catalog['states']:
    before = [f for f in old if f['properties']['STATE'] == state['fips']]
    after = converted(state) if state.get('shapefileDirectory') else [f for f in new if f['properties']['STATE'] == state['fips']]
    if len(before) != len(after) or len(before) != state['count']:
        raise ValueError('Plan count mismatch: ' + state['id'])
    def plan(features, label, status, source, url, vintage):
        props = {'kind': 'district', 'name': state['name'] + ' — ' + label,
                 'vintage': vintage, 'source': source, 'sourceUrl': url}
        return {'label': label, 'status': status, 'source': source, 'sourceUrl': url,
                'vintage': vintage, 'features': [{**f, 'properties': props.copy()} for f in features]}
    earlier = plan(before, state['beforeLabel'], state['beforeStatus'], 'US Census Bureau, 119th Congress', catalog['beforeSourceUrl'], '119th Congress (2025–2026), used in the 2024 election')
    later = plan(after, state['afterLabel'], state['afterStatus'], state['source'], state['sourceUrl'], state['vintage'])
    comparisons.append({'id': state['id'], 'name': state['name'], 'before': earlier, 'after': later})
    defaults.extend(earlier['features'] if state['afterStatus'] == 'blocked' else later['features'])
assert len(defaults) == 435
(root / 'us2026-defaults.geojson').write_text(json.dumps({'type': 'FeatureCollection', 'features': defaults}, separators=(',', ':')))
(root / 'us2026-redraws.json').write_text(json.dumps(comparisons, separators=(',', ':')))
print(f'{len(defaults)} default voting districts, {len(comparisons)} state comparisons')
