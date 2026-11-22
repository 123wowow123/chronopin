#!/usr/bin/env python3
"""Nintendo IR "Million-Seller" tables -> life-to-date unit rows for the Sales figures panel (PinSales, 0267).

Usage: scripts/sales/nintendo_ir_tables.py WORKDIR "Mario Kart World" "Pikmin 4" ...
Writes WORKDIR/rows.json: [{title, asOf, value, sourceUrl, quote}], oldest first. It downloads every
quarterly results PDF it can find (needs curl and pdftotext), so run it from anywhere but give it a
WORKDIR outside the repo. A row counts only when Japan + overseas = the period total (the table's
two-column layout puts other titles' numbers on the same line). Review the rows, then send them with
PUT /api/pins/:id/sales (docs/okf/api/pin-sales.md); keep at most 8 per pin.
"""
import concurrent.futures as cf, glob, json, os, re, subprocess, sys

WORK = sys.argv[1]; TITLES = sys.argv[2:]
os.makedirs(WORK + '/pdf', exist_ok=True)
base = 'https://www.nintendo.co.jp/ir/pdf/'
# Releases are early Feb / May / Aug / Nov; files are YYMMDDe.pdf or YYMMDD_Ne.pdf (N = 2..6).
wins = [(2, 1, 12), (5, 3, 14), (8, 1, 10), (11, 1, 10)]
cands = [f'{base}{y}/{y % 100:02d}{m:02d}{d:02d}{s}.pdf' for y in range(2020, 2028) for m, a, b in wins for d in range(a, b + 1) for s in ['e', '_2e', '_3e', '_4e', '_5e', '_6e']]
def fetch(u):
    f = WORK + '/pdf/' + u.split('/pdf/')[1].replace('/', '_')
    code = subprocess.run(['curl', '-sL', '-m', '60', '-A', 'Mozilla/5.0', '-o', f, '-w', '%{http_code} %{content_type}', u], capture_output=True, text=True).stdout
    if code.startswith('200') and 'pdf' in code: subprocess.run(['pdftotext', '-layout', f, f[:-4] + '.txt'], stderr=subprocess.DEVNULL)
    else: os.path.exists(f) and os.remove(f)
with cf.ThreadPoolExecutor(16) as ex: list(ex.map(fetch, cands))

norm = lambda s: re.sub(r'[’‘]', "'", s)
rows = {}
for f in sorted(glob.glob(WORK + '/pdf/*.txt')):
    t = norm(open(f).read())
    if 'Million-Seller' not in t: continue
    y, rel = os.path.basename(f)[:-4].split('_', 1)  # folder year, YYMMDD...
    m = rel[2:4]
    asof = {'02': f'{int(y) - 1}-12-31', '05': f'{y}-03-31', '08': f'{y}-06-30', '11': f'{y}-09-30'}.get(m)
    if not asof: continue
    url = base + y + '/' + rel + '.pdf'
    for title in TITLES:
        for line in t.splitlines():
            if title in line:
                nums = re.findall(r'\d[\d,]*', line.split(title, 1)[1])[:4]
                v = [int(n.replace(',', '')) for n in nums]
                if len(v) == 4 and abs(v[1] + v[2] - v[0]) <= 1 and v[3] >= v[0] and re.match(r'\s+\d', line.split(title, 1)[1]):
                    q = f'Million-Seller Nintendo First-Party Titles (units in ten thousands): {title} {v[0]} | Japan {v[1]} | Outside of Japan {v[2]} | Life-to-date {nums[3]}'
                    rows[(title, asof)] = dict(title=title, asOf=asof, value=v[3] * 10000, sourceUrl=url, quote=q)
                    break
out = sorted(rows.values(), key=lambda r: (r['title'], r['asOf']))
json.dump(out, open(WORK + '/rows.json', 'w'), indent=1)
print(len(out), 'rows ->', WORK + '/rows.json')
