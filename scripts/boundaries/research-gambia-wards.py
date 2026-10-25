"""Extract an auditable IEC membership roster, not boundary geometry.

Cache https://iec.gm/wp-content/uploads/2026/03/Wards.docx at
.scrape/boundaries/gambia-iec-wards-2026.docx first. Uses the Python standard
library only. Blank rows are ignored; repeated codes and spelling variants
are retained and flagged. No database writes or guessed polygons.
"""
import hashlib
import json
import re
import xml.etree.ElementTree as ET
import zipfile
from collections import Counter, defaultdict
from pathlib import Path

path = Path('.scrape/boundaries/gambia-iec-wards-2026.docx')
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
with zipfile.ZipFile(path) as archive:
    document = ET.fromstring(archive.read('word/document.xml'))
    metadata = ET.fromstring(archive.read('docProps/core.xml'))
rows = []
for row in document.findall('.//w:tr', ns):
    cells = [''.join(t.text or '' for t in c.findall('.//w:t', ns)).strip()
             for c in row.findall('w:tc', ns)]
    assert len(cells) == 5
    if not any(cells):
        continue
    rows.append(cells)
assert rows.pop(0) == ['Region', 'Constituency', 'Ward', 'PS Code', 'Polling Station Stream']
assert len(rows) == 1555
assert all(all(row) and re.fullmatch(r'\d{6}', row[3]) for row in rows)
constituencies = defaultdict(list)
for row in rows:
    constituencies[row[1]].append(row)
assert len(constituencies) == 53
codes = Counter(row[3] for row in rows)
assert len(codes) == 1554 and {code: n for code, n in codes.items() if n > 1} == {'608061': 2}
records = []
prefixes = set()
for name, members in sorted(constituencies.items()):
    regions = {r[0] for r in members}
    prefix = {r[3][:3] for r in members}
    assert len(regions) == len(prefix) == 1
    prefix = next(iter(prefix))
    assert prefix not in prefixes
    prefixes.add(prefix)
    labels = Counter(r[2] for r in members)
    records.append({'name': name, 'region': next(iter(regions)),
                    'pollingCodePrefix': prefix,
                    'sourceRows': len(members),
                    'distinctPollingCodes': len({r[3] for r in members}),
                    'wardLabels': [{'name': n, 'sourceRows': count} for n, count in sorted(labels.items())]})
assert sum(len(r['wardLabels']) for r in records) == 121
duplicates = [{'pollingCode': code, 'occurrences': n,
               'sourceRows': [{'region': r[0], 'constituency': r[1], 'ward': r[2], 'station': r[4]}
                              for r in rows if r[3] == code]}
              for code, n in codes.items() if n > 1]
data = {
    'checkedAt': '2026-10-25', 'pinId': 2354,
    'source': 'Independent Electoral Commission, The Gambia — Wards',
    'sourcePage': 'https://iec.gm/ova_doc/21246/',
    'sourceUrl': 'https://iec.gm/wp-content/uploads/2026/03/Wards.docx',
    'sourceSha256': hashlib.sha256(path.read_bytes()).hexdigest(),
    'documentCreatedAt': metadata.findtext('{http://purl.org/dc/terms/}created'),
    'documentModifiedAt': metadata.findtext('{http://purl.org/dc/terms/}modified'),
    'scope': 'Constituency and ward labels as printed in IEC’s hosted document; whitespace trimmed only. Polling-code prefixes are derived grouping aids, not asserted official constituency identifiers.',
    'usableForBoundaryImport': False,
    'remainingGap': 'Need complete source-matched ward/constituency polygon geometry and current-plan validation; this roster does not define geographic rings.',
    'counts': {'constituencies': 53, 'sourceRows': 1555, 'distinctPollingCodes': 1554,
               'distinctConstituencyWardLabels': 121},
    'issues': [
        'Polling code 608061 appears twice with identical Upper Saloum / Njau rows. Both occurrences are retained in source-row counts.',
        'Tallinding Kunjang includes TALLINDING NORTH, TALLINDING NOUTH and TALLINDING SOUTH. The apparent spelling variant is retained, not silently merged; 121 labels must not be reported as 121 verified wards.',
        'The source file metadata is not proof that all membership reflects subsequent registration or the final 2027 election plan.',
    ],
    'duplicatePollingCodes': duplicates,
    'constituencies': records,
}
out = Path('scripts/boundaries/research-gambia-wards-2026-10-25.json')
out.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
print('Extracted 53 constituencies and 121 unmerged ward labels; no geometry or database writes')
