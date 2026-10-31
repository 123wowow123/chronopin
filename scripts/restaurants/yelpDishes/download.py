"""Download the matched Yelp photos. Usage: python3 download.py <dump.txt> <out-dir>
Dump lines: <venueId>|<yelp-slug>|<item>=<photoId>;;<item>=<photoId>"""
import os, sys, subprocess, concurrent.futures as cf
dump, out = sys.argv[1], sys.argv[2]
jobs = []
for line in open(dump, encoding='utf-8'):
    line = line.rstrip('\n')
    if not line: continue
    _, slug, rest = line.split('|', 2)
    d = f'{out}/{slug}'; os.makedirs(d, exist_ok=True)
    for ent in rest.split(';;'):
        jobs.append((f'{d}/{ent.rsplit("=", 1)[1]}.jpg', ent.rsplit('=', 1)[1]))
def go(j):
    f, pid = j
    if os.path.exists(f) and os.path.getsize(f) > 2000: return 1
    r = subprocess.run(['curl', '-s', '-f', '-o', f, f'https://s3-media0.fl.yelpcdn.com/bphoto/{pid}/o.jpg'])
    return 1 if r.returncode == 0 and os.path.getsize(f) > 2000 else 0
with cf.ThreadPoolExecutor(8) as ex: ok = sum(ex.map(go, jobs))
print(len(jobs), 'jobs', ok, 'downloaded')
