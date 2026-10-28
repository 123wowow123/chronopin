#!/usr/bin/env python3
"""Replay the researched Nintendo catalog through authenticated management APIs.

Dry run by default. Examples (from repository root):
  python3 scripts/games/replayNintendo.py
  python3 scripts/games/replayNintendo.py --apply
  python3 scripts/games/replayNintendo.py --apply --base http://localhost:3000 --token-file .scrape/admin-localhost_3000.token --environment local

Never deploys, uses SQL, changes authors, or prints authentication credentials.
"""
import argparse
import datetime
import json
import html
import unicodedata
import pathlib
import re
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
CATALOG = ROOT / 'scripts/games/research/nintendo-2026-10-27.json'
p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--base', default='https://www.chronopin.com')
p.add_argument('--token-file', default='.scrape/admin.token')
p.add_argument('--environment', choices=['prod', 'local'], default='prod')
p.add_argument('--apply', action='store_true')
p.add_argument('--thumb-prefix', help='Public image storage prefix; defaults to production Azure or local Azurite')
p.add_argument('--verify-only', action='store_true')
p.add_argument('--finish-only', action='store_true', help='Refresh complete series indexes and repair review boundaries using saved ids')
args = p.parse_args()
base = args.base.rstrip('/')
thumb_prefix = args.thumb_prefix or ('http://127.0.0.1:10000/devstoreaccount1/thumb/' if urllib.parse.urlparse(base).hostname in ['localhost', '127.0.0.1'] else 'https://chronopin.blob.core.windows.net/thumb/')
token = (ROOT / args.token_file).read_text().strip()
catalog = json.loads(CATALOG.read_text())
result_path = CATALOG.with_name(f'nintendo-2026-10-27-{args.environment}.json')
old = json.loads(result_path.read_text()) if result_path.exists() else {}
records = old.get('pins', [])
by_key = {r['key']: r for r in records}


def api(method, route, body=None):
    request = urllib.request.Request(base + route, method=method, headers={
        'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json',
        'User-Agent': 'chronopin-nintendo-maintenance/1.0',
    }, data=None if body is None else json.dumps(body).encode())
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            data = response.read()
            return json.loads(data) if data else None
    except urllib.error.HTTPError as error:
        raise RuntimeError(f'{method} {route}: HTTP {error.code}: {error.read().decode()[:600]}') from None


def rows(table, filters):
    query = urllib.parse.urlencode({**filters, 'limit': 1000})
    data = api('GET', f'/api/admin/db/{table}?{query}')
    if data['total'] > len(data['rows']):
        raise RuntimeError('Refusing an incomplete matching query')
    return data['rows']


def persist():
    result_path.write_text(json.dumps({'base': base, 'checkedAt': '2026-10-27', 'pins': records}, ensure_ascii=False, indent=2) + '\n')


def wiki(game):
    summary = f"{game['name']} was released for {game['platform']} in {game['region']} on {game['date']}."
    return {'url': game['sourceUrl'], 'kind': 'web', 'title': game['sourceTitle'],
            'text': game['dateQuote'], 'generatedBy': 'codex/nintendo-research',
            'wiki': {'title': game['sourceTitle'], 'summary': summary,
                     'body': f"{summary}\n\n{game['gameplay']}\n\nRelease-date evidence: “{game['dateQuote']}”. This is the named platform edition's release, including ports and remakes where named; it is not a claim about the original game's first worldwide launch. Checked 2026-10-27.",
                     'tags': ['Nintendo', 'Gaming', game['series']], 'lastModified': None, 'topics': []}}


