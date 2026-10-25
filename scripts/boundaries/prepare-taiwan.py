"""Prepare Taiwan recall and executive-area maps from official NCDR downloads.

Sources: NCDR CAP city/village Taiwan_Geocode_113, published 2024-10-15;
CEC's 11th-Legislative-Yuan CSV definitions and July 26 2025 recall list.
Requires pyshp, shapely, pyproj. No village membership inferred from proximity.
Every named split-town village must match once; whole towns include their
unassigned geographic fragments. Blank fragments of split towns are reported.
"""
from pathlib import Path
import io,zipfile,json,csv,re
import shapefile
from shapely.geometry import shape,mapping
from shapely import union_all,transform
from pyproj import CRS,Transformer
root=Path('.scrape/boundaries')
def read(kind):
    z=zipfile.ZipFile(root/f'tw-{kind}-2024-ncdr.zip')
    n=next(n for n in z.namelist() if n.endswith('.shp'));b=n[:-4]
    reader=shapefile.Reader(shp=io.BytesIO(z.read(n)),shx=io.BytesIO(z.read(b+'.shx')),dbf=io.BytesIO(z.read(b+'.dbf')),encoding='utf-8')
    project=Transformer.from_crs(CRS.from_wkt(z.read(b+'.prj').decode()),4326,always_xy=True).transform
    records=[]
    for r in reader.iterShapeRecords():
        p=r.record.as_dict();g=shape(r.shape.__geo_interface__)
        records.append((p,transform(g,project,interleaved=False)))
    return records
cities=read('cities');villages=read('villages')
assert len(cities)==22 and len(villages)==7953
city={p['COUNTYNAME']:(p,g) for p,g in cities}
assert len(city)==22 and all(g.is_valid for _,g in cities)
metric=Transformer.from_crs(4326,3857,always_xy=True).transform
wgs=Transformer.from_crs(3857,4326,always_xy=True).transform
def overview(g):
    assert g.is_valid and not g.is_empty
    out=transform(transform(g,metric,interleaved=False).simplify(50,preserve_topology=True),wgs,interleaved=False)
    assert out.is_valid and not out.is_empty
    return mapping(out)
selected={'臺北市':[3,4,6,7,8],'新北市':[1,7,8,9,12],'桃園市':[1,2,3,4,5,6],'臺中市':[4,5,6],'雲林縣':[1],'花蓮縣':[1],'臺東縣':[1],'基隆市':[1],'新竹市':[1]}
# The source encodes these rare-character names in brackets. Both are exact,
# unique names in Zhonghe and their official VILLCODEs are recorded below.
aliases={'瓦磘里':'瓦[磘]里','灰磘里':'灰[磘]里'}
features=[];report=[];used=set()
for row in csv.DictReader(open(root/'taiwan-districts.csv',encoding='utf-8-sig')):
    name=row['選舉區'].strip();county=next((c for c in selected if name.startswith(c)),None)
    if not county:continue
    number=re.search(r'第(\d+)選舉區',name);num=int(number[1]) if number else 1
    if num not in selected[county]:continue
    text=row['選舉區範圍'].strip();whole=[];split=None;names=[];unassigned=[]
    if text==county:
        members=[(p,g) for p,g in villages if p['COUNTYNAME']==county]
        geometry=city[county][1]
    else:
        if '－' in text:
            prefix,part=text.split('－');prefix=prefix.split('、');whole=prefix[:-1];split=prefix[-1]
            count=int(re.search(r'等(\d+)里',part)[1]);names=re.sub(r'等\d+里.*','',part).split('、');assert len(names)==count
            names=[aliases.get(n,n) if county=='新北市' and split=='中和區' else n for n in names]
            for n in names:
                assert sum(p['COUNTYNAME']==county and p['TOWNNAME']==split and p['VILLNAME']==n for p,g in villages)==1,(name,n)
            unassigned=[p['VILLCODE'] for p,g in villages if p['COUNTYNAME']==county and p['TOWNNAME']==split and not p['VILLNAME']]
        else:whole=text.split('、')
        for town in whole:assert any(p['COUNTYNAME']==county and p['TOWNNAME']==town for p,g in villages),(name,town)
        members=[(p,g) for p,g in villages if p['COUNTYNAME']==county and (p['TOWNNAME'] in whole or p['TOWNNAME']==split and p['VILLNAME'] in names)]
        assert members and all(g.is_valid for p,g in members)
        geometry=union_all([g for p,g in members]);assert geometry.is_valid
    ids=[p['VILLCODE'] for p,g in members]
    assert len(ids)==len(set(ids)) and not used.intersection(ids),name
    used.update(ids)
    props={'kind':'district','name':name,'vintage':'11th Legislative Yuan district definition; July 26, 2025 recall constituency. Official NCDR 2024-10-15 geographic release; 50m overview.','source':'Taiwan NCDR CAP geographic codes; constituency membership: Central Election Commission','sourceUrl':'https://web.cec.gov.tw/central/article/60139'}
    features.append({'type':'Feature','properties':props,'geometry':overview(geometry)})
    report.append({'name':name,'legalDefinition':text,'sourceVillageCodes':ids,'splitTownUnassignedCodes':unassigned})
assert len(features)==24
assert not any(r['splitTownUnassignedCodes'] for r in report), 'Review unassigned split-town fragments before importing'
(root/'taiwan-recall-24.geojson').write_text(json.dumps({'type':'FeatureCollection','features':features},ensure_ascii=False,separators=(',',':')))
(root/'taiwan-recall-membership-verified.json').write_text(json.dumps({'aliases':aliases,'matchedVillageCount':len(used),'districts':report},ensure_ascii=False,indent=2))
executives=[]
for p,g in cities:
    executives.append({'type':'Feature','geometry':overview(g),'properties':{'county':p['COUNTYNAME']}})
(root/'taiwan-executive-22.geojson').write_text(json.dumps({'type':'FeatureCollection','features':executives},separators=(',',':')))
(root/'taipei-mayor.geojson').write_text(json.dumps({'type':'FeatureCollection','features':[executives[next(i for i,(p,g) in enumerate(cities) if p['COUNTYNAME']=='臺北市')]]},separators=(',',':')))
print(f'24 recall districts: {len(used)} unique village codes matched; 22 executive areas and Taipei mayor area validated')
