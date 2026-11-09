"""Save researched dish reviews from a catalog JSON onto restaurant-specials profiles (any region).
Usage: python3 saveMenuItemReviews.py catalog.json [--apply] [--base https://www.chronopin.com]
Catalog entries: {pinSourceUrl, itemName, review:{provider,title,sourceUrl,quote,publishedDate,checkedAt}}.
Matches the exact branch source and item name in every menu, replaces a review with the same sourceUrl,
keeps all other fields, uses the current revision and checks a full readback. Dry run by default.
"""
import argparse, json
from pathlib import Path
from urllib.request import Request, urlopen

p = argparse.ArgumentParser(); p.add_argument('catalog', type=Path); p.add_argument('--apply', action='store_true')
p.add_argument('--base', default='https://www.chronopin.com'); a = p.parse_args()
token = (Path(__file__).resolve().parents[2] / '.scrape/admin.token').read_text().strip()
def api(path, method='GET', body=None):
    r = Request(a.base + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
    return json.load(urlopen(r, timeout=60))
cat = json.load(open(a.catalog)); rows = api('/api/admin/restaurant-specials')['venues']
by = {}
for r in rows:
    if r.get('enabled') is not False: by.setdefault(r['profile']['pinSourceUrl'], []).append(r)
changes, hit = {}, set()
for i, e in enumerate(cat):
    for r in by.get(e['pinSourceUrl'], []):
        for m in r['profile'].get('menus', []):
            for it in m['items']:
                if it['name'] == e['itemName']:
                    st = changes.setdefault(r['id'], json.loads(json.dumps(r)))
                    for m2 in st['profile']['menus']:
                        for it2 in m2['items']:
                            if it2['name'] == e['itemName']:
                                it2['reviews'] = [x for x in it2.get('reviews', []) if x['sourceUrl'] != e['review']['sourceUrl']] + [e['review']]
                    hit.add(i)
missing = [cat[i]['itemName'] for i in range(len(cat)) if i not in hit]
if missing: raise SystemExit('No match: ' + ', '.join(missing))
for rid, rec in changes.items():
    path = f'/api/admin/restaurant-specials/{rid}'
    if not a.apply: print('Would update', path); continue
    cur = api(path)
    if cur['revision'] != rec['revision']: raise SystemExit(path + ' changed')
    api(path, 'PUT', {k: rec[k] for k in ['revision', 'profile', 'enabled', 'regionSlug'] if k in rec})
    back = api(path)
    if back['profile'] != rec['profile'] or back['regionSlug'] != cur['regionSlug']: raise SystemExit('Readback mismatch ' + path)
    print('Verified', path)
