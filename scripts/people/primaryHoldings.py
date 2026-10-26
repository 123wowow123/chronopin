"""Refresh reviewed primary holdings sources; no runtime writes or deployment.

python3 scripts/people/primaryHoldings.py --refresh
npx tsx scripts/people/holdings.ts --file src/server/data/personHoldingsPrimary.json --apply
SEC responses are throttled and retained in ignored research files. Requires
requests and pdftotext; no third-party estimates are used as acquisition costs.
"""
import argparse
import datetime as dt
import hashlib
import io
import json
import os
import pathlib
import re
import subprocess
import time
import xml.etree.ElementTree as ET
import zipfile

import requests

TODAY = dt.datetime.now(dt.timezone.utc).date().isoformat()
ROOT = pathlib.Path(f'.scrape/holdings-primary-{TODAY}')
REGISTRY = pathlib.Path('scripts/people/data/primary-holdings-sources.json')
OUTPUT = pathlib.Path('src/server/data/personHoldingsPrimary.json')
AUDIT = []


def opened(url):
    if not url.startswith('https://'):
        raise ValueError('Evidence must use HTTPS')
    ROOT.mkdir(parents=True, exist_ok=True)
    for attempt in range(3):
        time.sleep(.15)
        r = requests.get(url, headers={'User-Agent': os.environ.get('SEC_USER_AGENT', 'Chronopin disclosure research https://www.chronopin.com/contact')}, timeout=60)
        if r.status_code not in [429, 500, 502, 503, 504]:
            break
        time.sleep(attempt + 1)
    r.raise_for_status()
    if not r.url.startswith('https://'):
        raise ValueError('Source redirected away from HTTPS')
    digest = hashlib.sha256(r.content).hexdigest()
    (ROOT / digest).write_bytes(r.content)
    AUDIT.append({'url': url, 'sha256': digest, 'checkedAt': TODAY, 'httpStatus': r.status_code})
    return r.content


def local(tag):
    return tag.rsplit('}', 1)[-1]


def xml(data):
    root = ET.fromstring(data)
    for node in root.iter():
        node.tag = local(node.tag)
    return root


def text(node, path):
    return (node.findtext(path) or '').strip()


def filing(cik, row):
    accession = row['accessionNumber'].replace('-', '')
    base = f'https://www.sec.gov/Archives/edgar/data/{cik}/{accession}/'
    index = json.loads(opened(base + 'index.json'))
    cover = xml(opened(base + row['primaryDocument'].split('/')[-1]))
    period = text(cover, './/reportCalendarOrQuarter')
    period = dt.datetime.strptime(period, '%m-%d-%Y').date().isoformat() if '/' not in period else dt.datetime.strptime(period, '%m/%d/%Y').date().isoformat()
    if period != row['reportDate'] or row['filingDate'] < '2023-01-03':
        raise ValueError('Unexpected 13F period or pre-dollar-unit filing')
    entries = []
    tables = []
    for item in index['directory']['item']:
        name = item['name']
        if not name.endswith('.xml') or name == row['primaryDocument'].split('/')[-1]:
            continue
        table = xml(opened(base + name))
        if table.tag == 'informationTable':
            entries.extend(table.findall('infoTable'))
            tables.append(base + name)
    if not tables or len(tables) != 1:
        raise ValueError('Information-table layout needs manual review')
    if len(entries) != int(text(cover, './/tableEntryTotal')):
        raise ValueError('13F entry count disagrees with the cover')
    if sum(int(text(e, 'value')) for e in entries) != int(text(cover, './/tableValueTotal')):
        raise ValueError('13F values disagree with the cover total; do not guess units')
    return {'row': row, 'entries': entries, 'tableUrl': tables[0], 'indexUrl': base + row['accessionNumber'] + '-index.html', 'amendment': text(cover, './/amendmentType')}


