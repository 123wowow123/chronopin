"""Rewrite credits/captions on saved dish photos whose source page is a listing site, not the operator's own site.
Usage: python3 fixImageCredits.py manifest.json [manifest2.json ...] [--apply]
Only items listed in the manifests whose saved image still carries the old '(official website)' credit are changed;
photos, prices, reviews and every other field are preserved. Revision-checked, full readback."""
import json, sys, urllib.parse, time
from pathlib import Path
from urllib.request import Request, urlopen
apply = '--apply' in sys.argv
mans = [Path(a) for a in sys.argv[1:] if not a.startswith('--')]
token = (Path(__file__).resolve().parents[2] / '.scrape/admin.token').read_text().strip()
LABEL = {'hotpepper.jp': 'Hot Pepper Gourmet listing', 'prtimes.jp': 'PR TIMES press release', 'tablecheck.com': 'TableCheck listing', 'arne.media': 'ARNE media article', 'tv-aichi.co.jp': 'TV Aichi campaign page'}
def api(path, method='GET', body=None):
    for attempt in range(5):
        try:
            r = Request('https://www.chronopin.com' + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                        headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
            return json.load(urlopen(r, timeout=60))
        except (TimeoutError, OSError) as e:
            if attempt == 4 or e.__class__.__name__ == 'HTTPError': raise
            time.sleep(4 * (attempt + 1))
want = {}
for m in mans:
    for e in json.load(open(m)):
        host = urllib.parse.urlparse(e['sourceUrl']).netloc.replace('www.', '')
        if host in LABEL: want.setdefault(e['id'], {})[(e['menuLabel'], e['itemName'])] = (host, e['sourceUrl'])
changed = 0
for rid, items in want.items():
    rec = api(f'/api/admin/restaurant-specials/{rid}'); n = 0
    for menu in rec['profile']['menus']:
        for it in menu['items']:
            k = (menu['label'], it['name'])
            img = it.get('image')
            if k in items and img and img['credit'].endswith('(official website)') and img['sourceUrl'] == items[k][1]:
                venue = img['credit'][len('Photo: '):-len(' (official website)')]
                label = LABEL[items[k][0]]
                img['credit'] = f'Photo: {venue} (via {label})'
                img['caption'] = img['caption'].replace("the operator's menu photo from its own website", f"the restaurant's menu photo as shown on its {label}").replace("operator's bottle photo of the named sake", f"the restaurant's bottle photo of the named sake as shown on its {label}")
                n += 1
    if not n: continue
    changed += n
    if not apply: print('Would fix', rid, n); continue
    api(f'/api/admin/restaurant-specials/{rid}', 'PUT', {k: rec[k] for k in ['revision', 'profile', 'enabled', 'regionSlug'] if k in rec})
    back = api(f'/api/admin/restaurant-specials/{rid}')
    if back['profile'] != rec['profile'] or back['revision'] != rec['revision'] + 1: raise SystemExit(f'Readback mismatch {rid}')
    print('Fixed', rid, n)
print('total', changed)
