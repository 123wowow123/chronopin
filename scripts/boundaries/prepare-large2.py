"""Build reviewed eight-pin replay entries after source geometry preparation.

Run fetch-large2.mjs, prepare-black-summer.py and prepare-taiwan.py first.
The prior ballot-jurisdiction preparation supplies three existing US outlines.
The checked-in replay manifest supplies exact pin titles; no credentials or
live pin content are stored or required to prepare the geometry/catalog.
"""
import json
from pathlib import Path
from shapely.geometry import shape
root=Path('.scrape/boundaries');pins={e['pinId']:{'title':e['pinTitle']} for e in json.load(open('scripts/boundaries/backfill-large2-2026-10-25.prod.json'))};entries=[]
def entry(id,file,name,vintage,source,url,**kw):
 entries.append({'pinId':id,'pinTitle':pins[id]['title'],'kind':'district','name':name,'vintage':vintage,'source':source,'sourceUrl':url,'file':str(root/file),**kw})
entries.append({'pinId':2450,'pinTitle':pins[2450]['title'],'kind':'wildfire','name':'Black Summer — indicative national fire extent, July 2019–June 2020; includes planned fires and unburnt pockets','observedAt':'2020-06-22','source':'Australian Government DCCEEW, NIAFED v20200623 (CC BY 3.0 AU); topology-normalized 150m overview','sourceUrl':'https://www.dcceew.gov.au/environment/biodiversity/bushfire-recovery/bushfire-impacts','file':str(root/'black-summer-overview.geojson')})
entry(6541,'taiwan-recall-24.geojson','Taiwan — 24 legislative constituencies in the July 26, 2025 recalls','11th Legislative Yuan definitions; NCDR 2024-10-15 geographic release; 24 recall constituencies only, not the separate Hsinchu mayor recall; 50m overview','Taiwan NCDR CAP geographic codes; membership: Central Election Commission','https://web.cec.gov.tw/central/article/60139',preserveFeatureCredits=True)
entry(6548,'taiwan-executive-22.geojson','Taiwan — 22 city/county executive voting areas; other ballot levels not drawn','NCDR Taiwan_Geocode_113 release 2024-10-15; 50m geographic overview for 2026 city/county mayor/magistrate votes. Councillor, township, indigenous-district and village contests are not drawn; offshore source polygons retained.','Taiwan NCDR CAP geographic-code cartography; election scope: Central Election Commission','https://alerts.ncdr.nat.gov.tw/web/developer/cap-docs')
entry(19425,'taipei-mayor.geojson','Taipei City — citywide mayor voting area','NCDR Taiwan_Geocode_113 release 2024-10-15; current geographic context for the 2026 citywide mayor vote; 50m overview, not council or polling districts','Taiwan NCDR CAP geographic-code cartography','https://alerts.ncdr.nat.gov.tw/web/developer/cap-docs')
d=json.load(open(root/'peru-provinces-2020.geojson'));f=next(f for f in d['features'] if f['properties']['shapeName']=='Lima');assert shape(f['geometry']).is_valid
(root/'lima-mayor-province.geojson').write_text(json.dumps({'type':'FeatureCollection','features':[f]},separators=(',',':')))
entry(5173,'lima-mayor-province.geojson','Lima — metropolitan mayor voting jurisdiction (Province of Lima; excludes Callao)','2020 IGN/OCHA province geometry via geoBoundaries; 43-district Province of Lima geographic overview for the metropolitan mayor ballot, not individual district-mayor contests or the wider urban agglomeration','Instituto Geográfico Nacional / OCHA ROLAC via geoBoundaries (CC BY 3.0 IGO)','https://www.geoboundaries.org/api/current/gbOpen/PER/ADM2/')
master=json.load(open('scripts/boundaries/backfill-2026-10-25.prod.json'))
for id,prior,name in [(3500,3306,'Boston — elected mayor jurisdiction; inauguration venue marked separately'),(3549,3545,'New York — governor’s statewide jurisdiction; 2026 context for the 2027 term'),(3616,3539,'New York City — elected mayor jurisdiction; inauguration venue marked separately')]:
 e=next(e for e in master if e['pinId']==prior).copy();e.update(pinId=id,pinTitle=pins[id]['title'],name=name)
 if id==3616:
  e.update(file=str(root/'ballot-nyc2026.geojson'),sourceUrl='https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer/4',vintage='January 1, 2026 Census city outline; elected mayor jurisdiction, not the inauguration-site footprint or internal council districts')
 entries.append(e)
assert len(entries)==len({e['pinId'] for e in entries})==8
Path('scripts/boundaries/backfill-large2-2026-10-25.prod.json').write_text(json.dumps(entries,ensure_ascii=False,indent=2)+'\n')
taipei=json.load(open(root/'taipei-mayor.geojson'))['features'][0];g=shape(taipei['geometry']);c=g.centroid;assert g.contains(c)
centres=[{'pinId':19425,'pinTitle':pins[19425]['title'],'address':None,'name':'Taipei City','latitude':round(c.y,6),'longitude':round(c.x,6),'sourceUrl':'https://alerts.ncdr.nat.gov.tw/web/developer/cap-docs','reason':'Missing citywide map coordinate: geometric centroid inside the official NCDR Taipei City polygon; not a venue address.'}]
Path('scripts/boundaries/backfill-centres-large2-2026-10-25.prod.json').write_text(json.dumps(centres,ensure_ascii=False,indent=2)+'\n')
print('Eight pin matches prepared, including three resolved research gaps')