def body(game, parent):
    summary = f"{game['name']} launches for {game['platform']} in {game['region']} on {game['date']}. {game['gameplay']} [S]"
    summary += f"\n\nPart of the {game['series']} release-history thread. Ports and remakes retain their edition dates; the thread follows publication history rather than fictional story chronology."
    return {'userName': '@GameDesk', 'title': f"{game['name']} Releases for {game['platform']}",
            'productName': game['name'], 'description': game['gameplay'], 'longFormSummary': summary,
            'sourceUrl': game['sourceUrl'], 'utcStartDateTime': game['date'] + 'T00:00:00.000Z',
            'allDay': True, 'allDayStated': True, 'dateConfidence': 'confirmed',
            'dateConfidenceReasoning': f"{game['region']} release for {game['platform']}; opened HTTPS listing states “{game['dateQuote']}”.",
            'parentId': parent, 'categories': ['Gaming'], 'tags': ['Nintendo', game['series']],
            'references': game.get('additionalReferences', []), 'sourceWikis': [wiki(game)],
            'media': [{'type': 1, 'originalUrl': game['imageUrl'], 'authorName': game.get('imageCredit', 'Nintendo / respective rights holders'), 'authorUrl': game.get('imageSourceUrl', game['sourceUrl'])}] if game.get('imageUrl') else []}


me = api('GET', '/api/users/me')
assert me.get('role') == 'admin', 'Administrator session required'
games = sorted(catalog['games'], key=lambda g: (g['series'], g['date'], g['name']))
assert len({g['key'] for g in games}) == len(games)
assert len({g['sourceUrl'] for g in games}) == len(games)
for game in games:
    datetime.date.fromisoformat(game['date'])
    assert game['date'] <= '2026-10-27' or (game.get('existingOnly') and game.get('dateConfidence') in ['estimated', 'scheduled']), 'Future releases need separate confidence handling'
    assert game['sourceUrl'].startswith('https://') and game['dateQuote']
    for competitor in game.get('competitors', []):
        assert competitor['releaseDate'] <= game['date'], 'Competitor was not available at the milestone'
        assert competitor['sourceUrl'].startswith('https://')

# Match URLs in small chunks; production and local ids differ.
found = {}
for i in range(0, len(games), 8):
    urls = [g['sourceUrl'] for g in games[i:i+8]]
    for row in rows('Pin', {'sourceUrl.in': ','.join(urls), 'utcDeletedDateTime.null': 'true'}):
        if row['sourceUrl'] in found:
            raise RuntimeError('Ambiguous source URL: ' + row['sourceUrl'])
        found[row['sourceUrl']] = row
# Reuse pre-existing review pins by their original source URL in either environment.
for game in games:
    previous = by_key.get(game['key'])
    if previous and game['sourceUrl'] not in found:
        row = api('GET', '/api/admin/db/Pin/' + str(previous['id']))
        assert row and not row.get('utcDeletedDateTime') and row['sourceUrl'] == previous['savedSourceUrl']
        found[game['sourceUrl']] = row
    if game.get('existingSourceUrl') and game['sourceUrl'] not in found:
        matches = rows('Pin', {'sourceUrl': game['existingSourceUrl'], 'utcDeletedDateTime.null': 'true'})
        assert len(matches) <= 1, 'Ambiguous existing game'
        if matches:
            assert matches[0]['utcStartDateTime'][:10] == game['date'], 'Existing milestone needs a researched date correction'
            found[game['sourceUrl']] = matches[0]

print(json.dumps({'environment': args.environment, 'games': len(games), 'series': len({g['series'] for g in games}), 'existing': len(found), 'new': len(games)-len(found), 'apply': args.apply, 'verifyOnly': args.verify_only}), flush=True)
if not args.apply and not args.verify_only:
    raise SystemExit(0)

