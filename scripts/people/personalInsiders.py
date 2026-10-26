"""Refresh personal Form 4 coverage; no API writes or deployment.
python3 scripts/people/personalInsiders.py --refresh
"""
import argparse, datetime as dt, hashlib, json, pathlib, re, subprocess, time, xml.etree.ElementTree as ET
import requests

TODAY=dt.datetime.now(dt.timezone.utc).date().isoformat()
ROOT=pathlib.Path(f'.scrape/personal-trading-others-{TODAY}')
HEADERS={'User-Agent':'Chronopin research https://www.chronopin.com/contact'}
CODES={'P':'Purchase','S':'Sale','A':'Award or grant','M':'Option exercise','F':'Shares withheld for exercise price or tax obligations','G':'Gift','C':'Conversion','J':'Other disclosed transaction','D':'Disposition to issuer'}
AUDIT=[]

def opened(url):
 time.sleep(.15)
 r=requests.get(url,headers=HEADERS,timeout=60);r.raise_for_status()
 digest=hashlib.sha256(r.content).hexdigest();ROOT.mkdir(parents=True,exist_ok=True);(ROOT/digest).write_bytes(r.content)
 AUDIT.append({'url':url,'checkedAt':TODAY,'status':r.status_code,'sha256':digest});return r.content

def num(value):
 if value is None:return None
 n=float(value)
 if not 0<=n<1e15:raise ValueError('Invalid nonnegative quantity/price')
 return n

def eligible(row,root,person):
 ownership=row.findtext('ownershipNature/directOrIndirectOwnership/value')
 # Multi-owner documents can describe other persons' direct holdings. Accept
 # direct records only when this individual is the sole reporting owner.
 owners=root.findall('reportingOwner')
 if ownership=='D':return len(owners)==1 and int(owners[0].findtext('reportingOwnerId/rptOwnerCik'))==person['cik']
 if person['policy']!='direct-or-sole-sts':return False
 # Reviewed Thiel exception: sole beneficial ownership through STS, not a fund.
 ids=[n.attrib['id'] for n in row.findall('.//footnoteId')]
 notes=' '.join(''.join(f.itertext()) for f in root.findall('footnotes/footnote') if f.attrib.get('id') in ids)
 return 'STS Holdings II LLC' in notes and 'sole beneficial owner' in notes

