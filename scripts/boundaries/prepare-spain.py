"""Prepare a current municipal-election overview from IGN and INE sources.

Cache IGN API-Features Municipio pages of 100 records under
.scrape/boundaries/spain-ign-round2-{offset}.geojson and the source index as
spain-ign-municipality-index.json. Cache INE's 26codmun.xlsx as
spain-2026-ine.xlsx. Sources and download workflow are in the round-two notes.
Requires shapely, pyproj, openpyxl. Refuses missing codes or invalid polygons.
No topology repairs. Full input and excluded shared-territory report stay ignored.
"""
from pathlib import Path
import json
import openpyxl
from shapely import transform
from shapely.geometry import shape, mapping
from pyproj import Transformer

root=Path('.scrape/boundaries')
workbook=openpyxl.load_workbook(root/'spain-2026-ine.xlsx',read_only=True,data_only=True)
municipalities={str(r[0]).zfill(2)+str(r[1]).zfill(3):r[3] for sheet in workbook for r in list(sheet.values)[3:] if r[0] and r[1]}
assert len(municipalities)==8132
index=json.loads((root/'spain-ign-municipality-index.json').read_text())
expected={f['id'] for f in index['features']}
assert len(expected)==index['numberMatched']==8213
features=[]
for offset in range(0,8213,100):
    page=json.loads((root/f'spain-ign-round2-{offset}.geojson').read_text())
    assert page['numberMatched']==8213
    features.extend(page['features'])
assert len(features)==len({f['id'] for f in features})==8213
assert {f['id'] for f in features}==expected
source={f['properties']['nationalcode'][-5:]:f for f in features}
assert len(source)==8213
assert set(municipalities)<=set(source)
excluded={code:f['properties']['nameunit'] for code,f in source.items() if code not in municipalities}
assert len(excluded)==81
(root/'spain-excluded-shared-territories.json').write_text(json.dumps(excluded,ensure_ascii=False,indent=2))
metric=Transformer.from_crs('EPSG:4326','EPSG:3035',always_xy=True).transform
wgs84=Transformer.from_crs('EPSG:3035','EPSG:4326',always_xy=True).transform
out=[]
for code in sorted(municipalities):
    f=source[code]
    polygon=shape(f['geometry'])
    if not polygon.is_valid or polygon.is_empty:
        raise ValueError('Invalid original polygon: '+code+' '+municipalities[code])
    simplified=transform(transform(polygon,metric,interleaved=False).simplify(150,preserve_topology=True),wgs84,interleaved=False)
    # Match the importer's 6-decimal precision and validate that exact result.
    geometry=json.loads(json.dumps(mapping(simplified)),parse_float=lambda x:round(float(x),6))
    if not shape(geometry).is_valid:
        raise ValueError('Invalid overview polygon: '+code)
    name='Spain — 8,130 municipal election areas (current context)'
    if code=='51001':name='Ceuta — autonomous-city Assembly area'
    if code=='52001':name='Melilla — autonomous-city Assembly area'
    out.append({'type':'Feature','geometry':geometry,'properties':{'kind':'district','name':name,'municipality':municipalities[code],'ineCode':code,'vintage':'IGN live boundary snapshot checked 2026-10-25; matched to all INE January 2026 municipal codes. 150m overview, current context for 2027; regional, provincial and island council districts are not drawn.','source':'Obra derivada de IGN Unidades administrativas 2026, CC BY 4.0 ign.es; municipal codes: INE','sourceUrl':'https://api-features.ign.es/collections/administrativeunit'}})
assert len(out)==8132
path=root/'spain-municipal-2026.geojson'
path.write_text(json.dumps({'type':'FeatureCollection','features':out},separators=(',',':'),ensure_ascii=False))
print(f'{len(out)} municipal/city areas; 81 shared territories excluded; {path.stat().st_size/1048576:.1f} MiB overview')
