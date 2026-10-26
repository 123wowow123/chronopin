"""Compare official INEC RAC names with GRID3; never infer a spatial join.

Inputs are the Lagos/Rivers PDFs linked by https://www.inecnigeria.org/resources/rac
converted with pdftotext -layout, and the saved GRID3 v4 attribute query.
"""
import hashlib
import json
import re
from pathlib import Path

root = Path('.scrape/boundaries')
operational = json.loads((root / 'nigeria-grid4-lagos-rivers-attributes.json').read_text())['features']
targets = {
    'Lagos': [('14', 'Lagos Island', 19), ('16', 'Mushin', 14),
              ('18', 'Oshodi/Isolo', 11), ('20', 'Surulere', 12)],
    'Rivers': [('22', 'Port-Harcourt', 20)],
}
result = {'checkedAt': '2026-10-25', 'usableForBoundaryImport': False, 'lgas': []}
for state, specs in targets.items():
    filename = f'nigeria-{state.lower()}-rac-gap2'
    text = (root / (filename + '.txt')).read_text()
    for code, name, count in specs:
        match = re.search(r'LGA\s*:\s*[^\n]+?CODE\s*:\s*' + code + r'\b', text)
        assert match, (state, code)
        chunk = text[match.end():]
        next_lga = re.search(r'LGA\s*:', chunk)
        if next_lga:
            chunk = chunk[:next_lga.start()]
        rows = []
        for line in chunk.splitlines():
            row = re.match(r'^\s*(\d+)\s+(.+?)\s{2,}(\d{2})(?:\s|$)', line)
            if row:
                number, label, ward_code = row.groups()
                if label.strip():
                    rows.append({'code': ward_code, 'name': label.strip(), 'sourceRowNumber': int(number)})
        # Surulere ward 09's label wraps before its numbered/code row.
        if state == 'Lagos' and code == '20':
            row = re.search(r'IPONRI HOUSING\s*\n\s*9\s+09\s+[^\n]+\n\s*ESTATE/ERIC MOORE', chunk)
            assert row
            rows.append({'code': '09', 'name': 'IPONRI HOUSING ESTATE/ERIC MOORE', 'sourceRowNumber': 9})
        rows.sort(key=lambda r: r['code'])
        assert len(rows) == count, (name, len(rows), count)
        assert [int(r['code']) for r in rows] == list(range(1, count + 1))
        ops = [f['attributes'] for f in operational if f['attributes']['state'] == state and f['attributes']['lga'] == name]
        assert ops
        result['lgas'].append({
            'state': state, 'lga': name, 'inecLgaCode': code,
            'source': f'https://www.inecnigeria.org/documents/resources/rac/{state.upper()}.pdf',
            'pdfSha256': hashlib.sha256((root / (filename + '.pdf')).read_bytes()).hexdigest(),
            'inecRegistrationAreas': rows,
            'operationalWardCount': len(ops),
            'operationalWardNames': [r['ward'] for r in ops],
            'crosswalkVerified': False,
        })
out = Path('scripts/boundaries/research-nigeria-rac-2026-10-25.json')
out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print('Saved', sum(len(r['inecRegistrationAreas']) for r in result['lgas']),
      'official registration-area names for five split LGAs; no spatial equivalence inferred.')