def manager_snapshot(manager):
    cik = manager['cik']
    submissions = json.loads(opened(f'https://data.sec.gov/submissions/CIK{cik:010d}.json'))
    if submissions['name'] != manager['secName']:
        raise ValueError(f'CIK identity changed: {manager["label"]}')
    a = submissions['filings']['recent']
    rows = [{k: a[k][i] for k in ['form', 'reportDate', 'filingDate', 'accessionNumber', 'primaryDocument']} for i, form in enumerate(a['form']) if form in ['13F-HR', '13F-HR/A'] and a['filingDate'][i] <= TODAY]
    if not rows:
        raise ValueError(f'No recent 13F found: {manager["label"]}')
    period = max(row['reportDate'] for row in rows)
    recent = [row for row in rows if row['reportDate'] == period]
    reports = [filing(cik, row) for row in recent]
    bases = [f for f in reports if f['row']['form'] == '13F-HR' or f['amendment'].upper() == 'RESTATEMENT']
    if not bases:
        raise ValueError('An additive amendment without its base cannot establish holdings')
    order = lambda f: (f['row']['filingDate'], f['row']['accessionNumber'])
    base = max(bases, key=order)
    selected = [base] + [f for f in reports if order(f) > order(base) and f['amendment'].upper() == 'NEW HOLDINGS']
    if any(order(f) > order(base) and f not in selected for f in reports):
        raise ValueError('Unrecognized 13F amendment; manual review required')
    securities = {}
    excluded = 0
    for report in selected:
        for row in report['entries']:
            cls = text(row, 'titleOfClass')
            if text(row, 'putCall') or text(row, 'shrsOrPrnAmt/sshPrnamtType') != 'SH' or re.search(r'WARRANT|\bWRT\b|\bNOTE|\bDEBT\b|CONVERT|\bOPTION', cls, re.I):
                excluded += 1
                continue
            cusip = text(row, 'cusip').upper()
            if not re.fullmatch('[A-Z0-9]{9}', cusip):
                raise ValueError('Invalid CUSIP; never invent a ticker')
            item = securities.setdefault(cusip, {'symbol': cusip, 'identifierType': 'cusip', 'name': text(row, 'nameOfIssuer') + ' — ' + cls, 'side': 'long', 'currency': 'USD', 'shares': 0, 'marketValue': 0, 'costBasis': None, 'valuationDate': period, 'valueSourceUrl': base['indexUrl'], 'costSourceUrl': None})
            item['shares'] += int(text(row, 'shrsOrPrnAmt/sshPrnamt'))
            item['marketValue'] += int(text(row, 'value'))
    all_securities = sorted(securities.values(), key=lambda h: (-h['marketValue'], h['symbol']))
    denominator = sum(h['marketValue'] for h in all_securities)
    for h in all_securities:
        h['weightPercent'] = round(100 * h['marketValue'] / denominator, 8) if denominator else None
    holdings = all_securities[:100]
    last = max(selected, key=order)
    opened(last['indexUrl'])
    # Each share-value source links to the filing(s) actually used, including
    # additions when the latest amendment does not restate the original.
    for h in holdings:
        h['valueSourceUrl'] = last['indexUrl'] if len(selected) == 1 else f'https://www.sec.gov/edgar/browse/?CIK={cik}&owner=exclude'
    note = f'{manager["associationNote"]} Form 13F shows reportable long securities at quarter-end and omits cash, short positions and many foreign/private assets. Showing {len(holdings)} of {len(all_securities)} reported share positions; full filings are linked. {excluded} option, principal-amount or warrant/debt rows are excluded. Option figures describe underlying exposure, not option premiums. Allocation is within the reported non-option share positions, not total fund assets. 13F does not disclose purchase costs or actual P&L. '
    if len(selected) > 1:
        note += 'An original/restated filing and subsequent NEW HOLDINGS amendment were combined. '
    return {'key': f'sec-13f-{cik}', 'name': manager['label'] + ' — SEC 13F', 'scope': 'fund', 'asOf': period, 'checkedAt': TODAY, 'filedDate': last['row']['filingDate'], 'sourceUrl': last['indexUrl'], 'sourceDataUrl': last['tableUrl'], 'coverageNote': note.strip(), 'complete': False, 'undisclosedCount': None, 'undisclosedWeightPercent': None, 'holdings': holdings, 'performance': None}, {'cik': cik, 'asOf': period, 'filingsUsed': [f['row']['accessionNumber'] for f in selected], 'reportedSharePositions': len(all_securities), 'displayedSharePositions': len(holdings), 'excludedRows': excluded}


