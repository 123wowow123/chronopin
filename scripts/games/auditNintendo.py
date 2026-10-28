#!/usr/bin/env python3
"""Read-only bulk verification of the saved Nintendo catalog against live APIs."""
import argparse
import json
import pathlib
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--base', default='https://www.chronopin.com')
p.add_argument('--token-file', default='.scrape/admin.token')
p.add_argument('--environment', choices=['prod', 'local'], default='prod')
a = p.parse_args()
base = a.base.rstrip('/')
token = (ROOT / a.token_file).read_text().strip()
catalog_path = ROOT / 'scripts/games/research/nintendo-2026-10-27.json'
catalog = json.loads(catalog_path.read_text())
manifest = json.loads(catalog_path.with_name(f'nintendo-2026-10-27-{a.environment}.json').read_text())
records = {r['key']: r for r in manifest['pins']}
ids = [records[g['key']]['id'] for g in catalog['games']]


def api(path):
    with urllib.request.urlopen(urllib.request.Request(base + path, headers={'Authorization': 'Bearer ' + token}), timeout=90) as r:
        return json.load(r)


def table(name, field='pinId'):
    result = []
    for start in range(0, len(ids), 70):
        q = urllib.parse.urlencode({field + '.in': ','.join(map(str, ids[start:start+70])), 'limit': 1000})
        d = api('/api/admin/db/' + name + '?' + q)
        assert d['total'] == len(d['rows']), f'Truncated {name} query'
        result.extend(d['rows'])
    return result


pins = {r['id']: r for r in table('Pin', 'id')}
competitors = table('PinCompetitor')
canonical_ids = {g['sourceUrl']: records[g['key']]['id'] for g in catalog['games']}
infos = {r['pinId']: r for r in table('PinGameInfo')}
tags = table('PinTag')
refs = table('PinReference')
checks = []
for game in catalog['games']:
    record = records[game['key']]
    pin = pins[record['id']]
    assert not pin['utcDeletedDateTime']
    assert pin['parentId'] == record['parentId']
    assert pin['utcStartDateTime'][:10] == game['date'] and pin['allDay']
    assert pin['userId'] == record['authorId']
    assert pin['sourceUrl'] == record['savedSourceUrl']
    if game.get('dateConfidence'):
        assert pin['dateConfidence'] == game['dateConfidence']
    if pin['sourceUrl'] != game['sourceUrl']:
        assert any(r['pinId'] == pin['id'] and r['url'] == game['sourceUrl'] for r in refs)
    actual = sorted([r for r in competitors if r['pinId'] == pin['id']], key=lambda r: r['rank'])
    assert 2 <= len(actual) <= 5 and len(actual) == len(game['competitors'])
    for stored, expected in zip(actual, game['competitors']):
        assert all(stored[k] == expected[k] for k in ['rank', 'name', 'maker', 'sourceUrl', 'summary']), f'Competitor mismatch: {game["name"]}'
        assert expected['releaseDate'] <= game['date']
        if expected['sourceUrl'] in canonical_ids:
            assert stored['competitorPinId'] == canonical_ids[expected['sourceUrl']], f'Unlinked existing competitor: {game["name"]}'
    if game['platform'] in ['Nintendo Switch', 'Nintendo Switch 2']:
        info = infos[pin['id']]
        assert ('switch2' if game['platform'] == 'Nintendo Switch 2' else 'switch') in info['platforms']
        assert info['source'] == 'hand', 'Researched edition profile must survive automatic original-game lookups'
    names = {r['name'].lower() for r in tags if r['pinId'] == pin['id']}
    assert {'gaming', 'nintendo', game['series'].lower()} <= names
    seen = set()
    parent = pin['id']
    while parent is not None:
        assert parent not in seen and parent in pins, 'Cycle or outside-series parent'
        seen.add(parent)
        parent = pins[parent]['parentId']
    checks.append({'id': pin['id'], 'key': game['key'], 'competitors': len(actual), 'parentId': pin['parentId'], 'authorPreserved': True})

links = table('PinMedium')
medium_ids = sorted({r['mediumId'] for r in links if r.get('utcDeletedDateTime') is None})
media = {}
for start in range(0, len(medium_ids), 70):
    q = urllib.parse.urlencode({'id.in': ','.join(map(str, medium_ids[start:start+70])), 'limit': 1000})
    result = api('/api/admin/db/Medium?' + q)
    assert result['total'] == len(result['rows'])
    media.update({r['id']: r for r in result['rows']})
for game in catalog['games']:
    record = records[game['key']]
    for blob in record.get('imageBlobUrls', []):
        candidates = [media[r['mediumId']] for r in links if r['pinId'] == record['id'] and r.get('utcDeletedDateTime') is None and r['mediumId'] in media]
        matching = [m for m in candidates if m.get('originalUrl') == blob]
        assert matching and all(m['authorName'] == game.get('imageCredit', 'Nintendo / respective rights holders') and m['authorUrl'] == game.get('imageSourceUrl', game['sourceUrl']) for m in matching), f'Image source/credit mismatch: {game["name"]}'
# New catalog sources have ready wikis; checking is not a source publication date.
source_count = 0
new_urls = [g['sourceUrl'] for g in catalog['games'] if records[g['key']]['created']]
for start in range(0, len(new_urls), 8):
    q = urllib.parse.urlencode({'url.in': ','.join(new_urls[start:start+8]), 'limit': 1000})
    sources = api('/api/admin/db/Source?' + q)['rows']
    assert len(sources) == len(new_urls[start:start+8])
    for source in sources:
        assert source['status'] == 'ready' and source['wikiVersion'] > 0
        if source.get('generatedBy') == 'codex/nintendo-research':
            assert source.get('sourceModifiedDate') is None
    source_count += len(sources)

for index in manifest['seriesIndexes']:
    root = pins[index['rootId']]
    assert '<!-- Nintendo series catalog 2026-10-27 -->' in root['longFormSummary']
    assert len(index['ids']) == index['gameCount']
    for id in index['ids']:
        assert f'/pin/{id}/' in root['longFormSummary']
assert len(manifest['seriesIndexes']) == 32
assert all(r['status'] in ['verified', 'not-present-in-environment'] for r in manifest['reviewBoundaries'])

report = {'base': base, 'checkedAt': '2026-10-27', 'pinCount': len(checks),
          'createdCount': sum(bool(r['created']) for r in records.values()),
          'reusedCount': sum(not bool(r['created']) for r in records.values()),
          'seriesCount': len(manifest['seriesIndexes']), 'competitorCount': len(competitors),
          'nativePlatformProfiles': len([g for g in catalog['games'] if g['platform'] in ['Nintendo Switch', 'Nintendo Switch 2']]),
          ('verifiedAzureImages' if a.environment == 'prod' else 'verifiedAzuriteImages'): sum(len(r.get('imageBlobUrls', [])) for r in records.values()), 'readySourceWikis': source_count,
          'checks': checks, 'reviewBoundaries': manifest['reviewBoundaries']}
output = catalog_path.with_name(f'nintendo-2026-10-27-{a.environment}-verification.json')
output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({k: v for k, v in report.items() if k not in ['checks', 'reviewBoundaries']}, indent=2))
