import { describe, expect, it } from 'vitest';
import { isOge278TFile, ogeReportId, parseOge278T } from './oge';

const TEXT = `Electronic Signature - I certify
/s/ Mullin, Markwayne [electronically signed on 06/24/2026 by Mullin, Markwayne in Integrity.gov]

                                                                                                                                                        Mullin, Markwayne - Page 1
Transactions
#      DESCRIPTION                            TYPE   DATE         NOTIFICATION    AMOUNT
                                                                  RECEIVED OVER
                                                                  30 DAYS AGO

1      ALAMOGORDO N MEX MUN SCH DIST NO 001   Sale   05/19/2026   Yes             $15,001 - $50,000
       GO BDS

2      Alphabet Inc CL A (GOOGL)              Sale   06/10/2026   Yes             $250,001 -
                                                                                  $500,000

3      Walmart, Inc. (WMT)                    Purchase   03/24/2025   No          $1,001 - $15,000

                                                                                                                                                        Mullin, Markwayne - Page 2
Transactions
#      DESCRIPTION                            TYPE   DATE         NOTIFICATION    AMOUNT
                                                                  RECEIVED OVER
                                                                  30 DAYS AGO

4      Boston Scientific Corp Com (BSX)       Sale (Partial)   05/18/2026   Yes   $50,001 -
                                                                                  $100,000
`;

describe('parseOge278T', () => {
  const r = parseOge278T(TEXT);
  it('reads each row, its wrapped description and its wrapped amount', () => {
    expect(r.trades).toHaveLength(4);
    expect(r.trades[0]).toMatchObject({ asset: 'ALAMOGORDO N MEX MUN SCH DIST NO 001 GO BDS', ticker: null, txType: 'sale', txDate: '2026-05-19', amountLow: 15001, amountHigh: 50000 });
    expect(r.trades[1]).toMatchObject({ asset: 'Alphabet Inc CL A (GOOGL)', ticker: 'GOOGL', amountLow: 250001, amountHigh: 500000 });
    expect(r.trades[2]).toMatchObject({ txType: 'purchase', ticker: 'WMT', amountHigh: 15000 });
    expect(r.trades[3]).toMatchObject({ txType: 'partial', txDate: '2026-05-18', amountLow: 50001, amountHigh: 100000 });
  });
  it('is complete when every transaction-looking line was read', () => expect(r.complete).toBe(true));
  it('skips account headers and blank lines, but refuses a report it could not fully read', () => {
    const ok = parseOge278T('1         Spouse Investment Account #1      No\n\n2         SPDR S&P 500 ETF Trust (SPY)      Purchase     06/03/2025     No     $15,001 - $50,000\n\n3         Line is left intentionally blank      No\n');
    expect(ok.trades).toHaveLength(1);
    expect(ok.complete).toBe(true);
    const scanned = parseOge278T('1     COMMONWEALTH PA FING AUTH      l ourchase     8/4/2026     Yos $1000001\n2     TARRANT CNTY TX HSG      ~ •rchase     8/312026     Yos $1 000 0\n');
    expect(scanned.complete).toBe(false);
    expect(scanned.unread).toBe(2);
  });
  it('reads rows whose number is indented', () => {
    const r2 = parseOge278T(' 1          Trump Media & Technology Group                       Sale        04/02/2025        No        $1,000,001 -\n                                                                                        $5,000,000\n');
    expect(r2.trades[0]).toMatchObject({ asset: 'Trump Media & Technology Group', amountLow: 1000001, amountHigh: 5000000 });
    expect(r2.complete).toBe(true);
  });
  it('reads a trade dated after the signature as a year typo', () => {
    const r3 = parseOge278T('/s/ X [electronically signed on 05/05/2025 by X in Integrity.gov]\n1     Foo Inc. (FOO)     Purchase     04/04/2225     No     $1,001 - $15,000\n');
    expect(r3.trades[0].txDate).toBe('2025-04-04');
  });
  it('files the report on the filer\'s signature date', () => expect(r.filedDate).toBe('2026-06-24'));
});

describe('the PAS index', () => {
  it('recognises 278-T files and reads the report id', () => {
    const u = 'https://extapps2.oge.gov/201/Presiden.nsf/PAS+Index/1D97817A20B559D085258CA2002C8C51/$FILE/Pete-Hegseth-04.11.2025-278T.pdf';
    expect(isOge278TFile(u)).toBe(true);
    expect(isOge278TFile('https://x/PAS+Index/AB/$FILE/Marco-Rubio-2026-278ANNU.pdf')).toBe(false);
    expect(ogeReportId(u)).toBe('1D97817A20B559D085258CA2002C8C51');
  });
});
