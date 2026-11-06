"""Attach the 15-locale translations in modelPanels.i18n.json to the untranslated spec/benchmark panels of
Claude Fable 5.1 (2693) and GPT-6 Astra (4802), through PUT /api/pins/:id/performance (admin token in .scrape).

  python3 -I scripts/models/modelPanelsI18n.py local|prod

Matches panels by English title; panels that already carry i18n are left alone.
"""
import json, sys, urllib.request
env = sys.argv[1]
B, TOK = {'prod': ('https://www.chronopin.com', '.scrape/admin.token'), 'local': ('http://localhost:3000', '.scrape/admin-local.token')}[env]
T = open(TOK).read().strip()
TR = json.load(open('scripts/models/modelPanels.i18n.json'))
def req(path, method='GET', body=None):
    r = urllib.request.Request(B + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                               headers={'Authorization': 'Bearer ' + T, 'Content-Type': 'application/json', 'User-Agent': 'chronopin-job'})
    with urllib.request.urlopen(r, timeout=60) as x:
        t = x.read(); return json.loads(t) if t else None
def rows(l, v): return [[a, b] for a, b in zip(l, v)]
CH = {  # english title -> (note key or None, title key or None)
  'Terminal-Bench 4.0': ('n1', None), 'GDPval-AA v2': ('n2', None), "Humanity's Last Exam (no tools)": ('n3', 'hle'), 'ARC-AGI-3 score at launch': ('an', 'at')}
TB = {'Claude Fable 5.1 specs as launched': ('ft', 'fl', 'fv', 'fnote'), 'GPT-6 Astra specs as launched': ('gt', 'gl', 'gv', 'gnote')}
for pin in (2693, 4802):
    cur = req(f'/api/pins/{pin}/performance')
    for c in cur['charts']:
        if c['title'] in CH and not c.get('i18n'):
            n, t = CH[c['title']]
            c['i18n'] = {l: {'title': TR[l][t] if t else c['title'], 'unit': c['unit'], 'note': TR[l][n]} for l in TR}
    for t in cur['tables']:
        if t['title'] in TB and not t.get('i18n'):
            tk, lk, vk, nk = TB[t['title']]
            t['i18n'] = {l: {'title': TR[l][tk], 'columns': TR[l]['cols'], 'rows': rows(TR[l][lk], TR[l][vk]), 'note': TR[l][nk]} for l in TR}
    res = req(f'/api/pins/{pin}/performance', 'PUT', {'charts': cur['charts'], 'tables': cur['tables']})
    print(env, pin, [(x['title'][:28], len(x.get('i18n', {}))) for k in ('charts', 'tables') for x in res[k]])