last = {}
ids = {key: row['id'] for key, row in found.items()}
for game in ([] if args.finish_only else games):
    parent = last.get(game['series'])
    # Tears of the Kingdom is a direct sequel to Breath of the Wild.
    if game['key'] == 'the-legend-of-zelda-tears-of-the-kingdom-switch':
        parent = ids['https://www.nintendo.com/us/store/products/the-legend-of-zelda-breath-of-the-wild-switch/']
    row = found.get(game['sourceUrl'])
    created = False
    if row is None:
        assert not args.verify_only and not game.get('existingOnly'), f"Missing existing pin {game['name']}"
        result = api('POST', '/api/admin/pins', {'pins': [body(game, parent)]})['results'][0]
        if 'error' in result:
            raise RuntimeError(f"Could not create {game['name']}: {result['error']}")
        assert all(w['status'] in ['saved', 'unchanged'] for w in result.get('wikis', [])), result
        row = api('GET', '/api/admin/db/Pin/' + str(result['id']))
        created = True
        # Persist the creation receipt before optional metadata/media work so
        # a failed verification can resume without losing provenance.
        by_key[game['key']] = {'key': game['key'], 'series': game['series'], 'name': game['name'], 'id': row['id'], 'parentId': parent, 'savedSourceUrl': row['sourceUrl'], 'date': game['date'], 'authorId': row['userId'], 'created': True, 'competitorCount': 0, 'imageBlobUrls': []}
        records[:] = list(by_key.values())
        persist()
    pin_id = row['id']
    if args.verify_only:
        assert row.get('parentId') == parent, f"Wrong parent for {pin_id}"
    elif row.get('parentId') != parent:
        before = row.get('parentId')
        api('PATCH', '/api/admin/db/Pin/' + str(pin_id), {'parentId': parent})
        print(f'RETHREAD {pin_id}: {before} -> {parent}', flush=True)
    if not args.verify_only:
        if not row.get('productName'):
            api('PATCH', '/api/admin/db/Pin/' + str(pin_id), {'productName': game['name']})
        refs = rows('PinReference', {'pinId': pin_id})
        if not created and not any(r['url'] == game['sourceUrl'] for r in refs) and row['sourceUrl'] != game['sourceUrl']:
            api('POST', '/api/admin/db/PinReference', {'pinId': pin_id, 'url': game['sourceUrl'], 'title': game['sourceTitle'], 'confidence': 100, 'reasoning': game['dateQuote'], 'addedByUserId': me['id']})
        # Add metadata tags without replacing the original author's tags.
        stored_tags = rows('PinTag', {'pinId': pin_id})
        for name, kind in [('Gaming', 'category'), ('Nintendo', 'topic'), (game['series'], 'topic')]:
            if not any(t['name'].lower() == name.lower() for t in stored_tags):
                api('POST', '/api/admin/db/PinTag', {'pinId': pin_id, 'name': name, 'kind': kind, 'source': 'user'})
        if game['platform'] in ['Nintendo Switch', 'Nintendo Switch 2']:
            info = api('GET', f'/api/pins/{pin_id}/game-info')
            if not info or info.get('source') != 'hand':
                api('PUT', f'/api/pins/{pin_id}/game-info', {'source': 'hand', 'sourceUrl': game['sourceUrl'], 'platforms': ['switch2' if game['platform'] == 'Nintendo Switch 2' else 'switch'], 'maturityBoard': game.get('maturityBoard') or (info or {}).get('maturityBoard'), 'maturityRating': game.get('maturityRating') or (info or {}).get('maturityRating'), 'descriptors': (info or {}).get('descriptors', [])})
        if len(game.get('competitors', [])) >= 2:
            payload = [{k: v for k, v in rival.items() if k != 'releaseDate'} for rival in game['competitors']]
            for rival in payload:
                # Link any rival already in this catalog; other rivals remain sourced named products.
                rival['competitorPinId'] = ids.get(rival['sourceUrl'])
            api('PUT', f'/api/pins/{pin_id}/competitors', payload)
    # Image preparation on the server replaces image metadata; restore source
    # credits after upload, and retain the verified Azure image as the live URL.
    image_blobs = []
    if game.get('imageUrl'):
        for link in rows('PinMedium', {'pinId': pin_id, 'utcDeletedDateTime.null': 'true'}):
            medium = api('GET', '/api/admin/db/Medium/' + str(link['mediumId']))
            if str(medium.get('type')) != '1' or not medium.get('thumbName'):
                continue
            blob = thumb_prefix.rstrip('/') + '/' + medium['thumbName']
            if medium.get('originalUrl') not in [game['imageUrl'], blob]:
                continue
            with urllib.request.urlopen(urllib.request.Request(blob, method='HEAD'), timeout=30) as response:
                assert response.status == 200 and response.headers.get('Content-Type', '').startswith('image/'), 'Azure image unavailable'
            credit = game.get('imageCredit', 'Nintendo / respective rights holders')
            patch = {'originalUrl': blob, 'originalWidth': medium['thumbWidth'], 'originalHeight': medium['thumbHeight'], 'authorName': credit, 'authorUrl': game.get('imageSourceUrl', game['sourceUrl'])}
            if args.verify_only:
                assert all(medium.get(k) == v for k, v in patch.items()), f'Image credit/storage mismatch {pin_id}'
            elif any(medium.get(k) != v for k, v in patch.items()):
                api('PATCH', '/api/admin/db/Medium/' + str(medium['id']), patch)
                after_medium = api('GET', '/api/admin/db/Medium/' + str(medium['id']))
                assert all(after_medium.get(k) == v for k, v in patch.items())
                # Medium has no pinId; touch the pin to expire its cached detail page.
                api('PATCH', '/api/admin/db/Pin/' + str(pin_id), {'utcUpdatedDateTime': datetime.datetime.now(datetime.timezone.utc).isoformat()})
            image_blobs.append(blob)
    saved = api('GET', '/api/admin/db/Pin/' + str(pin_id))
    assert saved['parentId'] == parent and saved['utcStartDateTime'][:10] == game['date']
    assert saved['userId'] == row['userId'], 'Author changed'
    assert saved['dateConfidence'] == row['dateConfidence'], 'Date confidence changed'
    if created:
        assert saved['userId'] == result['userId']
    saved_competitors = api('GET', f'/api/pins/{pin_id}/competitors') or []
    competitor_count = len(saved_competitors)
    if len(game.get('competitors', [])) >= 2:
        assert competitor_count == len(game['competitors'])
        for actual, expected in zip(saved_competitors, game['competitors']):
            assert all(actual.get(k) == expected.get(k) for k in ['rank', 'name', 'maker', 'sourceUrl', 'summary']), f'Competitor mismatch for {pin_id}'
    if args.verify_only and game['platform'] in ['Nintendo Switch', 'Nintendo Switch 2']:
        info = api('GET', f'/api/pins/{pin_id}/game-info')
        assert info and ('switch2' if game['platform'] == 'Nintendo Switch 2' else 'switch') in info['platforms'], f'Platform missing for {pin_id}'
    record = {'key': game['key'], 'series': game['series'], 'name': game['name'], 'id': pin_id,
              'parentId': parent, 'savedSourceUrl': saved['sourceUrl'], 'date': game['date'],
              'authorId': saved['userId'], 'created': by_key.get(game['key'], {}).get('created', created),
              'competitorCount': competitor_count, 'imageBlobUrls': image_blobs}
    by_key[game['key']] = record
    records[:] = list(by_key.values())
    if not args.verify_only:
        persist()
    ids[game['sourceUrl']] = pin_id
    last[game['series']] = pin_id
    print(('VERIFIED' if args.verify_only else 'CREATED' if created else 'REUSED') + f" {pin_id} {game['name']} -> {parent}", flush=True)
