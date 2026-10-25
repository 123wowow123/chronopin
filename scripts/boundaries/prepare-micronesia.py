"""Aggregate all 75 government/SPC municipalities into ten Congress districts.

Cache geoBoundaries FSM ADM2 (boundaryID FSM-ADM2-79324940) as
.scrape/boundaries/fsm-municipal-round2.geojson. Geometry represents 2019,
from FSM Statistics / SPC / OCHA, CC BY 3.0 IGO. No maritime boundaries are
inferred: this is an island-land overview. No simplification or ring repair.

Membership: FSM Congress's 2025 organisation announcement identifies Chuuk's
five regional districts and Pohnpei's three districts. Chuuk Constitution V.3
lists the regional islands; Pohnpei Code 10 PC 3-103 lists local jurisdictions.
See docs/okf/scraping/boundaries-round2-2026-10-25.md for source links/aliases.
"""
from pathlib import Path
import json
from shapely.geometry import shape, mapping
from shapely import union_all

root = Path('.scrape/boundaries')
data = json.loads((root / 'fsm-municipal-round2.geojson').read_text())
source = {f['properties']['shapeName']: shape(f['geometry']) for f in data['features']}
assert len(data['features']) == len(source) == 75
# These spellings are the geometry source's names, not invented jurisdictions.
groups = {
    'Chuuk 1 — Mortlocks': 'Nema Losap PiisEmwar Namoluk Ettal Moch Kuttu Ta Satowan Lekinoch Oneop'.split(),
    'Chuuk 2 — Northern Namoneas': 'Weno Fono PiisPenau'.split(),
    'Chuuk 3 — Southern Namoneas': 'Tonoas Fefen Parem Siis Uman'.split(),
    'Chuuk 4 — Faichuk': 'Udot Eot Romanum Fanapanges Polle Paata Wonei Tol'.split(),
    'Chuuk 5 — Halls and Northwestern Islands': 'Nomwin Fananu Ruo Murillo Onoun Makur Onou Unanu Piherech Houk Polowat Tamatam Pollap'.split(),
    'Kosrae 1 — statewide two-year seat': 'Lelu Tafunsak Malem Utwe'.split(),
    'Pohnpei 1 — Kolonia, Sokehs and Southern Islands': 'Kapingamarangi Kolonia Sapwuafik Nukuoro Sokehs'.split(),
    'Pohnpei 2 — Kitti and Madolenihmw': 'Kitti Madolenihmw'.split(),
    'Pohnpei 3 — Nett, U and Eastern Islands': 'Mwokilloa Nett Pingelap U'.split(),
    'Yap 1 — statewide two-year seat': 'Rull Gilman Kanifay Gagil Maap Tomil Dalipebinaw Weloy Rumung Fanif Woleai Eauripik Ifalik Faraulep Elato Lamotrek Satawal Ulithi Fais Ngulu'.split(),
}
members = [n for names in groups.values() for n in names]
assert len(members) == len(set(members)) == 75
assert set(members) == set(source), (set(source)-set(members), set(members)-set(source))
assert all(s.is_valid and not s.is_empty for s in source.values())
features = []
for name, names in groups.items():
    polygon = union_all([source[n] for n in names])
    assert polygon.is_valid and polygon.geom_type in ['Polygon', 'MultiPolygon']
    features.append({'type': 'Feature', 'properties': {'district': name, 'members': names, 'kind': 'district', 'name': name, 'vintage': '2019 government/SPC municipal land geometry; current district membership verified against 2025 Congress and state law; context for 2027, not a future plan certification', 'source': 'FSM Division of Statistics / SPC / OCHA via geoBoundaries (CC BY 3.0 IGO); membership: FSM Congress', 'sourceUrl': 'https://www.cfsm.gov.fm/congress-organizes-24th-body-and-maintains-most-of-its-leadership/'}, 'geometry': mapping(polygon)})
assert union_all([shape(f['geometry']) for f in features]).equals(union_all(list(source.values())))
(root/'micronesia-10-districts.geojson').write_text(json.dumps({'type':'FeatureCollection','features':features},separators=(',',':')))
print('75 unique source municipalities assigned once to 10 districts; exact land union preserved')
