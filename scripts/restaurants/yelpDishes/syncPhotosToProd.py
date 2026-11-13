"""Copy verified dish photos from the local database to production, by exact branch source.

Usage: python3 syncPhotosToProd.py <region> [--apply] [--only SUBSTR]
Reads .scrape/menu-photo-gaps-<region>.json for the region's venue sources (see the inventory step),
finds the local record and the production record for each source/kind, and copies `image` onto
production items that have none, matched by exact (menu label, item name). Existing production photos are
never replaced; a (label, name) pair that is duplicated is copied only when counts match.
Images must be public Chronopin Azure blobs (already uploaded). Dry run by default. Saves use the latest
revision and verify full readbacks; evidence goes to .scrape/photo-sync/. Tokens: .scrape/admin*.token.
"""
import argparse, json, sys, time
from collections import defaultdict
from pathlib import Path
from urllib.parse import quote, urlparse
from urllib.request import Request, urlopen

ap = argparse.ArgumentParser()
ap.add_argument('region'); ap.add_argument('--apply', action='store_true'); ap.add_argument('--only')
a = ap.parse_args()
root = Path(__file__).resolve().parents[3]
tok = {k: (root / f).read_text().strip() for k, f in [('local', '.scrape/admin-local.token'), ('prod', '.scrape/admin.token')]}
base = {'local': 'http://localhost:3000', 'prod': 'https://www.chronopin.com'}
def api(env, path, method='GET', body=None):
    for attempt in range(4):
        try:
            r = Request(base[env] + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                        headers={'Authorization': 'Bearer ' + tok[env], 'Content-Type': 'application/json'})
            return json.load(urlopen(r, timeout=90))
        except (TimeoutError, OSError) as e:
            if hasattr(e, 'code') or attempt == 3: raise
            time.sleep(4 * (attempt + 1))

def find(env, kind, source):
    if kind == 'content':
        rows = api(env, f'/api/admin/restaurant-content?sourceUrl={quote(source, safe="")}&limit=50')['content']
        rows = [r for r in rows if r['profile'].get('pinSourceUrl') == source and r['profile'].get('menu')]
        return rows[0] if len(rows) == 1 else None
    key = (env, 'sp', a.region)
    if key not in cache: cache[key] = api(env, f'/api/admin/restaurant-specials?region={a.region}')['venues']
    rows = [v for v in cache[key] if v['profile'].get('pinSourceUrl') == source]
    return rows[0] if len(rows) == 1 else None
cache = {}
def menus(kind, rec): return (rec['profile']['menu'] if kind == 'content' else rec['profile'])['menus']

venues = json.load(open(root / f'.scrape/menu-photo-gaps-{a.region}.json'))
seen, report, evid = set(), [], []
out = root / '.scrape/photo-sync'; out.mkdir(exist_ok=True)
for v in venues:
    k = (v['kind'], v['source'])
    if k in seen or (a.only and a.only not in v['name']): continue
    seen.add(k)
    loc = find('local', *k)
    if not loc or not any(i.get('image') for m in menus(k[0], loc) for i in m['items']): continue
    prod = find('prod', *k)
    if not prod: report.append((v['name'], k[0], 'NO PROD RECORD')); continue
    pm = defaultdict(list)
    for m in menus(k[0], prod):
        for i in m['items']: pm[(m['label'], i['name'])].append(i)
    lm = defaultdict(list)
    for m in menus(k[0], loc):
        for i in m['items']: lm[(m['label'], i['name'])].append(i)
    copied = skipped = 0
    for key, litems in lm.items():
        pitems = pm.get(key)
        if not pitems or len(pitems) != len(litems): skipped += any(i.get('image') for i in litems); continue
        for li, pi in zip(litems, pitems):
            im = li.get('image')
            if not im or pi.get('image') or pi.get('images'): continue
            u = urlparse(im['src'])
            if u.scheme != 'https' or u.netloc != 'chronopin.blob.core.windows.net': raise SystemExit('non-Azure image ' + im['src'])
            pi['image'] = im; copied += 1
    report.append((v['name'], k[0], f'{copied} copy, {skipped} skipped (unmatched/ambiguous)'))
    if a.apply and copied:
        path = f"/api/admin/restaurant-{k[0]}/{prod['id']}"
        fresh = api('prod', path)
        before = json.loads(json.dumps(fresh))
        # re-apply onto the fresh revision
        pm2 = defaultdict(list)
        for m in menus(k[0], fresh):
            for i in m['items']: pm2[(m['label'], i['name'])].append(i)
        for key, litems in lm.items():
            pitems = pm2.get(key)
            if not pitems or len(pitems) != len(litems): continue
            for li, pi in zip(litems, pitems):
                if li.get('image') and not pi.get('image') and not pi.get('images'): pi['image'] = li['image']
        body = {x: fresh[x] for x in ['revision', 'profile', 'enabled']}
        if 'regionSlug' in fresh: body['regionSlug'] = fresh['regionSlug']
        api('prod', path, 'PUT', body); rb = api('prod', path)
        assert rb['profile'] == fresh['profile'] and rb['revision'] == fresh['revision'] + 1, f'readback mismatch {path}'
        evid.append({'path': path, 'name': v['name'], 'before': before, 'after': rb})
        (out / f'{a.region}-{int(time.time())}.json').write_text(json.dumps(evid))
for r in report: print(*r, sep=' | ')
print('applied' if a.apply else 'dry run', len(report), 'venues')
