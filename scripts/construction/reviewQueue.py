"""Reconcile the dated queue after opened-source research; never writes live data.

Classification of non-construction subjects uses the saved pin's title and
description. This is a scope audit, not a claim to have newly verified each event.
Only the separate research manifest can supply newly assigned statuses.
"""
import html
import json
import re
import sys
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse

CATALOG = Path('scripts/construction/backfill-2026-10-24.json')
RESEARCH = Path(sys.argv[sys.argv.index('--manifest') + 1]) if '--manifest' in sys.argv else Path('scripts/construction/research-2026-10-24.json')
SNAPSHOTS = Path('.scrape/construction-status-backfill-2026-10-24')
GROUPS = [
    ('Product/design/software launch, rather than construction of a specified facility',
     [65, 79, 89, 106, 200, 358, 924, 2961, 3969, 4436, 4543, 15159]),
    ('Astronomical event; no construction scope', [257, 5139]),
    ('Accident, attack, outage or failure; no construction/refurbishment milestone',
     [517, 3192, 3453, 3561, 3645, 4720, 5532, 5534, 5538, 6102, 6103, 6105, 6107, 6108, 14128]),
    ('Policy, legal proceeding, election or wage rule; not a project construction milestone',
     [705, 2985, 2986, 2987, 2989, 2990, 3343, 3541, 3588, 3591, 3634, 3644, 3684,
      3908, 3998, 4724, 4727, 4732, 4733, 4734, 4739, 5205, 18972]),
    ('Hosted sports, fashion or medical-training event; not construction of the named venue',
     [855, 3259, 3317, 3533, 4068, 4986]),
    ('Operating, service, closure, removal or recall event without a construction/refurbishment scope',
     [2988, 2999, 3367, 3652, 6086, 6089, 6091, 6100, 6113, 6115, 6229, 6594, 14129]),
    ('Corporate governance, lease, ownership, treaty or political event; not physical construction',
     [3025, 3073, 3076, 3249, 5851, 6084, 6085, 6093, 6094, 6096]),
    ('Subsidence-risk forecast for an existing airport, rather than a build milestone', [545]),
    ('Archaeological discovery during excavation, rather than project-stage evidence', [878]),
    ('Crane fleet/equipment deployment; no independently pinned construction project scope', [948]),
]


def urls(pin):
    return list(dict.fromkeys([u for u in [pin.get('sourceUrl'), *re.findall(
        r'https?://[^\s"<>]+', pin.get('longFormSummary') or '')] if u]))


def plain(text):
    return re.sub(r'\s+', ' ', html.unescape(re.sub('<[^>]+>', ' ', text or ''))).strip()


