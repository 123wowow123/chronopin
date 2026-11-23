#!/usr/bin/env python3
"""HTTPS fallbacks for the SQL steps of sync_translations.py.

Used when SSH to the production VM is unavailable (scripts/prod-sql.sh fails). Everything here goes
through the authenticated admin table API (docs/okf/api/admin-db.md: GET/POST/PATCH
/api/admin/db/:table), so it needs only the admin token. It mirrors, step for step:

  * record_wiki_tracking()   -> attribution in SourceWiki (never pin content)
  * fetch_due_panel_pins()   -> PinPerf panels lacking 15-locale i18n
  * fetch_due_pro_tips()     -> PinProTip rows lacking a current PinProTipTranslation

The mangled-row repair prep (prepare_mangled_rows_for_repair) and the full audit
(check_translations.py) are bulk SQL scans and are not mirrored; callers print a warning and skip.
"""
import hashlib
import json
import re
import urllib.error
import urllib.parse
import urllib.request
from typing import Callable, Dict, List, Optional, Set

BASE = 'https://www.chronopin.com'
TRACK_TEXT = 'Translations completed using Gemini 4 Hydrogen (Medium).'
TRACK_BODY = ('Translations completed using Gemini 4 Hydrogen (Medium) across 15 target locales '
              '(es, fr, de, ja, zh, ko, hi, ar, th, it, ru, pt, ms, vi, id).')
TRACK_TAGS = ['translation', 'gemini-4-hydrogen-medium']
GENERATED_BY = 'gemini-4-hydrogen-medium/translations'


class Api:
    def __init__(self, get_token: Callable[[], str]):
        self._get_token = get_token
        self._token = get_token()

    def call(self, method: str, path: str, body=None, params: Optional[dict] = None):
        url = BASE + path + ('?' + urllib.parse.urlencode(params) if params else '')
        for attempt in range(2):
            req = urllib.request.Request(
                url, method=method,
                headers={'Authorization': 'Bearer ' + self._token, 'Content-Type': 'application/json'},
                data=json.dumps(body).encode('utf-8') if body is not None else None,
            )
            try:
                with urllib.request.urlopen(req, timeout=120) as r:
                    raw = r.read()
                    return json.loads(raw) if raw else None
            except urllib.error.HTTPError as e:
                if e.code == 401 and attempt == 0:
                    self._token = self._get_token()
                    continue
                raise RuntimeError(f'{method} {path} -> HTTP {e.code}: {e.read()[:300]!r}')

    def rows(self, table: str, page: int = 500, **filters) -> List[dict]:
        out: List[dict] = []
        offset = 0
        while True:
            d = self.call('GET', f'/api/admin/db/{table}', params={**filters, 'limit': page, 'offset': offset})
            batch = d.get('rows', [])
            out.extend(batch)
            if len(batch) < page:
                return out
            offset += page


def sha1_hex(text: str) -> str:
    return hashlib.sha1(text.encode('utf-8')).hexdigest()


def url_key(source_url: str) -> str:
    """Mirror of src/lib/citations.ts as the SQL in record_wiki_tracking computes it."""
    s = re.sub(r'#.*$', '', source_url.strip())
    s = re.sub(r'^https?://', '', s, flags=re.I)
    m = re.match(r'^[^/?]+', s)
    host = re.sub(r'^www\.', '', (m.group(0) if m else '').lower())
    pm = re.match(r'^[^/?]+(/[^?]*)', s)
    path = re.sub(r'/+$', '', pm.group(1) if pm else '')
    qm = re.search(r'\?.*$', s)
    return host + path + (qm.group(0) if qm else '')


def _alive_pin_ids(api: Api, ids: List[int]) -> Set[int]:
    alive: Set[int] = set()
    for i in range(0, len(ids), 100):
        chunk = ids[i:i + 100]
        for r in api.rows('Pin', **{'id.in': ','.join(map(str, chunk)), 'utcDeletedDateTime.null': 'true'}):
            alive.add(r['id'])
    return alive


