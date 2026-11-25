#!/usr/bin/env python3
"""
Translates the secondary content tables (migration 0265, /api/admin/content-translations) on
production with Google Translate (the NMT endpoints in sync_translations.py), never an LLM.

- Text fields are treated as Markdown: YAML front matter, fenced code, footnote definitions,
  footnote refs [^s1], links, inline code, URLs and ** markers are kept verbatim; heading, list,
  table-cell and paragraph text is translated fragment by fragment.
- JSON fields (profile, reviews): only string values under a per-table list of prose keys are
  translated; every other value, key and array length is returned unchanged.
- A row-locale is saved only when every fragment translated and passed acceptable(); it is never
  saved with English left in. Fragments are cached per locale in .scrape/translations-cache/content/.
- Pacing and the CAPTCHA stop come from sync_translations (TRANSLATE_DELAY seconds between Google
  requests; a /sorry/ page or HTTP 429 stops the run).

Usage:
    TRANSLATE_DELAY=2 python3 .agents/skills/prod-translations/scripts/content_translations.py \\
        [--tables company-wiki,person-wiki] [--locale es,de] [--max-rows N] [--after N] [--dry-run]
"""

import argparse
import json
import pathlib
import re
import sys
import urllib.request
from typing import Callable, Dict, List, Optional, Set

sys.dont_write_bytecode = True
sys.stdout.reconfigure(line_buffering=True)
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import sync_translations as st  # noqa: E402

BASE = st.BASE
CACHE_DIR = st.CACHE_DIR / 'content'
CACHE_DIR.mkdir(exist_ok=True, parents=True)

# String keys inside JSON fields that hold prose. Everything else (names, codes, dates, URLs,
# prices, enums) is returned exactly as received.
JSON_PROSE_KEYS: Dict[str, Set[str]] = {
    'person-wiki': {'summary', 'note', 'title', 'label', 'basis', 'office', 'description', 'educationNote',
                    'politics', 'penalty', 'health', 'authority', 'destination', 'religion'},
    'pin-critic-review': {'quote', 'summary'},
    'restaurant-content': {'description', 'note', 'caption', 'quote', 'imageNote', 'hoursNote'},
    'restaurant-special-venue': {'description', 'note', 'caption', 'quote', 'imageNote', 'hoursNote'},
}

URL_RE = re.compile(r'^https?://\S+$')
# Inline tokens kept verbatim: footnote refs, inline code, links, URLs, HTML tags. **bold** spans stay
# inside their sentence (splitting there breaks word order in ja/ko/hi); see tidy_bold().
INLINE_PROTECT = re.compile(
    r'(\[\^[^\]]+\]'
    r'|`[^`]*`'
    r'|!?\[[^\]]*\]\([^)]*\)'
    r'|https?://[^\s\[]+'
    r'|<[^>]+>)'
)


def tidy_bold(src: str, tr: str) -> str:
    """Google often writes '** word **'; close the gaps, and drop the markers if it lost any."""
    if '*' not in src and '*' not in tr:
        return tr
    tr = re.sub(r'\*\*\s*(.+?)\s*\*\*', r'**\1**', tr)
    if tr.count('**') != src.count('**'):
        tr = tr.replace('**', '')
    return tr
FOOTNOTE_DEF = re.compile(r'^\s*\[\^[^\]]+\]:')
HEADING = re.compile(r'^(#{1,6}\s+)(.*)$')
LIST_ITEM = re.compile(r'^(\s*(?:[-*+]|\d+[.)])\s+)(.*)$')
QUOTE = re.compile(r'^(\s*>\s?)(.*)$')
TABLE_SEP = re.compile(r'^\s*\|?[\s:\-|]+\|[\s:\-|]*$')


def map_inline(text: str, fn: Callable[[str], str]) -> str:
    out: List[str] = []
    for i, part in enumerate(INLINE_PROTECT.split(text)):
        if i % 2 == 1 or not part:
            out.append(part)
            continue
        core = part.strip()
        if not core or not any(c.isalpha() for c in core):
            out.append(part)
            continue
        lead = part[: len(part) - len(part.lstrip())]
        trail = part[len(part.rstrip()):]
        out.append(lead + fn(core) + trail)
    return ''.join(out)