def classify_gap(item, pin):
    links = urls(pin)
    if item.get('openedResearchFollowUp'):
        return item['gapCategory'], item['reason'], list(dict.fromkeys(links + item.get('evidenceUrls', [])))
    host = urlparse(pin.get('sourceUrl') or '').netloc
    title = pin['title']
    original = item.get('originalReason', item['reason'])
    if pin['id'] == 220:
        group = 'individual-source-or-phase'
        reason = 'Fehmarnbelt: opened April 2026 operator factsheet and May 17 phased-opening announcement establish continuing work but replace the single 2029 opening assumption with road first, rail later. Reconcile the pin’s full-opening scope and obtain the revised schedule and cost; no exact replacement date is published in those sources, and April omits the March budget figure.'
        links = list(dict.fromkeys(links + [
            'https://femern.com/media/lxjaphla/2604_factsheet_fehmarnbelt-tunnel_april2026.pdf',
            'https://femern.com/press/news/the-fehmarnbelt-tunnel-will-open-in-two-stages/',
            'https://femern.com/media/rwfigymb/2603_factsheet_fehmarnbelt-tunnel_march2026.pdf',
        ]))
    elif re.search(r'halt|disput|denied|withdrawn|conflict|moratorium|on hold|mixed phase', original, re.I):
        group = 'conflicting-or-halted-scope'
        reason = original
    elif host == 'epoch.ai':
        group = 'epoch-capacity-phase'
        reason = f'{title}: reconcile the pinned aggregate MW/compute trajectory with the operating buildings and future phases. An Epoch capacity or satellite-footprint entry alone does not establish construction status for the entire pinned scope.'
    elif host in {'trackdatacenters.com', 'datacentertracker.org'}:
        group = 'tracker-parcel-phase'
        reason = f'{title}: locate a dated operator, contractor or planning record for this exact parcel and MW phase. The saved tracker parcel/acreage/capacity entry does not distinguish proposed land, active building work and an operating campus.'
    elif not pin.get('sourceUrl') and re.search(r'ERCOT|queue|No IA|interconnection', title + ' ' + plain(pin.get('longFormSummary')), re.I):
        group = 'grid-request-identity'
        reason = f'{title}: reopen the project-specific queue row and reconcile its request ID, interconnection agreement and actual physical stage. Future COD, requested capacity and an IA are insufficient to establish a construction start or operation.'
    elif pin.get('sourceUrl') and len(urlparse(pin['sourceUrl']).path.strip('/').split('/')) <= 1 and host.endswith(('.gov', '.us')):
        group = 'project-source-not-established'
        reason = f'{title}: the saved source is an agency/county/organization landing page, with no project-specific stage evidence in the saved summary. First verify project identity, developer, docket/parcel and capacity, then obtain a dated phase record. Do not promote unsourced engineering or COD prose to evidence.'
    elif 7000 < pin['id'] < 7300:
        group = 'housing-milestone-source'
        reason = f'{title}: reopen the branch/development-specific opening, placed-in-service or active-build source cited in the saved housing timeline. Distinguish this building/phase from later campus phases; leasing, rents and applications alone are not completion.'
    else:
        group = 'individual-source-or-phase'
        reason = f'{title}: {original}. Follow up the project-specific cited source for the exact pinned building/unit/phase, separating physical work and operation from planned dates and predecessor facilities.'
    return group, reason, links


