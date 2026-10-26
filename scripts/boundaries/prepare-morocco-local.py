"""Prepare 65 whole-province local constituencies plus 12 regional-list areas.

Requires the downloaded 2011 gazette annex, current PJD candidate roster JS,
and Communes du Maroc province/region GeoJSONs under .scrape/boundaries.
Uses the legal annex for composition and the party's 2026 roster as a current
name cross-check. Never substitutes a whole province for its multiple seats.
"""
import ast
import hashlib
import json
import re
from pathlib import Path

from shapely.geometry import shape

root = Path('.scrape/boundaries')
provinces = json.loads((root / 'morocco-provinces-round3.geojson').read_text())['features']
regions = json.loads((root / 'morocco-regions-gap2.geojson').read_text())['features']
js = (root / 'morocco-pjd-data-round3.js').read_text()
start = js.index('const rows = [') + len('const rows = ')
rows = ast.literal_eval(js[start:js.index('\n  ];', start) + 4])
assert len(rows) == 104 and sum(r[3] == 'م' for r in rows) == 92
# Reviewed legal-annex PDF pages (one-based), not inferred from name matching.
page_codes = {
    31: ['04.501'],
    32: ['06.385', '06.355', '06.371', '09.001', '09.273', '09.163'],
    35: ['09.581', '08.401', '08.587', '08.577', '10.473', '01.051', '03.561', '02.265'],
    36: ['05.091'],
    37: ['05.255', '03.591', '03.451', '03.131', '10.261', '09.551', '10.071', '11.221', '10.521'],
    38: ['04.481', '04.491', '11.321', '11.121', '11.537', '07.161', '07.041', '07.191', '07.211', '07.427', '03.061', '03.171', '03.271', '05.301', '08.201', '08.363', '12.391', '12.066', '02.411', '02.275', '02.113', '02.533', '02.251', '02.381'],
    39: ['02.167', '07.431', '06.181', '06.467', '07.585', '06.461', '05.311', '06.111', '06.117', '01.511', '01.227', '01.571', '01.573', '01.331', '01.151', '01.405'],
}
pages = {code: page for page, codes in page_codes.items() for code in codes}
assert len(pages) == 65 and len(provinces) == 75
excluded = {'03.231': 2, '03.531': 2, '04.281': 2, '04.291': 2, '04.421': 2,
            '04.441': 2, '05.081': 2, '06.141': 8, '07.351': 3, '09.541': 2}
assert set(pages) | set(excluded) == {f['properties']['code'] for f in provinces}
assert sum(excluded.values()) == 27
def norm(value):
    return re.sub(r'[^\u0621-\u064a]', '', value.replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا').replace('ة', 'ه').replace('ى', 'ي'))
aliases = {'02.251': 'فجيج - بوعرفة'}  # Figuig/Bouarfa: explicit roster label.
source = 'OpenStreetMap contributors / Ousama Ajebbar, Communes du Maroc (ODbL 1.0; original database downloadable at source link)'
source_url = 'https://communes.pages.dev/fr/docs/downloads/'
legal_url = 'https://archive.gazettes.africa/archive/ma/2011/ma-bulletin-officiel-dated-2011-11-03-no-5992.pdf'
roster_url = 'https://candidats.pjd.ma/js/data.js'
scope = ('2026 partial coverage: 65 of 92 local constituencies and all 12 regional-list areas. '
         'The 27 local constituencies in ten split provinces/prefectures are NOT mapped. '
         'OSM-derived cartographic outlines downloaded 2026-10-25, not legally surveyed electoral lines. '
         'Minor source overlaps retained. Includes source administrative geography in disputed Western Sahara; no sovereignty determination.')
features, crosswalk = [], []
assert len(regions) == 12
for f in regions:
    p = f['properties']
    assert shape(f['geometry']).is_valid
    features.append({'type': 'Feature', 'geometry': f['geometry'], 'properties': {
        'name': 'Regional-list — ' + p['name_fr'], 'vintage': scope,
        'source': source, 'sourceUrl': source_url,
    }})
for f in provinces:
    p = f['properties']; code = p['code']
    if code in excluded:
        continue
    matches = [r for r in rows if r[3] == 'م' and norm(r[1]) == norm(aliases.get(code, p['name_ar']))]
    assert len(matches) == 1, (code, matches)
    row = matches[0]
    assert row[0] == int(code[:2])
    g = shape(f['geometry'])
    assert g.is_valid and not g.is_empty and g.geom_type in ('Polygon', 'MultiPolygon')
    crosswalk.append({'provinceCode': code, 'name': p['name_fr'], 'nameArabic': p['name_ar'],
        'legalComposition': 'Whole province/prefecture', 'legalAnnexPdfPage': pages[code],
        'currentRosterProvince': row[1], 'currentRosterConstituency': row[2]})
    features.append({'type': 'Feature', 'geometry': f['geometry'], 'properties': {
        'name': 'Local constituency — ' + p['name_fr'],
        'vintage': scope + f' Composition: decree 2-11-603 annex, PDF page {pages[code]}; current name checked against PJD 2026 roster.',
        'source': source, 'sourceUrl': source_url,
    }})
assert len(features) == 77 and len(crosswalk) == 65
out = root / 'morocco-partial-77.geojson'
out.write_text(json.dumps({'type': 'FeatureCollection', 'features': features}, ensure_ascii=False))
catalog = {'checkedAt': '2026-10-25', 'completeCountryCoverage': False,
    'publishedLocalConstituencies': 65, 'publishedRegionalListAreas': 12,
    'missingLocalConstituencies': 27, 'legalCompositionSource': legal_url,
    'currentRosterSource': roster_url, 'geometrySource': source_url,
    'coordinatesModified': False, 'wholeUnitCrosswalk': crosswalk,
    'excludedSplitUnits': [{'code': f['properties']['code'], 'name': f['properties']['name_fr'], 'missingConstituencies': excluded[f['properties']['code']]} for f in provinces if f['properties']['code'] in excluded],
    'evidence': [{'file': str(root / name), 'sha256': hashlib.sha256((root / name).read_bytes()).hexdigest()} for name in ['morocco-provinces-round3.geojson', 'morocco-pjd-data-round3.js', 'morocco-decree-2011-bo5992-mirror.pdf', 'morocco-partial-77.geojson']]}
Path('scripts/boundaries/research-morocco-local-2026-10-25.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')
manifest = [{'pinId': 2979, 'pinTitle': 'Morocco’s PAM Leads the 2026 Election With 97 of 395 Seats',
    'kind': 'district', 'name': 'Morocco — 65 local constituencies + 12 regional-list areas; 27 local seats missing',
    'vintage': scope, 'source': source, 'sourceUrl': source_url, 'file': str(out), 'preserveFeatureCredits': True}]
Path('scripts/boundaries/backfill-morocco-partial-2026-10-25.prod.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print('Prepared 77 valid cartographic outlines: 65 local + 12 regional; 27 local constituencies excluded.')
