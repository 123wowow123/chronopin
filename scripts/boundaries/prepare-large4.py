"""Prepare two reviewed ballot-jurisdiction maps; no database writes.

Run fetch-large4.mjs first. Requires Shapely and pyproj. The source's
generalised state rings cross at five river boundaries; substitute the
corresponding valid full-resolution Census polygons, never repair the lines.
"""
import json
from pathlib import Path

from pyproj import Transformer
from shapely import transform
from shapely.geometry import mapping, shape

root = Path('.scrape/boundaries')
state_url = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer/0'
district_url = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/0'
county_url = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer/1'
nara = 'https://www.archives.gov/electoral-college/allocation'
# NARA's allocation table explicitly applies to both 2024 and 2028.
votes = {
    '01': 9, '02': 3, '04': 11, '05': 6, '06': 54, '08': 10, '09': 7,
    '10': 3, '11': 3, '12': 30, '13': 16, '15': 4, '16': 4, '17': 19,
    '18': 11, '19': 6, '20': 6, '21': 8, '22': 8, '23': 4, '24': 10,
    '25': 11, '26': 15, '27': 10, '28': 6, '29': 10, '30': 4, '31': 5,
    '32': 6, '33': 4, '34': 14, '35': 5, '36': 28, '37': 16, '38': 3,
    '39': 17, '40': 7, '41': 8, '42': 19, '44': 4, '45': 9, '46': 3,
    '47': 11, '48': 40, '49': 6, '50': 3, '51': 13, '53': 12,
    '54': 4, '55': 10, '56': 3,
}
assert len(votes) == 51 and sum(votes.values()) == 538
metric = Transformer.from_crs(4326, 5070, always_xy=True).transform
wgs84 = Transformer.from_crs(5070, 4326, always_xy=True).transform


def read(file):
    data = json.loads((root / file).read_text())
    assert not data.get('exceededTransferLimit')
    return data['features']


def overview(feature):
    g = shape(feature['geometry'])
    assert g.is_valid and not g.is_empty
    projected = transform(g, metric, interleaved=False)
    simplified = projected.simplify(50, preserve_topology=True)
    parts = lambda x: len(x.geoms) if x.geom_type == 'MultiPolygon' else 1
    assert parts(projected) == parts(simplified)
    assert simplified.is_valid and abs(simplified.area / projected.area - 1) < 0.01
    geographic = transform(simplified, wgs84, interleaved=False)
    assert geographic.is_valid and not geographic.is_empty
    return mapping(geographic)


def feature(name, vintage, url, geometry):
    assert shape(geometry).is_valid and not shape(geometry).is_empty
    return {'type': 'Feature', 'properties': {
        'name': name, 'vintage': vintage, 'source': 'US Census Bureau, TIGERweb',
        'sourceUrl': url,
    }, 'geometry': geometry}


states = read('electoral-college-states2026.geojson')
assert len(states) == 51 and {f['properties']['GEOID'] for f in states} == set(votes)
replacements = {f['properties']['GEOID']: f for f in read('electoral-college-states2026-full.geojson')}
assert set(replacements) == {'31', '40', '48', '38', '27'}
invalid = {f['properties']['GEOID'] for f in states if not shape(f['geometry']).is_valid}
assert invalid == set(replacements)
vintage = ('January 2026 Census state geography and current 120th-Congress '
           'district geography as 2028 context; current electoral-allocation '
           'rules checked 2026-10-25, not a guarantee of future district lines '
           'or laws. Maine and Nebraska statewide two-elector areas intentionally '
           'overlap their one-elector congressional districts.')
features = []
for f in sorted(states, key=lambda f: f['properties']['GEOID']):
    code, name = f['properties']['GEOID'], f['properties']['NAME']
    count = 2 if code in {'23', '31'} else votes[code]
    geometry = overview(replacements[code]) if code in replacements else f['geometry']
    features.append(feature(f'{name} — statewide presidential vote ({count} electors)', vintage, state_url, geometry))
districts = read('electoral-college-districts2026-full.geojson')
assert len(districts) == 5 and {f['properties']['GEOID'] for f in districts} == {'2301', '2302', '3101', '3102', '3103'}
for f in sorted(districts, key=lambda f: f['properties']['GEOID']):
    p = f['properties']
    assert p['CDSESSN'] == '120'
    name = 'Maine' if p['STATE'] == '23' else 'Nebraska'
    features.append(feature(f'{name} — congressional district {int(p["CD120"])} presidential vote (1 elector)', vintage, district_url, overview(f)))
assert len(features) == 56 and sum(2 if s in {'23', '31'} else n for s, n in votes.items()) + len(districts) == 538
(root / 'electoral-college-56.geojson').write_text(json.dumps(
    {'type': 'FeatureCollection', 'features': features}, ensure_ascii=False, separators=(',', ':')))
bay = read('large4-bay-counties2026.geojson')
assert len(bay) == 5 and {f['properties']['GEOID'] for f in bay} == {'06001', '06013', '06075', '06081', '06085'}
bay_vintage = 'January 2026 Census counties; five-county Public Transit Revenue Measure District for the November 2026 ballot, not the nine-county MTC region or internal council/precinct boundaries'
bay_features = [feature('Connect Bay Area — ' + f['properties']['NAME'], bay_vintage, county_url, f['geometry']) for f in sorted(bay, key=lambda f: f['properties']['GEOID'])]
(root / 'large4-connect-bay-area.geojson').write_text(json.dumps(
    {'type': 'FeatureCollection', 'features': bay_features}, ensure_ascii=False, separators=(',', ':')))
entries = [
    {'pinId': 1950, 'pinTitle': 'Americans Vote in the 2028 U.S. Presidential Election',
     'kind': 'district', 'name': 'US presidential election — 51 statewide/DC areas plus five Maine/Nebraska district areas; current geography for 2028',
     'vintage': vintage, 'source': 'US Census Bureau; allocation scope: National Archives',
     'sourceUrl': nara, 'file': str(root / 'electoral-college-56.geojson'), 'preserveFeatureCredits': True},
    {'pinId': 3676, 'pinTitle': 'Connect Bay Area Transit Tax Qualifies for the November 2026 Ballot',
     'kind': 'district', 'name': 'Connect Bay Area — five-county voting district',
     'vintage': bay_vintage, 'source': 'US Census Bureau; ballot scope: Metropolitan Transportation Commission',
     'sourceUrl': 'https://mtc.ca.gov/news/connect-bay-area-transit-measure-certified-november-2026-ballot',
     'file': str(root / 'large4-connect-bay-area.geojson'), 'preserveFeatureCredits': True},
]
Path('scripts/boundaries/backfill-large4-2026-10-25.prod.json').write_text(json.dumps(entries, ensure_ascii=False, indent=2) + '\n')
(root / 'large4-preparation.json').write_text(json.dumps({
    'pins': 2, 'features': 61, 'electoralCollegeVotingAreas': 56,
    'allocatedElectors': 538, 'fullResolutionStateSubstitutions': sorted(replacements),
    'stateCodes': sorted(votes), 'districtCodes': sorted(f['properties']['GEOID'] for f in districts),
    'bayCountyCodes': sorted(f['properties']['GEOID'] for f in bay),
}, indent=2))
print('Prepared 61 valid ballot-area features for two pins; allocations reconcile to 538 electors')
