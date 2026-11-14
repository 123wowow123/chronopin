#!/usr/bin/env python3
"""List prod desk users missing from CURATORS (src/server/jobs/curators.ts), and the reverse.

Reads .scrape/admin.token (never printed). Exit code 1 when anything is missing.
"""
import json
import re
import sys
import urllib.request
from pathlib import Path

root = Path(__file__).resolve().parents[2]
token = (root / '.scrape' / 'admin.token').read_text().strip()
rows, offset = [], 0
while True:
    req = urllib.request.Request(
        f'https://www.chronopin.com/api/admin/db/User?userName.like=%25Desk%25&limit=200&offset={offset}',
        headers={'Authorization': 'Bearer ' + token},
    )
    data = json.load(urllib.request.urlopen(req))
    page = data.get('rows', data)
    rows += page
    if len(page) < 200:
        break
    offset += 200

bare = lambda h: h.lstrip('@').lower()
prod = {bare(r['userName']): r for r in rows if not r.get('utcDeletedDateTime')}
code = {bare(h) for h in re.findall(r"'(@\w+Desk)'\s*:", (root / 'src/server/jobs/curators.ts').read_text())}

missing = sorted((r['id'], r['userName']) for k, r in prod.items() if k not in code)
extra = sorted(code - set(prod))
print(f'prod desks: {len(prod)}, registry: {len(code)}')
print('on prod, missing from CURATORS:', missing or 'none')
print('in CURATORS, not on prod:', extra or 'none')
sys.exit(1 if missing else 0)