def map_markdown(text: str, fn: Callable[[str], str]) -> str:
    lines = text.split('\n')
    out: List[str] = []
    in_front = bool(lines) and lines[0].strip() == '---'
    in_fence = False
    for idx, line in enumerate(lines):
        if in_front:
            out.append(line)
            if idx > 0 and line.strip() == '---':
                in_front = False
            continue
        if line.lstrip().startswith('```'):
            in_fence = not in_fence
            out.append(line)
            continue
        if in_fence or not line.strip() or FOOTNOTE_DEF.match(line) or line.strip() == '---':
            out.append(line)
            continue
        if line.lstrip().startswith('|'):
            if TABLE_SEP.match(line):
                out.append(line)
            else:
                cells = line.split('|')
                out.append('|'.join(map_inline(c, fn) for c in cells))
            continue
        m = HEADING.match(line) or LIST_ITEM.match(line) or QUOTE.match(line)
        if m:
            out.append(m.group(1) + map_inline(m.group(2), fn))
            continue
        lead = line[: len(line) - len(line.lstrip())]
        out.append(lead + map_inline(line.lstrip(), fn))
    return '\n'.join(out)


def map_json(value, prose: Set[str], fn: Callable[[str], str], key: str = ''):
    if isinstance(value, dict):
        return {k: map_json(v, prose, fn, k) for k, v in value.items()}
    if isinstance(value, list):
        return [map_json(v, prose, fn, key) for v in value]
    if isinstance(value, str) and key in prose and not URL_RE.match(value.strip()) and any(c.isalpha() for c in value):
        return map_markdown(value, fn)
    return value


def map_fields(table: str, kinds: Dict[str, str], fields: dict, fn: Callable[[str], str]) -> dict:
    out = {}
    for name, val in fields.items():
        if val is None:
            out[name] = None
        elif kinds.get(name) == 'json':
            out[name] = map_json(val, JSON_PROSE_KEYS.get(table, set()), fn)
        else:
            out[name] = map_markdown(val, fn)
    return out


def tokens(s: str) -> List[str]:
    return sorted(re.findall(r'\[\^[^\]]+\]|https?://[^\s\[]+|`[^`\n]*`', s))


def structure_ok(src: dict, tr: dict) -> bool:
    """Same footnote refs, URLs and line count in every text; JSON shape is checked by the server."""
    def texts(v):
        if isinstance(v, str):
            yield v
        elif isinstance(v, dict):
            for x in v.values():
                yield from texts(x)
        elif isinstance(v, list):
            for x in v:
                yield from texts(x)
    a, b = list(texts(src)), list(texts(tr))
    if len(a) != len(b):
        return False
    for x, y in zip(a, b):
        if x.count('\n') != y.count('\n') or tokens(x) != tokens(y):
            return False
    return True


NAME_CONNECTORS = {'of', 'and', 'the', 'for', 'in', 'at', 'on', 'de', 'la', 'del', 'von', 'van', 'magna', 'summa', 'cum', 'laude'}


def name_only(src: str) -> bool:
    """A citation/credential list ("B.A., Huntingdon College (1969); J.D., University of Alabama"):
    every word is Capitalised, a connector, an initialism or a number, so it stays as written in any locale."""
    words = re.findall(r"[A-Za-z][A-Za-z'.\-]*", src)
    return bool(words) and all(w[0].isupper() or w.lower() in NAME_CONNECTORS for w in words)


class LocaleCache:
    def __init__(self, locale: str):
        self.locale = locale
        self.path = CACHE_DIR / f'{locale}.json'
        self.data: Dict[str, str] = {}
        if self.path.exists():
            try:
                self.data = json.loads(self.path.read_text(encoding='utf-8'))
            except Exception:
                self.data = {}
        self.new: Dict[str, str] = {}

    def fill(self, frags: Set[str]) -> int:
        missing = [t for t in sorted(frags) if t not in self.data]
        batches: List[List[str]] = []
        cur: List[str] = []
        chars = 0
        for t in missing:
            if cur and (len(cur) >= 25 or chars + len(t) > 4500):
                batches.append(cur)
                cur, chars = [], 0
            cur.append(t)
            chars += len(t)
        if cur:
            batches.append(cur)
        got = 0
        for i, b in enumerate(batches, 1):
            res = st.call_batch(b, self.locale)
            for src, tr in res.items():
                tr = tidy_bold(src, tr.strip())
                if self.locale == 'th':
                    tr = st.fix_thai_years(src, tr)
                if '\n' in tr:
                    continue
                same = tr.strip() == src.strip()
                if not (same and name_only(src)) and not st.acceptable(self.locale, src, tr):
                    continue
                self.data[src] = tr
                self.new[src] = tr
                got += 1
            if i % 5 == 0 or i == len(batches):
                self.save()
        return len(missing) - got

    def save(self):
        st._save_locale_cache_atomic(self.path, self.new)
        self.new = {}


_TOKEN: Dict[str, str] = {}


