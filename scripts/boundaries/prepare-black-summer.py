"""Prepare a documented NIAFED overview from the full official source.

The source is ArcGIS's NIAFED_v20200623, CC BY 3.0 AU, outSR=4326.
Cache the complete GeoJSON at .scrape/boundaries/australia-niafed-full.geojson.
The source has self-touching rings. Normalize only their existing linework,
requiring area to stay equal within 1e-8 relative / 1e-10 degrees squared.
No buffers, hulls or missing-ring removal are used; normalization follows
the existing source linework.
Dissolve overlapping parts, then use coverage simplification with a 150m
area-based tolerance in EPSG:3577.
Keep full prepared coordinate precision and fail rather than discard islands.
Requires shapely 2.1+ and pyproj. See large2-run notes for extent limitations.
"""
from pathlib import Path
import json
from shapely import make_valid, union_all, transform, coverage_simplify, coverage_is_valid
from shapely.geometry import shape, mapping
from pyproj import Transformer

root=Path('.scrape/boundaries')
data=json.load(open(root/'australia-niafed-full.geojson'))
assert data['type']=='FeatureCollection' and len(data['features'])==1 and not data.get('exceededTransferLimit')
source=shape(data['features'][0]['geometry'])
assert source.geom_type=='MultiPolygon' and len(source.geoms)==33728
parts=[]
changes=[]
for index,p in enumerate(source.geoms):
    valid=p if p.is_valid else make_valid(p,method='linework')
    assert valid.is_valid and valid.geom_type in ['Polygon','MultiPolygon']
    delta=abs(valid.area-p.area)
    if delta>1e-10 or delta/max(p.area,1e-30)>1e-8:
        raise ValueError(f'Area-changing topology normalization rejected: {index}')
    if not p.is_valid:changes.append({'part':index,'areaDeltaDegrees2':valid.area-p.area})
    parts.extend(valid.geoms if valid.geom_type=='MultiPolygon' else [valid])
merged=union_all(parts)
assert merged.is_valid
metric=Transformer.from_crs(4326,3577,always_xy=True).transform
wgs=Transformer.from_crs(3577,4326,always_xy=True).transform
projected=transform(merged,metric,interleaved=False)
assert projected.is_valid
assert coverage_is_valid(projected)
simple=coverage_simplify(projected,150)
assert simple.is_valid
simplified_delta=0.0
result=transform(simple,wgs,interleaved=False)
geographic_delta=0.0
if not result.is_valid:
    normalized=make_valid(result,method='linework')
    geographic_delta=normalized.area-result.area
    if normalized.geom_type not in ['Polygon','MultiPolygon'] or abs(geographic_delta)>1e-9:
        raise ValueError('Area-changing reprojection normalization rejected')
    result=normalized
geometry=mapping(result)
prepared=shape(geometry)
if not prepared.is_valid or prepared.is_empty:
    from shapely.validation import explain_validity
    raise ValueError('Invalid prepared overview: '+explain_validity(prepared))
assert len(prepared.geoms)==len(merged.geoms)
(root/'black-summer-overview.geojson').write_text(json.dumps({'type':'FeatureCollection','features':[{'type':'Feature','properties':{},'geometry':geometry}]},separators=(',',':')))
report={'sourceParts':len(source.geoms),'normalizedParts':len(changes),'dissolvedParts':len(merged.geoms),'outputParts':len(prepared.geoms),'sourceUnionAreaM2':projected.area,'overviewAreaM2':simple.area,'overviewNormalizationAreaDeltaM2':simplified_delta,'reprojectionNormalizationAreaDeltaDegrees2':geographic_delta,'normalizedAreaDeltas':changes}
(root/'black-summer-preparation.json').write_text(json.dumps(report,indent=2))
print({k:v for k,v in report.items() if k!='normalizedAreaDeltas'})
