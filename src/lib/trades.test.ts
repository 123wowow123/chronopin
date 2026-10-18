import { describe, expect, it } from 'vitest';
import { fixYearTypo, formatAmountRange, parseAmount, parsePtrText, summarizeTrades, type TradeRow } from './trades';

const PTR = `
ID        Owner Asset                                          Transaction Date              Notification Amount                  Cap.
                                                               Type                          Date                                 Gains >

SP        Amazon.com, Inc. - Common Stock         S (partial)      03/16/2026 03/16/2026          $1,001 - $15,000
          (AMZN) [ST]
          F      S      : New
          D           : The full transaction included sales

          NVIDIA Corporation - Common Stock (NVDA)    P                03/02/2026 03/03/2026          $15,001 -
          [ST]                                                                                      $50,000
          F      S      : New
`;

describe('parsePtrText', () => {
  it('reads owner, ticker, type, dates and amount range of each row', () => {
    const rows = parsePtrText(PTR);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ owner: 'spouse', ticker: 'AMZN', assetType: 'ST', txType: 'partial', txDate: '2026-03-16', amountLow: 1001, amountHigh: 15000 });
    expect(rows[1]).toMatchObject({ owner: 'self', ticker: 'NVDA', txType: 'purchase', txDate: '2026-03-02', notifiedDate: '2026-03-03' });
  });
});

describe('amounts', () => {
  it('parses ranges and open-ended amounts', () => {
    expect(parseAmount('$1,001 - $15,000')).toEqual({ low: 1001, high: 15000 });
    expect(parseAmount('Over $50,000,000')).toEqual({ low: 50000000, high: null });
    expect(formatAmountRange(1001, 15000)).toBe('$1,001 – $15,000');
  });
});

describe('summarizeTrades', () => {
  it('counts sides and sums the range ends without inventing a midpoint', () => {
    const t = (o: Partial<TradeRow>) => ({ id: 1, chamber: 'house', filingId: 'x', owner: 'self', asset: 'a', ticker: 'AAA', assetType: 'ST', txType: 'purchase', txDate: '2026-01-02', notifiedDate: null, filedDate: null, amountLow: 1001, amountHigh: 15000, sourceUrl: 'https://x.test', ...o }) as TradeRow;
    const s = summarizeTrades([t({}), t({ txType: 'sale', ticker: 'BBB', amountLow: 15001, amountHigh: 50000 }), t({ txDate: '2026-02-01' })]);
    expect(s).toMatchObject({ count: 3, purchases: 2, sales: 1, volumeLow: 17003, volumeHigh: 80000, first: '2026-01-02', last: '2026-02-01' });
    expect(s.tickers[0]).toEqual({ ticker: 'AAA', count: 2 });
  });
});

describe('page breaks', () => {
  it('does not run the next page header into the asset name', () => {
    const text = `SP        Tesla, Inc. - Common Stock          P      01/05/2026 01/06/2026    $1,001 - $15,000
          (TSLA) [ST]
ID        Owner Asset                                          Transaction Date              Notification Amount                  Cap.
                                                               Type                          Date                                 Gains >`;
    expect(parsePtrText(text)[0].asset).toBe('Tesla, Inc. - Common Stock (TSLA)');
  });
});

describe('rows whose asset name ends one space before the type', () => {
  it('reads the row and the amount that wraps beside the [OL] tag', () => {
    const text = [
      '                       America First Natural Resources LLC P                        04/23/2024 04/23/2024             $50,001 -',
      '                       [OL]                                                                                           $100,000',
      '                       F      S         : New',
    ].join('\n');
    const [t] = parsePtrText(text);
    expect(t).toMatchObject({ asset: 'America First Natural Resources LLC', assetType: 'OL', txType: 'purchase', amountLow: 50001, amountHigh: 100000 });
  });
});

describe('year typos', () => {
  it('reads a transaction dated after its notification as the previous year', () => {
    expect(fixYearTypo('2026-12-26', '2026-01-21')).toBe('2025-12-26');
    expect(fixYearTypo('2026-01-05', '2026-01-21')).toBe('2026-01-05');
    expect(fixYearTypo('2026-12-26', '2024-01-01')).toBe('2026-12-26');
  });
});

describe('a range split by a page break', () => {
  it('takes the upper bound from under the repeated column header', () => {
    const text = [
      '           International Business Machines        P                  06/16/2026 07/02/2026   $15,001 -',
      '\fID   Owner Asset                                  Transaction Date              Notification Amount             Cap.',
      '                                                  Type                          Date                            Gains >',
      '                                                                                                                $200?',
      '           Corporation Common Stock (IBM)                                                    $50,000',
      '           [ST]',
      '           F       S    : New',
    ].join('\n');
    const [t] = parsePtrText(text);
    expect(t).toMatchObject({ asset: 'International Business Machines Corporation Common Stock (IBM)', ticker: 'IBM', amountLow: 15001, amountHigh: 50000 });
  });
});
