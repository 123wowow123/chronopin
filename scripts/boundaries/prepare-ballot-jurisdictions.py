"""Prepare reviewed city/state/county ballot jurisdictions from government data.

The companion catalog lists exact geographic codes, pin IDs and scope evidence.
Cached source queries, download URLs and licences are in the large-run notes.
Requires shapely/pyproj. Refuses invalid source or six-decimal output geometry.
Only full-resolution LA/SD geometry is simplified (50m, preserve topology).
No source ring, island or polygon is discarded or repaired.
"""
from pathlib import Path
import json
import io
import zipfile
import shapefile
from shapely.geometry import shape, mapping
from shapely import transform
from pyproj import CRS, Transformer

root=Path('.scrape/boundaries')
# Convert the fixed 2024 cartographic state archive, rather than using a later
# jurisdiction snapshot on the two November 2024 referendum pins.
with zipfile.ZipFile(root/'us-states-2024.zip') as archive:
    shp=next(n for n in archive.namelist() if n.endswith('.shp'))
    prefix=shp[:-4]
    project=Transformer.from_crs(CRS.from_wkt(archive.read(prefix+'.prj').decode()),4326,always_xy=True).transform
    reader=shapefile.Reader(shp=io.BytesIO(archive.read(shp)),shx=io.BytesIO(archive.read(prefix+'.shx')),dbf=io.BytesIO(archive.read(prefix+'.dbf')))
    historical=[]
    for record in reader.iterShapeRecords():
        props=record.record.as_dict()
        if props['STATEFP'] not in ['29','32']:continue
        geometry=shape(record.shape.__geo_interface__)
        assert geometry.is_valid
        historical.append({'type':'Feature','properties':{'GEOID':props['GEOID'],'NAME':props['NAME']},'geometry':mapping(transform(geometry,project,interleaved=False))})
    assert len(historical)==2
    (root/'large-states2024.geojson').write_text(json.dumps({'type':'FeatureCollection','features':historical}))
catalog=json.load(open('scripts/boundaries/ballot-jurisdictions-2026-10-25.json'))
pins={e['pinId']:{'title':e['pinTitle']} for e in json.load(open('scripts/boundaries/backfill-2026-10-25.prod.json'))}
metric=Transformer.from_crs(4326,5070,always_xy=True).transform
wgs=Transformer.from_crs(5070,4326,always_xy=True).transform
manifest=[]
for entry in catalog:
    data=json.load(open(root/f"large-{entry['file']}.geojson"))
    codes=entry.get('codes',[entry.get('code')])
    canada=entry['file']=='canada-cities'
    field='CSDUID' if canada else 'GEOID'
    features=[f for f in data['features'] if f['properties'][field] in codes]
    assert len(features)==len(codes)==len({f['properties'][field] for f in features}),entry['id']
    out=[]
    for f in features:
        g=shape(f['geometry'])
        if not g.is_valid or g.is_empty:raise ValueError('Invalid source '+entry['id'])
        if entry['file']=='places2026-full':
            g=transform(transform(g,metric,interleaved=False).simplify(50,preserve_topology=True),wgs,interleaved=False)
        geom=json.loads(json.dumps(mapping(g)),parse_float=lambda x:round(float(x),6))
        if not shape(geom).is_valid:raise ValueError('Invalid rounded overview '+entry['id'])
        out.append({'type':'Feature','geometry':geom,'properties':{'sourceCode':f['properties'][field]}})
    path=root/f"ballot-{entry['id']}.geojson"
    path.write_text(json.dumps({'type':'FeatureCollection','features':out},separators=(',',':')))
    if canada:
        source='Statistics Canada, 2021 Census digital boundaries (Open Government Licence – Canada)'
        source_url='https://geo.statcan.gc.ca/geo_wa/rest/services/2021/Digital_boundary_files/MapServer/9'
        vintage='2021 Census subdivision outline, used as geographic context for the 2026 citywide mayor vote; not council, school-board, ward or polling districts; reviewed 2026-10-25'
    elif entry['year']=='2024':
        source='US Census Bureau, 2024 cartographic state boundaries (1:500,000)'
        source_url='https://www2.census.gov/geo/tiger/GENZ2024/shp/cb_2024_us_state_500k.zip'
        vintage='2024 cartographic state outline; one statewide ballot jurisdiction, not legislative or precinct boundaries'
    else:
        source='US Census Bureau, TIGERweb'
        layer='18' if entry['year']=='2025' else '4'
        source_url=('https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer/'+layer if entry['file'].startswith('places') else 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer/'+('1' if entry['file'].startswith('counties') else '0'))
        detail='50m topology-preserving overview' if entry['file']=='places2026-full' else 'generalised geographic overview'
        vintage=f"January 1, {entry['year']} Census jurisdiction outline; {detail}; {'five-county regional ballot district, not the nine-county MTC region' if entry.get('codes') else 'single citywide/countywide/statewide voting jurisdiction, not internal legislative or polling districts'}; reviewed 2026-10-25"
    for id in entry['pins']:
        p=pins[id]
        manifest.append({'pinId':id,'pinTitle':p['title'],'kind':'district','name':entry['name'],'vintage':vintage,'source':source,'sourceUrl':source_url,'file':str(path)})
assert len(manifest)==len({e['pinId'] for e in manifest})==24
Path('scripts/boundaries/backfill-large-2026-10-25.prod.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('Prepared 24 pin matches across 19 reviewed geographic groups')
