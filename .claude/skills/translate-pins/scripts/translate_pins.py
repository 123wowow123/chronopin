#!/usr/bin/env python3
"""Rescan prod for pins missing a translation in the live languages, check
translations written by subagents, and save the good ones back.

Standard library only. Credentials come from the environment, never from a file:

  CHRONOPIN_EMAIL      admin account
  CHRONOPIN_PASSWORD   its password
  CHRONOPIN_URL        optional, default https://www.chronopin.com
  CHRONOPIN_TRANSLATE_DIR  optional work dir, default <tmp>/chronopin-translate

Subcommands (see SKILL.md for the whole flow):

  login                     sign in, keep the token in the work dir (mode 600)
  scan [--locales a,b] [--chunk 25]
                            list pins missing/outdated in the live languages (or
                            --locales), write chunk files, print one JOB line per
                            (chunk, language)
  validate CHUNK OUT LOCALE check one output file against its chunk
  sweep                     validate every output file; save the valid ones to prod
  status                    count what prod still lists as missing
  logout                    delete the token
"""
import argparse, json, os, re, sys, tempfile, time, urllib.error, urllib.request
from pathlib import Path

BASE = os.environ.get('CHRONOPIN_URL', 'https://www.chronopin.com').rstrip('/')
WORK = Path(os.environ.get('CHRONOPIN_TRANSLATE_DIR') or Path(tempfile.gettempdir()) / 'chronopin-translate')
TOKEN = WORK / 'token'
POSTED = WORK / 'posted.txt'

FIELDS = ('title', 'description', 'longFormSummary', 'dateConfidenceReasoning', 'delayReasoning')
SOURCE_FIELDS = ('id',) + FIELDS + ('sourceHash',)

# The text must contain its language's script (Latin languages are not checked).
SCRIPT = {
    'ja': r'[぀-ヿ一-鿿]', 'zh': r'[一-鿿]', 'ko': r'[가-힯]',
    'hi': r'[ऀ-ॿ]', 'ar': r'[؀-ۿ]', 'ru': r'[Ѐ-ӿ]', 'th': r'[฀-๿]',
}
# Tags, attributes and <cite> citations that must survive translation unchanged.
STRUCTURE = re.compile(r'</?[a-zA-Z0-9]+|<cite data-ref="[^"]*"></cite>|href="[^"]*"')


def say(*a):
    print(*a, flush=True)


def token():
    if not TOKEN.exists():
        sys.exit('not signed in: run `login` first')
    return TOKEN.read_text().strip()


def call(path, data=None, retries=3):
    headers = {'Authorization': 'Bearer ' + token()}
    body = None
    if data is not None:
        body = json.dumps(data).encode()
        headers['content-type'] = 'application/json'
    for attempt in range(retries):
        try:
            req = urllib.request.Request(BASE + path, data=body, headers=headers, method='POST' if body else 'GET')
            return json.load(urllib.request.urlopen(req, timeout=300))
        except urllib.error.HTTPError as e:
            if e.code in (502, 503, 504) and attempt < retries - 1:
                time.sleep(2 ** (attempt + 1))
                continue
            sys.exit(f'{path}: HTTP {e.code} {e.read()[:200]!r}')


def cmd_login(_):
    email, password = os.environ.get('CHRONOPIN_EMAIL'), os.environ.get('CHRONOPIN_PASSWORD')
    if not email or not password:
        sys.exit('set CHRONOPIN_EMAIL and CHRONOPIN_PASSWORD in the environment (never paste them into chat)')
    req = urllib.request.Request(BASE + '/auth/local', data=json.dumps({'email': email, 'password': password}).encode(),
                                 headers={'content-type': 'application/json'}, method='POST')
    try:
        tok = json.load(urllib.request.urlopen(req, timeout=60))['token']
    except urllib.error.HTTPError as e:
        sys.exit(f'login failed: HTTP {e.code} {e.read()[:160]!r}')
    WORK.mkdir(parents=True, exist_ok=True)
    TOKEN.write_text(tok)
    TOKEN.chmod(0o600)
    say('signed in as', email)


def cmd_logout(_):
    TOKEN.unlink(missing_ok=True)
    say('token deleted')


def live_locales():
    return call('/api/admin/multilingual')['locales']


def missing(locales):
    after, pins = 0, []
    while True:
        page = call(f"/api/admin/translations?locale={','.join(locales)}&limit=500&after={after}")['pins']
        if not page:
            return pins
        pins += page
        after = page[-1]['id']


