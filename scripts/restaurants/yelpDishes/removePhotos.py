"""Remove item photos from a restaurant record (local by default).

Usage: python3 removePhotos.py [--prod] [--apply] <kind> <id> <rules.json>
kind: content|specials. rules.json: list of {"name": exact item name} (all menus) or
{"label": menu label, "name": item name}, or {"captionContains": text}. Dry run unless --apply.
Writes before/after to .scrape/photo-removals/.
"""
import argparse, json, sys, time
from pathlib import Path
from urllib.request import Request, urlopen

ap = argparse.ArgumentParser()
ap.add_argument('kind'); ap.add_argument('id', type=int); ap.add_argument('rules', type=Path)
ap.add_argument('--prod', action='store_true'); ap.add_argument('--apply', action='store_true')
a = ap.parse_args()
root = Path(__file__).resolve().parents[3]
base = 'https://www.chronopin.com' if a.prod else 'http://localhost:3000'
token = (root / ('.scrape/admin.token' if a.prod else '.scrape/admin-local.token')).read_text().strip()
def api(path, method='GET', body=None):
    r = Request(base + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
    return json.load(urlopen(r, timeout=60))
path = f'/api/admin/restaurant-{a.kind}/{a.id}'
rec = api(path); before = json.loads(json.dumps(rec))
prof = rec['profile'] if a.kind == 'specials' else rec['profile']['menu']
rules = json.loads(a.rules.read_text()); n = 0
for m in prof['menus']:
    for i in m['items']:
        if not (i.get('image') or i.get('images')): continue
        for r in rules:
            if ('label' in r and r['label'] != m['label']) or ('name' in r and r['name'] != i['name']): continue
            if 'captionContains' in r and r['captionContains'] not in (i.get('image') or {}).get('caption', ''): continue
            i.pop('image', None); i.pop('images', None); n += 1
            print('remove:', m['label'][:40], '|', i['name'][:50]); break
if a.apply and n:
    body = {k: rec[k] for k in ['revision', 'profile', 'enabled']}
    if 'regionSlug' in rec: body['regionSlug'] = rec['regionSlug']
    api(path, 'PUT', body); rb = api(path)
    assert rb['profile'] == rec['profile'], 'readback mismatch'
    d = root / '.scrape/photo-removals'; d.mkdir(exist_ok=True)
    (d / f"{'prod' if a.prod else 'local'}-{a.kind}-{a.id}-{int(time.time())}.json").write_text(json.dumps({'before': before, 'after': rb}))
print(('applied' if a.apply else 'dry run'), n, 'photos', path)