def annual_berkshire(spec):
    content = opened(spec['url'])
    path = ROOT / 'berkshire-2025.pdf'
    path.write_bytes(content)
    raw = subprocess.check_output(['pdftotext', '-layout', str(path), '-'], text=True)
    holdings = []
    for p in spec['positions']:
        page = raw.split('\f')[p['pdfPage'] - 1]
        line = next((line for line in page.splitlines() if line.strip().startswith(p['name'])), '')
        if 'Cost Basis' not in page or '(Dollars in millions)' not in page or f'{p["costMillions"]:,}' not in line or f'{p["valueMillions"]:,}' not in line:
            raise ValueError('Annual-report transcription no longer matches the reviewed table')
        source = spec['url'] + f'#page={p["pdfPage"]}'
        holdings.append({'symbol': p['symbol'], 'name': p['name'], 'side': 'long', 'currency': 'USD', 'weightPercent': None, 'shares': None, 'costBasis': p['costMillions'] * 1000000, 'marketValue': p['valueMillions'] * 1000000, 'valuationDate': spec['asOf'], 'costSourceUrl': source, 'valueSourceUrl': source})
    return {'key': 'berkshire-annual-costs-2025', 'name': 'Berkshire Hathaway — disclosed cost basis (2025 year-end)', 'scope': 'fund', 'asOf': spec['asOf'], 'checkedAt': TODAY, 'sourceUrl': spec['url'] + '#page=19', 'sourceDataUrl': spec['url'], 'complete': False, 'undisclosedCount': None, 'undisclosedWeightPercent': None, 'coverageNote': 'Historical company holdings from the 2025 annual report, printed pages 15–16 (PDF pages 19–20). These are Berkshire’s investments, not Warren Buffett’s personal portfolio. The nine selected holdings have both cost and market value, in USD millions as published, permitting dated unrealized P&L. Figures are rounded by the company. No updated market price or additional FX conversion is applied. P&L excludes dividends, realized gains and financing/hedging results. The percentage of each company owned in the report is not portfolio allocation and is not entered as a weight. Other holdings are not listed in these two cost-basis tables. The gains are cumulative against the reported historical cost, not the return during 2025.', 'holdings': holdings, 'performance': None}


