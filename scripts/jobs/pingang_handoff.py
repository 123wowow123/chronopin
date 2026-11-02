#!/usr/bin/env python3
"""Move @ThePinGang pins to the curator desk that fits and keep thin ones back.

Part of the 06:00/18:00 news job (daily-jobs.md#pingangHandoff). Reads every live pin by
user 1 from local, maps its categories to a desk, and moves only "good" pins
(>=2 references, >600 characters of summary, >=1 picture, no mojibake title) with
POST /api/admin/pins/author on local and production (ids match for these older pins;
production is matched by sourceUrl to be safe). Thin pins are listed, not moved.

  python3 scripts/jobs/pingang_handoff.py            # dry run
  python3 scripts/jobs/pingang_handoff.py --apply    # move them
Needs .scrape/admin-local.token and .scrape/admin.token (admin-login-refresh skill).
"""
import json, re, sys, urllib.parse, urllib.request, concurrent.futures as cf, collections

L, P = 'http://localhost:3000', 'https://www.chronopin.com'
ORDER = [('Gaming','@GameDesk'),('Anime','@AnimeDesk'),('Movie','@FilmDesk'),('TV','@FilmDesk'),('AI','@AIDesk'),('Robotics','@RoboticsDesk'),('Semiconductors','@ChipDesk'),('Telecom','@TelecomDesk'),('Cybersecurity','@CyberDesk'),('Health','@HealthDesk'),('Energy','@EnergyDesk'),('Policy','@PolicyDesk'),('Law','@LawDesk'),('Sports','@SportDesk'),('Automotive','@MotorDesk'),('Software','@TechDesk'),('Electronics','@DeviceDesk'),('Computing','@TechDesk'),('Finance','@MarketDesk'),('Business','@MarketDesk'),('Geopolitics','@PoliticsDesk'),('Disaster','@QuakeDesk'),('Climate','@ClimateDesk'),('Astronomy','@ScienceDesk'),('Science','@ScienceDesk'),('Marine','@ScienceDesk'),('Space','@BuildDesk'),('Aerospace','@BuildDesk'),('Transport','@BuildDesk'),('Architecture','@BuildDesk'),('Property','@BuildDesk'),('Infrastructure','@BuildDesk'),('Travel','@TravelDesk'),('Audio','@DeviceDesk')]

def call(base, tok, method, path, body=None):
    r = urllib.request.Request(base + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                               headers={'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json'})
    t = urllib.request.urlopen(r, timeout=120).read().decode()
    return json.loads(t) if t.strip() else None

def desk(o):
    if re.search(r'data cent(re|er)|datacenter|hyperscale', o['title'], re.I): return '@DataCenterDesk'
    for c, d in ORDER:
        if c in o['cats']: return d
    return None

def good(o): return o['refs'] >= 2 and o['len'] > 600 and o['media'] >= 1 and '�' not in o['title']

def main(apply):
    lt = open('.scrape/admin-local.token').read().strip(); pt = open('.scrape/admin.token').read().strip()
    rows, off = [], 0
    while True:
        d = call(L, lt, 'GET', f'/api/admin/db/Pin?userId=1&utcDeletedDateTime.null=true&limit=200&offset={off}')['rows']
        rows += d
        if len(d) < 200: break
        off += 200
    def detail(r):
        d = json.load(urllib.request.urlopen(f"{L}/api/pins/{r['id']}", timeout=60))
        return {'id': r['id'], 'sourceUrl': r['sourceUrl'], 'title': d['title'], 'cats': d.get('categories', []), 'refs': len(d.get('references', [])), 'media': len(d.get('media', [])), 'len': len(d.get('longFormSummary') or '')}
    with cf.ThreadPoolExecutor(8) as ex: pins = list(ex.map(detail, rows))
    move = collections.defaultdict(list); held = []
    for o in pins:
        dk = desk(o)
        (move[dk] if dk and good(o) else held).append(o)
    print('movable', {k: len(v) for k, v in move.items()}, 'held (thin or no desk)', len(held))
    if not apply: return
    for dk, items in move.items():
        for i in range(0, len(items), 100):
            chunk = items[i:i + 100]
            r = call(L, lt, 'POST', '/api/admin/pins/author', {'ids': [o['id'] for o in chunk], 'userName': dk})
            print('local', dk, len(r.get('updated', [])), 'updated')
            prod_ids = []
            for o in chunk:  # prod id by sourceUrl, never assume the local id
                f = call(P, pt, 'GET', '/api/admin/db/Pin?sourceUrl=' + urllib.parse.quote(o['sourceUrl']) + '&utcDeletedDateTime.null=true&limit=2')['rows']
                if len(f) == 1 and f[0].get('userId') == 1: prod_ids.append(f[0]['id'])
            if prod_ids:
                r = call(P, pt, 'POST', '/api/admin/pins/author', {'ids': prod_ids, 'userName': dk})
                print('prod ', dk, len(r.get('updated', [])), 'updated')
    json.dump([{'id': o['id'], 'title': o['title'], 'refs': o['refs'], 'media': o['media'], 'len': o['len'], 'desk': desk(o)} for o in held], open('.scrape/pingang-held.json', 'w'))

if __name__ == '__main__':
    main('--apply' in sys.argv)