def cmd_scan(a):
    locales = a.locales.split(',') if a.locales else live_locales()
    pins = missing(locales)
    states = {}
    for p in pins:
        for loc, st in p['states'].items():
            states[(loc, st)] = states.get((loc, st), 0) + 1
    say('languages:', ','.join(locales))
    say(f'{len(pins)} pin(s) missing or outdated', {f'{l}:{s}': n for (l, s), n in sorted(states.items())})
    if not pins:
        return
    run = time.strftime('r%m%d%H%M')
    (WORK / 'chunks').mkdir(parents=True, exist_ok=True)
    (WORK / 'out').mkdir(exist_ok=True)
    for i in range(0, len(pins), a.chunk):
        name = f'{run}c{i // a.chunk:02d}'
        part = pins[i:i + a.chunk]
        chunk = WORK / 'chunks' / f'{name}.json'
        chunk.write_text(json.dumps([{k: p[k] for k in SOURCE_FIELDS if k in p} for p in part], ensure_ascii=False))
        # a language is only a job if some pin of the chunk lacks it
        for loc in locales:
            if any(p['states'].get(loc) for p in part):
                say(f'JOB CHUNK={chunk} LOCALE={loc} OUT={WORK / "out" / f"{name}__{loc}.json"} PINS={len(part)}')


def check(chunk, out, loc):
    source = {p['id']: p for p in json.loads(Path(chunk).read_text())}
    rows = json.loads(Path(out).read_text())
    script = re.compile(SCRIPT[loc]) if loc in SCRIPT else None
    bad, seen = [], set()
    for r in rows:
        p = source.get(r.get('pinId'))
        if not p:
            bad.append((r.get('pinId'), 'unknown pin'))
            continue
        seen.add(p['id'])
        if r.get('locale') != loc or r.get('sourceHash') != p['sourceHash']:
            bad.append((p['id'], 'locale or sourceHash differs'))
            continue
        for f in FIELDS:
            a, b = p.get(f) or '', r.get(f) or ''
            if bool(a) != bool(b):
                bad.append((p['id'], f + ' present in one, empty in the other'))
            elif a and STRUCTURE.findall(a) != STRUCTURE.findall(b):
                bad.append((p['id'], f + ' tags or citations changed'))
            elif a and script and f in ('title', 'description', 'longFormSummary') and len(a) > 25 and not script.search(b):
                bad.append((p['id'], f + ' not in the target script'))
    bad += [(i, 'missing') for i in sorted(set(source) - seen)]
    return bad


def cmd_validate(a):
    bad = check(a.chunk, a.out, a.locale)
    say(len(bad), bad[:10])
    sys.exit(1 if bad else 0)


def cmd_sweep(_):
    posted = set(POSTED.read_text().split()) if POSTED.exists() else set()
    saved = 0
    for out in sorted((WORK / 'out').glob('*__*.json')):
        if out.stem in posted:
            continue
        chunk, loc = out.stem.split('__')
        try:
            bad = check(WORK / 'chunks' / f'{chunk}.json', out, loc)
        except (ValueError, OSError):
            say(out.stem, 'still being written')
            continue
        if bad:
            say(out.stem, 'NOT VALID YET', bad[:3])   # its agent may still be fixing it
            continue
        rows = json.loads(out.read_text())
        res = call('/api/admin/translations', {'translations': rows})
        say(f"{out.stem}: saved {res['saved']} of {len(rows)}", res['skipped'][:3] or '')
        # a pin edited since the scan is skipped on purpose; the next scan picks it up
        with POSTED.open('a') as f:
            f.write(out.stem + '\n')
        saved += 1
    say(f'{saved} file(s) saved this sweep')


def cmd_status(a):
    locales = a.locales.split(',') if a.locales else live_locales()
    pins = missing(locales)
    say(f"languages {','.join(locales)}: {len(pins)} pin(s) still missing or outdated",
        [(p['id'], p['title'][:40]) for p in pins][:8])


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    sub.add_parser('login').set_defaults(fn=cmd_login)
    sub.add_parser('logout').set_defaults(fn=cmd_logout)
    p = sub.add_parser('scan'); p.add_argument('--locales'); p.add_argument('--chunk', type=int, default=25); p.set_defaults(fn=cmd_scan)
    p = sub.add_parser('validate'); p.add_argument('chunk'); p.add_argument('out'); p.add_argument('locale'); p.set_defaults(fn=cmd_validate)
    sub.add_parser('sweep').set_defaults(fn=cmd_sweep)
    p = sub.add_parser('status'); p.add_argument('--locales'); p.set_defaults(fn=cmd_status)
    a = ap.parse_args()
    a.fn(a)


if __name__ == '__main__':
    main()