# A reused review's unrelated child must stay in its previous review chain.
boundaries = []
for move in catalog.get('reviewBoundaryMoves', []):
    matched = {}
    for field in ['childSourceUrl', 'fromSourceUrl', 'toSourceUrl']:
        found_rows = rows('Pin', {'sourceUrl': move[field], 'utcDeletedDateTime.null': 'true'})
        assert len(found_rows) <= 1, 'Ambiguous review boundary'
        matched[field] = found_rows[0] if found_rows else None
    if not all(matched.values()):
        boundaries.append({'childSourceUrl': move['childSourceUrl'], 'status': 'not-present-in-environment'})
        continue
    child, origin, target = [matched[f] for f in ['childSourceUrl', 'fromSourceUrl', 'toSourceUrl']]
    if child.get('parentId') != target['id']:
        assert not args.verify_only, f'Unrepaired review boundary {child["id"]}'
        assert child.get('parentId') == origin['id'], 'Review parent changed since the original snapshot; manual review required'
        api('PATCH', '/api/admin/db/Pin/' + str(child['id']), {'parentId': target['id']})
    saved = api('GET', '/api/admin/db/Pin/' + str(child['id']))
    assert saved['parentId'] == target['id'] and saved['userId'] == child['userId']
    boundaries.append({'id': child['id'], 'parentId': target['id'], 'status': 'verified'})
    print(f'REVIEW BOUNDARY VERIFIED {child["id"]} -> {target["id"]}', flush=True)