def build(person):
 url=f'https://data.sec.gov/submissions/CIK{person["cik"]:010d}.json';data=json.loads(opened(url))
 if data['name']!=person['secName']:raise ValueError('SEC owner identity mismatch')
 recent=data['filings']['recent'];indices=[i for i,f in enumerate(recent['form'])if f in ['4','4/A'] and '2025-01-01'<=recent['filingDate'][i]<=TODAY][:12]
 if any(recent['form'][i]=='4/A' for i in indices):raise ValueError('Amended owner filing needs explicit reconciliation')
 entries=[];latest={};excluded=0
 for i in indices:
  acc=recent['accessionNumber'][i];doc=recent['primaryDocument'][i].split('/')[-1]
  source=f'https://www.sec.gov/Archives/edgar/data/{person["cik"]}/{acc.replace("-","")}/{doc}'
  root=ET.fromstring(opened(source))
  if person['cik'] not in [int(o.findtext('reportingOwnerId/rptOwnerCik'))for o in root.findall('reportingOwner')]:raise ValueError('Owner absent from filing')
  issuer=root.findtext('issuer/issuerName');symbol=root.findtext('issuer/issuerTradingSymbol');issuer_cik=root.findtext('issuer/issuerCik')
  for order,row in enumerate(root.findall('nonDerivativeTable/nonDerivativeTransaction')):
   if not eligible(row,root,person):excluded+=1;continue
   security=row.findtext('securityTitle/value');code=row.findtext('transactionCoding/transactionCode');date=row.findtext('transactionDate/value')
   if not date or date>TODAY:raise ValueError('Invalid transaction date')
   shares=num(row.findtext('transactionAmounts/transactionShares/value'));price=num(row.findtext('transactionAmounts/transactionPricePerShare/value'));after=num(row.findtext('postTransactionAmounts/sharesOwnedFollowingTransaction/value'))
   if not re.fullmatch(r'[A-Z][A-Z0-9.\-]{0,19}',symbol or ''):continue
   ticker=symbol
   if issuer_cik and int(issuer_cik)==1067983:
    if 'Class B' in security:ticker='BRK.B'
    elif 'Class A' in security:ticker='BRK.A'
    else:continue
   refs={n.attrib['id']for n in row.findall('.//footnoteId')}
   notes=' '.join(''.join(f.itertext())for f in root.findall('footnotes/footnote')if f.attrib.get('id')in refs)
   held='Direct ownership as reported.' if row.findtext('ownershipNature/directOrIndirectOwnership/value')=='D' else 'Held through STS Holdings II LLC; the filing identifies Thiel as its sole beneficial owner.'
   summary=f'{issuer}: {CODES.get(code,"Disclosed transaction")} (SEC code {code}), {shares:,.0f} {security} shares.'
   if price is not None:summary+=f' Reported price: ${price:,.4f} per share; read filing footnotes for weighted-average pricing and conditions.'
   summary+=' '+held+' '
   if code=='F':summary+='This is a share-withholding event, not an open-market sale. '
   if code=='G':summary+='A gift is not a sale or a realized investment gain. '
   if code=='M':summary+='The reported exercise price is not a market sale price or proof of realized profit. '
   if code=='A':summary+='The award may be restricted, unvested or conditional; reported shares are not automatically freely tradable. '
   summary+='Acquisition lot costs and realized P&L are not established by this filing.'
   entries.append({'publishedDate':recent['filingDate'][i],'tradeDate':date,'title':f'{ticker} — {CODES.get(code,code)}','summary':summary,'sourceUrl':source,'transactionCode':code,'shares':shares,'reportedPrice':price,'ownership':'direct' if held.startswith('Direct')else'sole-beneficial-entity'})
   key=(issuer_cik,security)
   ranking=(recent['filingDate'][i],date,order)
   if after is not None and (key not in latest or ranking>latest[key][0]):latest[key]=(ranking,{'symbol':ticker,'name':issuer+' — '+security,'shares':after,'weightPercent':None,'side':'long','currency':'USD','costBasis':None,'marketValue':None,'valuationDate':None,'costSourceUrl':None,'valueSourceUrl':None},date,source,held,notes)
 entries.sort(key=lambda e:(e['publishedDate'],e['tradeDate']),reverse=True)
 entries=entries[:24]
 snapshots=[]
 for (issuer_cik,security),(rank,holding,date,source,held,notes) in latest.items():
  # These are historical reported balances, not a complete current portfolio.
  if holding['shares']==0:continue
  note=f'Latest eligible personal non-derivative balance found in the 12 recent Forms 4 reviewed, dated to the reported transaction. {held} This is one security disclosure, not a complete current portfolio. Subsequent undisclosed changes are possible. Conditional or restricted shares may be included; see the filing footnotes. No market valuation, position cost basis or unrealized P&L is inferred. '
  if 'restricted' in notes.lower() or 'vesting' in notes.lower():note+='The filing discusses restricted shares and vesting conditions. '
  snapshots.append({'key':f'personal-form4-{person["cik"]}-{issuer_cik}-{holding["symbol"]}','name':f'{person["name"]} — {holding["symbol"]} reported personal ownership','scope':'personal','asOf':date,'checkedAt':TODAY,'filedDate':rank[0],'sourceUrl':source,'sourceDataUrl':source,'coverageNote':note.strip(),'complete':False,'undisclosedCount':None,'undisclosedWeightPercent':None,'holdings':[holding],'performance':None})
 return {'name':person['name'],'sourceUrl':url,'coverageNote':f'Partial SEC Form 4 coverage: up to 12 recent filings since January 2025 reviewed, displaying up to 24 eligible non-derivative transaction rows. Individual reporting identity and ownership were checked. Fund-held, ambiguous joint-owner and derivative rows are excluded; {excluded} non-derivative rows were excluded by ownership. Direct and specifically verified sole-beneficial entity ownership are distinguished. Awards, gifts, conversions, exercises and withholding events are not treated as open-market investment profits. Share balances are historical and may include restrictions; this is not a complete current portfolio or tax-lot ledger.','entries':entries},snapshots,{'name':person['name'],'filingsReviewed':len(indices),'eligibleDisplayedRows':len(entries),'excludedOwnershipRows':excluded}

def main():
 p=argparse.ArgumentParser();p.add_argument('--refresh',action='store_true');a=p.parse_args()
 config=json.load(open('scripts/people/data/personal-insider-sources.json'))
 if not a.refresh:print('Reviewed owner identities:',', '.join(p['name']for p in config['people']));return
 journal=json.load(open('src/server/data/personTradingDisclosures.json'));allpeople={p['name']:p for p in journal['profiles']};holdings=[];coverage=[]
 for person in config['people']:
  profile,snapshots,audit=build(person);coverage.append(audit)
  if profile['entries']:allpeople[person['name']]=profile
  if snapshots:holdings.append({'name':person['name'],'portfolios':snapshots})
  print(person['name'],len(profile['entries']),'disclosures',len(snapshots),'personal ownership snapshots',flush=True)
 journal['profiles']=list(allpeople.values());journal['sourceAudit']=[a for a in journal.get('sourceAudit',[])if 'substack' in a['url']]+AUDIT;journal['insiderCoverage']=coverage
 candidate=ROOT/'holdings-candidate.json';candidate.write_text(json.dumps({'checkedAt':TODAY,'profiles':holdings,'sourceAudit':AUDIT,'coverage':coverage},ensure_ascii=False,indent=2)+'\n')
 validator=ROOT/'validate.ts';validator.write_text("import {readFileSync} from 'node:fs';import {readHoldings} from '../../src/server/holdingsInput';for(const p of JSON.parse(readFileSync(process.argv[2],'utf8')).profiles)readHoldings(p);\n")
 subprocess.run(['npx','tsx',str(validator),str(candidate)],check=True)
 pathlib.Path('src/server/data/personTradingDisclosures.json').write_text(json.dumps(journal,ensure_ascii=False,indent=2)+'\n')
 pathlib.Path('src/server/data/personHoldingsInsiders.json').write_text(candidate.read_text())
if __name__=='__main__':main()