def main():
    report = json.loads(CATALOG.read_text())
    research = json.loads(RESEARCH.read_text())
    unresolved = {p['id']: p for p in research.get('unresolved', [])}
    report['openedSourceResearchManifests'] = list(dict.fromkeys([
        *report.get('openedSourceResearchManifests', ['scripts/construction/research-2026-10-24.json']),
        str(RESEARCH),
    ]))
    exclusions = {id: reason for reason, ids in GROUPS for id in ids}
    reviewed = []
    for env in report['environments']:
        host = urlparse(env['base']).hostname
        snapshots = {p['id']: p for p in json.loads((SNAPSHOTS / f'{host}-pins.json').read_text())}
        fresh = next(e for e in research['environments'] if e['base'] == env['base'])
        if any(not p.get('verified') or not p.get('metadataVerified') for p in fresh['pins']):
            raise RuntimeError(f'Live changes must be verified before resolving the queue: {env["base"]}')
        assigned = {p['id']: p for p in fresh['pins']}
        queue = env['researchQueue']
        env.setdefault('queueReviewOriginalCount', len(queue))
        # Each numbered bill/amendment in this range is a policy pin, not an
        # individual site. The two opposition campaigns also have no build scope.
        for item in queue:
            if 19092 <= item['id'] <= 19157 and re.match(r'^[A-Z]{2} ', item['title']):
                exclusions[item['id']] = 'State legislation, regulatory amendment or public opposition campaign; no individual construction milestone'
        remaining = []
        for item in queue:
            pin = snapshots[item['id']]
            if pin['title'] != item['title']:
                raise RuntimeError(f'Queue identity mismatch {item["id"]}')
            if item['id'] in assigned:
                new = assigned[item['id']]
                env['pins'].append({**item, **new, 'researchManifest': str(RESEARCH)})
                continue
            if item['id'] in exclusions:
                updated = {**item, 'originalReason': item.get('originalReason', item['reason']),
                           'reason': exclusions[item['id']], 'scopeEvidence': plain(pin.get('description')),
                           'reviewMethod': 'Saved subject/scope audit; no new source visit claimed', 'reviewedAt': '2026-10-24'}
                env['excluded'].append(updated)
                reviewed.append({'base': env['base'], **updated})
                continue
            group, reason, links = classify_gap(item, pin)
            follow_up = {}
            if item['id'] in unresolved:
                gap = unresolved[item['id']]
                if gap['title'] != item['title']:
                    raise RuntimeError(f'Unresolved research identity mismatch {item["id"]}')
                group, reason = gap['gapCategory'], gap['reason']
                links = list(dict.fromkeys(links + [s['url'] for s in gap['sources']]))
                follow_up = {'openedResearchFollowUp': str(RESEARCH)}
            remaining.append({**item, 'originalReason': item.get('originalReason', item['reason']),
                              'reason': reason, 'gapCategory': group, 'evidenceUrls': links,
                              'scopeReviewedAt': '2026-10-24', **follow_up})
        env['researchQueue'] = remaining
        env['pins'].sort(key=lambda p: p['id'])
        env['verifiedCount'] = sum(bool(p.get('verified')) for p in env['pins'])
        env['counts'] = dict(Counter(p['status'] for p in env['pins']))
        env['queueGapCounts'] = dict(Counter(p['gapCategory'] for p in remaining))
        env['queueScopeExcludedCount'] = sum(bool(p.get('scopeEvidence')) for p in env['excluded'])
        if len(env['pins']) + len(remaining) + len(env['excluded']) + len(env['previouslyTaggedCandidates']) != env['candidatesScreened']:
            raise RuntimeError('Candidate accounting mismatch')
        for key in ['pins', 'researchQueue', 'excluded']:
            if len({p['id'] for p in env[key]}) != len(env[key]):
                raise RuntimeError(f'Duplicate identity in {key}')
        print(env['base'], {k: len(env[k]) for k in ['pins', 'researchQueue', 'excluded']}, env['queueGapCounts'])
    report['queueScopeReview'] = {
        'checkedAt': '2026-10-24',
        'method': 'Complete saved-subject triage of the original queue; newly opened research is limited to openedSourceResearchManifests and the documented unresolved follow-ups. Other remaining cases are not claimed as freshly researched.',
        'openedUnresolvedResearch': [{
            'pinId': 220,
            'openedAt': '2026-10-24',
            'sources': [
                {'url': 'https://femern.com/media/lxjaphla/2604_factsheet_fehmarnbelt-tunnel_april2026.pdf',
                 'title': 'Factsheet Fehmarnbelt tunnel — April 2026',
                 'finding': 'Continuing physical work; finance section omits the cost figure published in March.'},
                {'url': 'https://femern.com/press/news/the-fehmarnbelt-tunnel-will-open-in-two-stages/',
                 'title': 'The Fehmarnbelt Tunnel will open in two stages', 'publishedDate': '2026-05-17',
                 'quote': 'the road connection will open first, while the railway will open later',
                 'finding': 'Replacement full-opening schedule will follow immersion experience; no exact new date supplied.'},
                {'url': 'https://femern.com/media/rwfigymb/2603_factsheet_fehmarnbelt-tunnel_march2026.pdf',
                 'title': 'Factsheet Fehmarnbelt tunnel — March 2026',
                 'quote': 'Overall financial framework of EUR 7.4 billion (2015 prices)',
                 'finding': 'Earlier published framework; check whether a revised forecast accompanies the revised phased schedule.'},
            ],
        }],
    }
    CATALOG.write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
    # Preserve the first scope audit on rerun.
    review_path = Path('scripts/construction/queue-scope-review-2026-10-24.json')
    if reviewed:
        review_path.write_text(json.dumps({'checkedAt': '2026-10-24', 'records': reviewed}, indent=2, ensure_ascii=False) + '\n')


if __name__ == '__main__':
    main()
