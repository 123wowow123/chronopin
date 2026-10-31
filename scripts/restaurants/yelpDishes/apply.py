"""Attach uploaded Yelp photos to specials-venue menu items. Usage: python3 apply.py <dump.txt> <upload.jsonl> [--apply]
upload.jsonl = output of: npx tsx scripts/restaurants/uploadDishPhotos.ts auto <out-dir>/<slug>/*.jpg (one run per slug, appended).
Needs .scrape/admin.token (expires ~2 h; re-sign in with ADMIN_PASSWORD from .env.local). Dry run unless --apply."""
import os, sys, json, urllib.request
dump, upl = sys.argv[1], sys.argv[2]; DRY = '--apply' not in sys.argv
tok = open(os.path.join(os.path.dirname(__file__), '../../../.scrape/admin.token')).read().strip()
def api(path, method='GET', body=None):
    r = urllib.request.Request('https://www.chronopin.com' + path, data=json.dumps(body).encode() if body else None, method=method,
                               headers={'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(r, timeout=60))
up = {}
for l in open(upl):
    d = json.loads(l); up[(os.path.basename(os.path.dirname(d['file'])), os.path.basename(d['file'])[:-4])] = d
venues = {v['id']: v for v in api('/api/admin/restaurant-specials')['venues']}
tot = nv = 0; miss = []
for line in open(dump, encoding='utf-8'):
    line = line.rstrip('\n')
    if not line: continue
    vid, slug, rest = line.split('|', 2); vid = int(vid); v = venues.get(vid)
    if not v: miss.append((vid, 'venue gone')); continue
    p = v['profile']; name = p['name']; n = 0
    for ent in rest.split(';;'):
        it, pid = ent.rsplit('=', 1); u = up.get((slug, pid))
        if not u: miss.append((vid, it, 'no upload')); continue
        for m in p['menus']:
            for i in m['items']:
                if i['name'] == it and 'image' not in i:
                    i['image'] = {'src': u['src'], 'caption': f'{it}, {name}', 'credit': f'Yelp reviewer photo, {name}',
                                  'sourceUrl': f'https://www.yelp.com/biz_photos/{slug}?select={pid}', 'width': u['width'], 'height': u['height']}; n += 1
    if n:
        nv += 1; tot += n
        if not DRY:
            try: api(f'/api/admin/restaurant-specials/{vid}', 'PUT', {'revision': v['revision'], 'regionSlug': v['regionSlug'], 'profile': p, 'enabled': v['enabled']})
            except Exception as e: miss.append((vid, 'PUT failed', str(e)))
print('dry' if DRY else 'applied', nv, 'venues', tot, 'images; problems', len(miss)); print(miss[:15])