def api(token: str, method: str, path: str, body: Optional[dict] = None) -> dict:
    """Admin API call. The token argument is kept for call sites; a 401 renews the token
    (ensure_admin_token signs in again) and retries, so a run that outlives the token keeps going."""
    import urllib.error
    for attempt in range(3):
        tok = _TOKEN.get('t') or token
        req = urllib.request.Request(
            f'{BASE}{path}',
            data=json.dumps(body).encode('utf-8') if body is not None else None,
            method=method,
            headers={'Authorization': f'Bearer {tok}', 'Content-Type': 'application/json'},
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code != 401 or attempt == 2:
                raise
            print('  admin token rejected (401); renewing')
            _TOKEN['t'] = st.ensure_admin_token()
        except (urllib.error.URLError, TimeoutError):
            if attempt == 2:
                raise
            import time
            time.sleep(10 * (attempt + 1))
    raise RuntimeError('unreachable')


def push(token: str, table: str, rows: List[dict]) -> int:
    saved = 0
    for i in range(0, len(rows), 100):
        part = rows[i:i + 100]
        res = api(token, 'POST', '/api/admin/content-translations', {'table': table, 'translations': part})
        skipped = res.get('skipped') or []
        saved += len(part) - len(skipped)
        for s in skipped[:10]:
            print(f'    skipped: {json.dumps(s, ensure_ascii=False)[:200]}')
    return saved


def run_table(token: str, table: str, kinds: Dict[str, str], locales: List[str], page_size: int,
              after: int, max_rows: Optional[int], dry_run: bool, caches: Dict[str, LocaleCache]) -> Dict[str, int]:
    stats = {'rows': 0, 'saved': 0, 'unbuilt': 0, 'bad_structure': 0}
    loc_q = ','.join(locales)
    while after is not None:
        page = api(token, 'GET', f'/api/admin/content-translations?table={table}&locale={loc_q}&limit={page_size}&after={after}')
        rows = page['rows']
        if max_rows is not None:
            rows = rows[: max(0, max_rows - stats['rows'])]
        print(f'[{table}] after={after}: {len(rows)} due row(s)')
        stats['rows'] += len(rows)
        if rows and not dry_run:
            out: List[dict] = []
            for loc in locales:
                todo = [r for r in rows if loc in r['locales']]
                if not todo:
                    continue
                frags: Set[str] = set()
                for r in todo:
                    map_fields(table, kinds, r['fields'], lambda t: frags.add(t) or t)
                cache = caches.setdefault(loc, LocaleCache(loc))
                failed = cache.fill(frags)
                built = 0
                for r in todo:
                    miss: List[str] = []
                    tr = map_fields(table, kinds, r['fields'], lambda t: cache.data.get(t) or miss.append(t) or t)
                    if miss:
                        stats['unbuilt'] += 1
                        continue
                    if not structure_ok(r['fields'], tr):
                        stats['bad_structure'] += 1
                        print(f'  [{loc}] structure changed, not saved: {json.dumps(r["key"])}')
                        continue
                    out.append({'key': r['key'], 'locale': loc, 'sourceHash': r['sourceHash'], 'fields': tr})
                    built += 1
                print(f'  [{loc}] {built}/{len(todo)} row(s) built, {len(frags)} fragment(s), {failed} untranslated')
            if out:
                n = push(token, table, out)
                stats['saved'] += n
                print(f'  saved {n}/{len(out)} translation row(s)')
        if max_rows is not None and stats['rows'] >= max_rows:
            break
        after = page['next']
    return stats


def main():
    ap = argparse.ArgumentParser(description='Translate the 0265 content tables with Google Translate.')
    ap.add_argument('--tables', help='Comma-separated table names (default: every table with due rows, smallest first)')
    ap.add_argument('--locale', help='Comma-separated locales (default: all 15)')
    ap.add_argument('--page-size', type=int, default=50, help='Source rows scanned per GET page (default 50)')
    ap.add_argument('--after', type=int, default=0, help='Start offset for the first table')
    ap.add_argument('--max-rows', type=int, help='Stop each table after this many due rows (pilot)')
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()

    token = st.ensure_admin_token()
    cov = api(token, 'GET', '/api/admin/content-translations')
    defs = {t['name']: t for t in cov['tables']}
    locales = [l for l in st.LOCALES if not args.locale or l in args.locale.split(',')]
    if args.tables:
        names = args.tables.split(',')
        unknown = [n for n in names if n not in defs]
        if unknown:
            sys.exit(f'Unknown table(s): {unknown}')
    else:
        names = [t['name'] for t in sorted(cov['tables'], key=lambda t: t['due']) if t['due'] > 0]
    print('Due: ' + ', '.join(f"{n}={defs[n]['due']}" for n in names))

    caches: Dict[str, LocaleCache] = {}
    for i, name in enumerate(names):
        kinds = {f['name']: f['kind'] for f in defs[name]['fields']}
        try:
            stats = run_table(token, name, kinds, locales, args.page_size, args.after if i == 0 else 0,
                              args.max_rows, args.dry_run, caches)
        finally:
            for c in caches.values():
                c.save()
        print(f'[{name}] done: {stats}')


if __name__ == '__main__':
    main()