def parse_house_stocks(raw, review_gaps=None):
    """Read Schedule A [ST] assets; retain owners and filed valuation ranges.

    Deliberately exclude options, bank accounts, private assets and None/zero
    values. Header-defined columns keep income amounts out of asset values.
    """
    if 'Annual Report' not in raw or not re.search(r'Filing Year:\s+20\d\d', raw):
        raise ValueError('Not a readable House annual report')
    schedule = re.split(r'(?m)^\s*(?:SCHEDULE|S)\s+B\s*:', raw, maxsplit=1)[0]
    entries = []
    rejected = []
    pending = None
    for page in schedule.split('\f'):
        header = next((line for line in page.splitlines() if 'Owner' in line and 'Value of Asset' in line and 'Income' in line), None)
        if not header:
            continue
        owner_at, value_at, income_at = header.index('Owner') - 3, header.index('Value of Asset') - 2, header.index('Income') - 2
        for block in re.split(r'\n\s*\n', page):
            lines = []
            for line in block.splitlines():
                if re.match(r'\s*[DL]\s*:', line):
                    break
                if line != header:
                    lines.append(line)
            asset = ' '.join(line[:owner_at].strip() for line in lines if not re.match(r'\s*[DL]\s*:', line))
            values = ' '.join(line[value_at:income_at].strip() for line in lines).strip()
            owner_text = ' '.join(line[owner_at:value_at].strip() for line in lines)
            if '[ST]' not in asset:
                # House PDFs can put an account/amount at a page end and
                # finish the issuer name on the next page after its header.
                if asset.strip() and not re.search(r'\[[A-Z]{2}\]', asset) and '⇒' in asset and ('$' in values or values.startswith('None')):
                    pending = (asset, owner_text, values)
                elif re.search(r'\[[A-Z]{2}\]', asset):
                    pending = None
                continue
            if not values and pending:
                asset = pending[0] + ' ' + asset
                owner_text = pending[1] + ' ' + owner_text
                values = pending[2]
            pending = None
            symbol = re.search(r'\(([A-Z][A-Z0-9.\-/]{0,19})\)\s*\[ST\]', asset)
            if not symbol:
                rejected.append(asset[:120]); continue
            owner_code = re.search(r'\b(SP|JT|DC)\b', owner_text)
            owner = {'SP': 'spouse', 'JT': 'joint', 'DC': 'dependent'}.get(owner_code[1] if owner_code else '', 'self')
            if re.match(r'^(None|Undetermined)\b', values, re.I):
                continue
            nums = re.findall(r'\$?([\d,]+(?:\.\d{1,2})?)', values)
            amount = [float(n.replace(',', '')) for n in nums]
            if not amount or len(amount) > 2:
                rejected.append(asset[:120] + ': ' + values[:80]); continue
            if amount[0] <= 0:
                continue
            if len(amount) == 2 and '-' in values:
                value = {'marketValue': None, 'marketValueLow': amount[0], 'marketValueHigh': amount[1]}
            elif len(amount) == 1 and re.search(r'over|more than', values, re.I):
                value = {'marketValue': None, 'marketValueLow': amount[0], 'marketValueHigh': None}
            elif len(amount) == 1 and '-' not in values:
                value = {'marketValue': amount[0]}
            else:
                rejected.append(asset[:120] + ': ' + values[:80]); continue
            entries.append({'symbol': symbol[1], 'name': asset.split('[')[0].rsplit('⇒', 1)[-1].strip(), 'owner': owner, **value})
    if rejected and review_gaps is None:
        raise ValueError('Annual stock rows require manual review: ' + json.dumps(rejected[:4]))
    if review_gaps is not None:
        review_gaps.extend(rejected)
    # One issuer held in multiple accounts by the same reported owner becomes
    # one row; sum only like-for-like reported bounds, never range midpoints.
    groups = {}
    for entry in entries:
        key = entry['symbol'], entry['owner']
        group = groups.setdefault(key, {'rows': [], 'name': entry['name']})
        group['rows'].append(entry)
    result = []
    for (symbol, owner), group in groups.items():
        rows = group['rows']
        item = {'symbol': symbol, 'owner': owner, 'name': group['name']}
        if all(r['marketValue'] is not None for r in rows):
            item['marketValue'] = round(sum(r['marketValue'] for r in rows), 2)
        else:
            item['marketValue'] = None
            item['marketValueLow'] = round(sum(r.get('marketValueLow', r['marketValue']) for r in rows), 2)
            item['marketValueHigh'] = None if any(r.get('marketValueHigh', r['marketValue']) is None for r in rows) else round(sum(r.get('marketValueHigh', r['marketValue']) for r in rows), 2)
        result.append(item)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--refresh', action='store_true')
    args = parser.parse_args()
    config = json.loads(REGISTRY.read_text())
    if not args.refresh:
        print(f'Reviewed source plan: {len(config["managers"])} SEC managers, {len(config["houseMembers"])} House members, Berkshire annual-report costs. Use --refresh to fetch and rebuild the research catalog.')
        return
    profiles = {}
    manager_audit = []
    gaps = []
    for manager in config['managers']:
        snapshot, audit = manager_snapshot(manager)
        manager_audit.append(audit)
        for name in manager['people']:
            profiles.setdefault(name, []).append(snapshot)
        print(f'{manager["label"]}: {len(snapshot["holdings"])} share positions; {snapshot["asOf"]}', flush=True)
    profiles['Warren Buffett'].append(annual_berkshire(config['berkshireAnnual']))
    # Report indexes are named for the reporting year, not the filing year.
    indexes = []
    for year in [dt.date.fromisoformat(TODAY).year - 1, dt.date.fromisoformat(TODAY).year - 2]:
        source = f'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/{year}FD.zip'
        archive = zipfile.ZipFile(io.BytesIO(opened(source)))
        members = ET.fromstring(archive.read(f'{year}FD.xml'))
        indexes.extend({c.tag: (c.text or '').strip() for c in m} for m in members.findall('Member'))
    for member in config['houseMembers']:
        records = [r for r in indexes if r.get('First') == member['first'] and r.get('Last') == member['last'] and r.get('StateDst') == member['district'] and r.get('FilingType') == 'O' and dt.datetime.strptime(r['FilingDate'], '%m/%d/%Y').date().isoformat() <= TODAY]
        if not records:
            gaps.append({'name': member['name'], 'reason': 'No matching annual report in the two reviewed reporting-year indexes; no identity substitution.'}); continue
        record = max(records, key=lambda r: (r['Year'], dt.datetime.strptime(r['FilingDate'], '%m/%d/%Y')))
        url = f'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/{record["Year"]}/{record["DocID"]}.pdf'
        file = ROOT / f'house-{record["DocID"]}.pdf'
        file.write_bytes(opened(url))
        raw = subprocess.check_output(['pdftotext', '-layout', str(file), '-'], text=True)
        (ROOT / f'house-{record["DocID"]}.txt').write_text(raw)
        try:
            printed_name = re.search(r'Name:\s+([^\n]+)', raw)
            if not raw.strip():
                pages = len(raw.split('\f')) - 1
                raise ValueError(f'Scanned/image-only {pages}-page annual report; OCR and manual table verification are required. No stock positions inferred from its transactions.')
            if not printed_name or member['last'] not in printed_name[1] or member['first'] not in printed_name[1] or not re.search(r'Filing Year:\s+' + record['Year'], raw):
                raise ValueError('Printed filing identity/year does not match index')
            row_gaps = []
            holdings = parse_house_stocks(raw, row_gaps)
        except ValueError as error:
            gaps.append({'name': member['name'], 'sourceUrl': url, 'reason': str(error)}); continue
        if not holdings:
            gaps.append({'name': member['name'], 'sourceUrl': url, 'reason': 'No readable positive-value [ST] stock assets; other asset types are not inferred to be stocks.'}); continue
        as_of = record['Year'] + '-12-31'
        for h in holdings:
            h.update({'currency': 'USD', 'side': 'long', 'shares': None, 'weightPercent': None, 'costBasis': None, 'costSourceUrl': None, 'valueSourceUrl': url, 'valuationDate': as_of})
        snapshot = {'key': 'house-annual-stocks', 'name': f'{member["name"]} — House annual stock disclosure ({record["Year"]})', 'scope': 'personal', 'asOf': as_of, 'checkedAt': TODAY, 'filedDate': dt.datetime.strptime(record['FilingDate'], '%m/%d/%Y').date().isoformat(), 'sourceUrl': url, 'sourceDataUrl': url, 'coverageNote': 'Historical year-end Schedule A stock assets marked [ST] with positive reported values. Self, spouse, joint and dependent ownership are kept distinct as filed; reportable trust/family interests do not necessarily establish sole direct ownership. Symbols are reproduced as filed and may be historical. Options, bank accounts, funds not labelled stocks, private assets and None/zero year-end values are excluded. Multiple accounts for the same issuer and owner are combined by adding their reported values or range endpoints. Ranges are preserved, with no midpoint estimate. The report does not establish current remaining shares, purchase costs or stock P&L; later transactions are shown separately and are not assumed to reconstruct the entire portfolio.', 'complete': False, 'undisclosedCount': None, 'undisclosedWeightPercent': None, 'holdings': holdings, 'performance': None}
        profiles.setdefault(member['name'], []).append(snapshot)
        if row_gaps:
            snapshot['coverageNote'] += f' {len(row_gaps)} stock rows could not be read confidently and are excluded pending manual review; this is not a complete reconstruction.'
            gaps.append({'name': member['name'], 'sourceUrl': url, 'reason': 'Some stock rows need manual review; verified rows retained.', 'rows': row_gaps})
        print(f'{member["name"]}: {len(holdings)} stock/owner rows; {as_of}', flush=True)
    catalog = {'checkedAt': TODAY, 'scope': 'Primary SEC manager disclosures, official House annual stock disclosures and published company cost tables. These dated sources take display priority over tracked strategies; fund holdings are not personal holdings.', 'sourceAudit': AUDIT, 'managerAudit': manager_audit, 'gaps': gaps, 'profiles': [{'name': name, 'portfolios': portfolios} for name, portfolios in profiles.items()]}
    # Build off to the side; a failed source never truncates the prior catalog.
    candidate = ROOT / 'primary-candidate.json'
    candidate.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')
    validator = ROOT / 'validate-primary.ts'
    validator.write_text("import {readFileSync} from 'node:fs';\nimport {readHoldings} from '../../src/server/holdingsInput';\nconst data=JSON.parse(readFileSync(process.argv[2],'utf8'));for(const p of data.profiles)readHoldings(p);\n")
    subprocess.run(['npx', 'tsx', str(validator), str(candidate)], check=True)
    OUTPUT.write_text(candidate.read_text())
    print(f'Saved {len(profiles)} primary-source people. Research gaps: {len(gaps)}')
    for gap in gaps:
        print(gap['name'] + ': ' + gap['reason'])


if __name__ == '__main__':
    main()
