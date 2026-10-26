"""Prepare the 12 regional-list areas only; the 92 local seats remain a gap.

Download https://communes.pages.dev/data/v1/geometry/regions.geojson to
.scrape/boundaries/morocco-regions-gap2.geojson before running with shapely.
Source geometry is OSM-derived, ODbL. Coordinates are preserved unchanged.
"""
import hashlib
import json
from pathlib import Path

from shapely.geometry import shape

root = Path('.scrape/boundaries')
path = root / 'morocco-regions-gap2.geojson'
data = json.loads(path.read_text())
expected = [
    'Tanger-Tétouan-Al Hoceima', 'Oriental', 'Fès-Meknès',
    'Rabat-Salé-Kénitra', 'Béni Mellal-Khénifra', 'Casablanca-Settat',
    'Marrakech-Safi', 'Drâa-Tafilalet', 'Souss-Massa', 'Guelmim-Oued Noun',
    'Laâyoune-Sakia El Hamra', 'Dakhla-Oued Ed-Dahab',
]
features = data['features']
assert len(features) == 12
assert [(f['properties']['code'], f['properties']['name_fr']) for f in features] == [
    (f'{i:02}', name) for i, name in enumerate(expected, 1)
]
source = 'OpenStreetMap contributors / Ousama Ajebbar, Communes du Maroc (ODbL 1.0; original database downloadable at source link)'
url = 'https://communes.pages.dev/fr/docs/downloads/'
vintage = ('2026 regional-list constituencies ONLY: the 92 local constituencies are not mapped. '
           'Region correspondence confirmed by Interior Ministry communiqué, 2026-09-11; '
           'OSM-derived cartographic outlines downloaded 2026-10-25, not legally surveyed electoral lines. '
           'Source administrative geography includes disputed Western Sahara; no sovereignty determination. '
           'Small source boundary overlaps retained unchanged.')
for f in features:
    g = shape(f['geometry'])
    assert g.geom_type in ('Polygon', 'MultiPolygon') and g.is_valid and not g.is_empty
    f['properties'] = {
        'name': f"Regional-list only — {f['properties']['name_fr']}",
        'vintage': vintage, 'source': source, 'sourceUrl': url,
    }
out = root / 'morocco-regional-list-12.geojson'
out.write_text(json.dumps({'type': 'FeatureCollection', 'features': features}, ensure_ascii=False))
overlaps = []
for i, a in enumerate(features):
    for b in features[i + 1:]:
        area = shape(a['geometry']).intersection(shape(b['geometry'])).area
        if area:
            overlaps.append({'a': a['properties']['name'], 'b': b['properties']['name'], 'areaSquareDegrees': area})
report = {
    'inputSha256': hashlib.sha256(path.read_bytes()).hexdigest(),
    'outputSha256': hashlib.sha256(out.read_bytes()).hexdigest(),
    'validFeatures': 12, 'coordinatesModified': False,
    'sourceOverlaps': overlaps, 'localConstituenciesMapped': 0,
    'legalScopeSource': 'https://www.maroc.ma/fr/actualites/legislatives-2026-1850-listes-de-candidatures-presentees-lechelle-nationale',
}
(root / 'morocco-regional-list-validation.json').write_text(json.dumps(report, indent=2))
manifest = [{
    'pinId': 2979,
    'pinTitle': 'Morocco’s PAM Leads the 2026 Election With 97 of 395 Seats',
    'kind': 'district', 'name': 'Morocco — 12 regional-list constituencies only; local seats not mapped',
    'vintage': vintage, 'source': source, 'sourceUrl': url,
    'file': str(out), 'preserveFeatureCredits': True,
}]
Path('scripts/boundaries/backfill-morocco-regional-2026-10-25.prod.json').write_text(
    json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print('Prepared 12 valid regional-list outlines; source coordinates unchanged; 92 local seats still missing.')