# ---------------------------------------------------------------- wiki attribution
def record_wiki_tracking(api: Api, ids: List[int]) -> None:
    """Same effect as the SQL version: SourceWiki attribution only; never touches Pin text, never marks
    an unbuilt source ready or bumps wikiVersion."""
    if not ids:
        return
    print(f'Recording translation tracking in SourceWiki for {len(ids)} pin(s) (HTTPS)...')
    for pid in ids:
        pins = api.rows('Pin', **{'id': pid})
        if not pins:
            continue
        pin = pins[0]
        links = api.rows('PinSource', **{'pinId': pid, 'utcRemovedDateTime.null': 'true'})
        src = (pin.get('sourceUrl') or '').strip()
        if not links and re.match(r'^https?://', src, re.I):
            key = url_key(src)
            if key:
                found = api.rows('Source', **{'urlKey': key})
                if found:
                    source_id = found[0]['id']
                else:
                    created = api.call('POST', '/api/admin/db/Source', {
                        'urlKey': key, 'url': src, 'kind': 'web', 'status': 'pending',
                        'generatedBy': GENERATED_BY, 'wikiVersion': 0})
                    source_id = created['rows'][0]['id']
                summary = (pin.get('longFormSummary') or '').strip()
                src_row = api.rows('Source', **{'id': source_id})[0]
                api.call('POST', '/api/admin/db/PinSource?upsert=1', {
                    'pinId': pid, 'sourceId': source_id, 'role': 'source',
                    'summarizedWikiVersion': max(src_row['wikiVersion'], 1) if summary else None})
                links = api.rows('PinSource', **{'pinId': pid, 'utcRemovedDateTime.null': 'true'})
        if not links:
            continue
        links.sort(key=lambda l: (0 if l['role'] == 'source' else 1, l['sourceId']))
        primary = links[0]
        sid = primary['sourceId']
        src_row = api.rows('Source', **{'id': sid})[0]
        wikis = api.rows('SourceWiki', **{'sourceId': sid})
        has_translation = any(w['title'] == 'Translations' or 'translation' in (w.get('tags') or []) for w in wikis)
        root = next((w for w in wikis if w['parentId'] is None), None)
        if not wikis:
            api.call('POST', '/api/admin/db/SourceWiki', {
                'sourceId': sid, 'parentId': None, 'position': 0, 'type': 'Web Page',
                'title': src_row.get('title') or pin.get('title') or 'Source',
                'summary': TRACK_TEXT, 'body': TRACK_BODY, 'tags': TRACK_TAGS})
        elif root and not has_translation:
            kids = [w['position'] for w in wikis if w['parentId'] == root['id']]
            api.call('POST', '/api/admin/db/SourceWiki', {
                'sourceId': sid, 'parentId': root['id'], 'position': 1 + (max(kids) if kids else 0),
                'type': 'Metadata', 'title': 'Translations',
                'summary': TRACK_TEXT, 'body': TRACK_BODY, 'tags': TRACK_TAGS})
        if not src_row.get('generatedBy'):
            api.call('PATCH', f'/api/admin/db/Source/{sid}', {'generatedBy': GENERATED_BY})
        want = max(src_row['wikiVersion'], 1)
        if (pin.get('longFormSummary') or '').strip() and (primary.get('summarizedWikiVersion') is None
                                                          or primary['summarizedWikiVersion'] < want):
            api.call('PATCH', f"/api/admin/db/PinSource/{pid},{sid}", {'summarizedWikiVersion': want})


# ---------------------------------------------------------------- due panels / pro tips
def fetch_due_panel_pins(api: Api, chart_ok: Callable[[dict, str], bool], table_ok: Callable[[dict, str], bool],
                         locales: List[str], pin_ids: Optional[Set[int]] = None,
                         limit: Optional[int] = None) -> List[dict]:
    filters = {'pinId.in': ','.join(map(str, sorted(pin_ids)))} if pin_ids else {}
    due: List[dict] = []
    for r in api.rows('PinPerf', page=200, order='pinId', **filters):
        charts, tables = r.get('charts') or [], r.get('tables') or []
        if any(not chart_ok(c, l) for c in charts for l in locales) or any(not table_ok(t, l) for t in tables for l in locales):
            due.append({'pinId': r['pinId'], 'charts': charts, 'tables': tables})
    alive = _alive_pin_ids(api, [d['pinId'] for d in due])
    due = [d for d in due if d['pinId'] in alive]
    return due[:limit] if limit else due


def fetch_due_pro_tips(api: Api, locales: List[str], pin_ids: Optional[Set[int]] = None,
                       limit: Optional[int] = None) -> List[dict]:
    filters = {'pinId.in': ','.join(map(str, sorted(pin_ids)))} if pin_ids else {}
    tips = api.rows('PinProTip', order='pinId,id', **filters)
    have: Dict[int, Dict[str, dict]] = {}
    for t in api.rows('PinProTipTranslation', page=1000):
        have.setdefault(t['proTipId'], {})[t['locale']] = t
    items: List[dict] = []
    for t in tips:
        h = sha1_hex(t['tip'])
        missing = [l for l in locales
                   if not (l in have.get(t['id'], {})
                           and have[t['id']][l]['sourceHash'].strip() == h
                           and 0 < len(have[t['id']][l]['tip'].strip())
                           and len(have[t['id']][l]['tip']) <= 1500)]
        if missing:
            items.append({'proTipId': t['id'], 'pinId': t['pinId'], 'tip': t['tip'], 'sourceHash': h, 'locales': missing})
    alive = _alive_pin_ids(api, sorted({i['pinId'] for i in items}))
    items = [i for i in items if i['pinId'] in alive]
    if limit:
        keep: Set[int] = set()
        out = []
        for i in items:
            if i['pinId'] not in keep and len(keep) >= limit:
                continue
            keep.add(i['pinId'])
            out.append(i)
        items = out
    return items
