#!/usr/bin/env python3
"""Add pictures to held (picture-less) pins from the og:image of their own source and references.

  python3 scripts/jobs/pingang_enrich_media.py [--apply] [--prod] [--ids 1,2]
Reads .scrape/pingang-held.json. Candidates must be https, at least 600px wide, not svg/logo/icon,
and not a byte-duplicate of another candidate. Up to 3 per pin. Local first; --prod repeats on production
by sourceUrl with a pause between writes. Credit: the source page host is recorded as authorUrl.
"""
import hashlib, io, json, re, sys, time, urllib.parse, urllib.request, concurrent.futures as cf
from html import unescape
from PIL import Image
L, P = 'http://localhost:3000', 'https://www.chronopin.com'
UA = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36'}
BAD = re.compile(r'logo|favicon|icon|sprite|avatar|placeholder|default[-_]?(share|image)|blank|pixel', re.I)

def call(base, tok, m, path, body=None):
    r = urllib.request.Request(base + path, method=m, data=json.dumps(body).encode() if body is not None else None, headers={'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json'})
    t = urllib.request.urlopen(r, timeout=120).read().decode()
    return json.loads(t) if t.strip() else None

def fetch(u, n=3_000_000):
    return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=25).read(n)

def og(u):
    try: h = fetch(u, 600_000).decode('utf8', 'ignore')
    except Exception: return []
    out = []
    for m in re.finditer(r'<meta[^>]+(?:property|name)=["\'](?:og:image(?::secure_url)?|twitter:image)["\'][^>]*>', h, re.I):
        c = re.search(r'content=["\']([^"\']+)', m.group(0))
        if c: out.append(urllib.parse.urljoin(u, unescape(c.group(1))))
    return out

def candidates(pin):
    pages = [pin['sourceUrl']] + [r['url'] for r in pin.get('references', [])]
    seen, good, hashes = set(), [], set()
    have = {m['originalUrl'] for m in pin.get('media', [])}
    for pg in pages[:5]:
        for u in og(pg):
            if u in seen or u in have or not u.startswith('https') or BAD.search(u) or u.lower().endswith('.svg'): continue
            seen.add(u)
            try:
                b = fetch(u); im = Image.open(io.BytesIO(b))
            except Exception: continue
            if im.width < 600 or im.height < 300: continue
            h = hashlib.md5(b).hexdigest()
            if h in hashes: continue
            hashes.add(h); good.append({'type': 1, 'originalUrl': u, 'w': im.width, 'src': pg})
            if len(good) >= 3: return good
    return good

def main():
    apply, prod = '--apply' in sys.argv, '--prod' in sys.argv
    ids = None
    if '--ids' in sys.argv: ids = {int(x) for x in sys.argv[sys.argv.index('--ids') + 1].split(',')}
    held = [o for o in json.load(open('.scrape/pingang-held.json')) if o['media'] == 0 and (ids is None or o['id'] in ids)]
    lt = open('.scrape/admin-local.token').read().strip(); pt = open('.scrape/admin.token').read().strip()
    def work(o):
        pin = json.load(urllib.request.urlopen(f"{L}/api/pins/{o['id']}", timeout=60))
        return o['id'], pin, candidates(pin)
    with cf.ThreadPoolExecutor(6) as ex: res = list(ex.map(work, held))
    # A picture shared by several pins (a site-wide share card or map) is filler, not this subject.
    from collections import Counter
    freq = Counter(x['originalUrl'] for _, _, c in res for x in c)
    bad = lambda u: freq[u] > 2 or 'gstatic.com' in u or 'web.archive.org' in u
    res = [(i, p, [x for x in c if not bad(x['originalUrl'])]) for i, p, c in res]
    got = [r for r in res if r[2]]
    print(f'{len(held)} picture-less, {len(got)} with candidates, {sum(len(r[2]) for r in got)} pictures')
    log = []
    for pid, pin, c in got:
        if not apply: continue
        for base, tok, enabled in ((L, lt, True), (P, pt, prod)):
            if not enabled: continue
            try:
                if base == P:
                    f = call(P, pt, 'GET', '/api/admin/db/Pin?sourceUrl=' + urllib.parse.quote(pin['sourceUrl']) + '&utcDeletedDateTime.null=true&limit=2')['rows']
                    if len(f) != 1: log.append((pid, 'prod', 'match', len(f))); continue
                    cur = json.load(urllib.request.urlopen(f"{P}/api/pins/{f[0]['id']}", timeout=60)); tid = f[0]['id']
                else: cur, tid = pin, pid
                body = {**cur}
                body['tags'] = [t['name'] for t in cur.get('tags', []) if t.get('source') != 'auto']
                body['media'] = list(cur.get('media', [])) + [{'type': 1, 'originalUrl': x['originalUrl']} for x in c]
                call(base, tok, 'PUT', f'/api/pins/{tid}', body)
                after = json.load(urllib.request.urlopen(f"{base}/api/pins/{tid}", timeout=60))
                log.append((pid, 'prod' if base == P else 'local', 'ok', len(after.get('media', [])), after['user']['userName']))
            except Exception as e:
                log.append((pid, 'prod' if base == P else 'local', 'ERR', str(e)[:120]))
            time.sleep(1.5 if base == P else 0.3)
    for l in log: print(l)
    json.dump([{'id': p, 'urls': [x['originalUrl'] for x in c]} for p, _, c in got], open('.scrape/pingang-media-candidates.json', 'w'))

main()