if args.apply:
    for game in games:
        pin_id = by_key[game['key']]['id']
        expected = []
        for rival in game['competitors']:
            item = {k: v for k, v in rival.items() if k != 'releaseDate'}
            item['competitorPinId'] = ids.get(item['sourceUrl'])
            expected.append(item)
        current = api('GET', f'/api/pins/{pin_id}/competitors') or []
        same = len(current) == len(expected) and all(all(a.get(k) == e.get(k) for k in ['rank', 'name', 'maker', 'sourceUrl', 'summary']) and (a.get('pin') or {}).get('id') == e.get('competitorPinId') for a, e in zip(current, expected))
        if not same:
            saved = api('PUT', f'/api/pins/{pin_id}/competitors', expected)
            assert len(saved) == len(expected)

# Every series has a complete native-link index. The current thread renderer
# follows same-author descendants, while these researched series intentionally
# preserve older reviewers' and curators' authorship.
marker = '<!-- Nintendo series catalog 2026-10-27 -->'
indexes = []
for series in sorted({g['series'] for g in games}):
    members = [g for g in games if g['series'] == series]
    mapped = [by_key[g['key']] for g in members]
    roots = [r for r in mapped if r['parentId'] is None]
    assert len(roots) == 1, f'Unexpected roots for {series}'
    root = roots[0]
    items = []
    for game, record in zip(members, mapped):
        slug = re.sub('[^a-z0-9]+', '-', unicodedata.normalize('NFKD', record['name']).encode('ascii', 'ignore').decode().lower()).strip('-')
        href = f'/pin/{record["id"]}/{slug}'
        when = game['date']
        if game.get('dateConfidence') == 'estimated':
            when = game['date'][:4] + ' (date estimated)'
        elif game.get('dateConfidence') == 'scheduled':
            when += ' (scheduled)'
        items.append(f'<li><a href="{href}">{html.escape(game["name"])}</a> — {html.escape(when)} · {html.escape(game["platform"])}</li>')
    addition = marker + '<h3>Series releases</h3><ol>' + ''.join(items) + '</ol>'
    current = api('GET', '/api/admin/db/Pin/' + str(root['id']))
    before = current.get('longFormSummary') or ''
    desired = before.split(marker)[0].rstrip() + '\n\n' + addition
    if args.verify_only:
        assert before == desired, f'Incomplete series index for {series}'
    elif before != desired:
        api('PATCH', '/api/admin/db/Pin/' + str(root['id']), {'longFormSummary': desired})
    stored_root = api('GET', '/api/admin/db/Pin/' + str(root['id']))
    assert stored_root['longFormSummary'] == desired and stored_root['userId'] == current['userId']
    indexes.append({'series': series, 'rootId': root['id'], 'gameCount': len(members), 'ids': [r['id'] for r in mapped]})
# checkedAt is a research date, not a source publication/update date.
# Clear the initial batch's incorrectly supplied wiki source date, only for
# sources generated by this exact catalog actor; other curators' wikis stay intact.
if args.apply:
    urls = [g['sourceUrl'] for g in games]
    for i in range(0, len(urls), 8):
        query = urllib.parse.urlencode({'url.in': ','.join(urls[i:i+8]), 'generatedBy': 'codex/nintendo-research', 'sourceModifiedDate': '2026-10-27'})
        api('PATCH', '/api/admin/db/Source?' + query, {'sourceModifiedDate': None})
if not args.verify_only:
    result_path.write_text(json.dumps({'base': base, 'checkedAt': '2026-10-27', 'pins': records, 'reviewBoundaries': boundaries, 'seriesIndexes': indexes}, ensure_ascii=False, indent=2) + '\n')
print('All catalog pins, competitors, platforms and parent links verified.', flush=True)
