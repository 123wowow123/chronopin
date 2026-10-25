"""Label two Presidency entity areas and Brcko's special voting area explicitly.

Input: geoBoundaries BIH ADM1 boundaryID BIH-ADM1-54001226 (2013 overview,
2024 build, public domain, Wikimedia Commons) at bih-round2.geojson in ignored
cache. Legal scope: OHR Final Award annex 9 and BiH Constitution article V.
Brcko is NOT assigned to either entity or described as a third constituency.
"""
import json
from pathlib import Path
from shapely.geometry import shape
root=Path('.scrape/boundaries')
data=json.load(open(root/'bih-round2.geojson'))
labels={
 'Federation of Bosnia and Herzegovina':'Federation — voters choose the Bosniak or Croat Presidency member',
 'Republika Srpska':'Republika Srpska — voters choose the Serb Presidency member',
 'Brčko District':'Brčko special voting area — ballot follows entity citizenship; not a third Presidency constituency',
}
assert len(data['features'])==3 and {f['properties']['shapeName'] for f in data['features']}==set(labels)
for f in data['features']:
 g=shape(f['geometry']);assert g.is_valid and not g.is_empty
 f['properties']={'kind':'district','name':labels[f['properties']['shapeName']],'vintage':'2013 geographic overview, geoBoundaries build 2024. Presidency geography for 2026: two entity areas plus the separately identified Brčko exception; voting entitlement also depends on law, not residence alone.','source':'geoBoundaries / Wikimedia Commons (public domain); electoral scope: OHR Final Award annex 9 and BiH Constitution article V','sourceUrl':'https://www.geoboundaries.org/api/current/gbOpen/BIH/ADM1/'}
path=root/'bosnia-presidency-overview.geojson';path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
print('Two entity areas plus explicitly labelled Brčko special voting area')
