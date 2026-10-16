// The Senate's eFD site (efdsearch.senate.gov): periodic transaction reports
// as HTML tables. The site wants the "I agree" step first; it is a form post
// that sets a session cookie, which curl's jar keeps.

import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseAmount, type ParsedTrade, type TradeOwner, type TradeType } from '@/lib/trades';

const UA = 'Mozilla/5.0 (compatible; chronopin-trades/1.0)';
const HOME = 'https://efdsearch.senate.gov/search/home/';

export type SenateFiling = { first: string; last: string; state: string | null; filingId: string; filedDate: string; sourceUrl: string; trades: ParsedTrade[] };

const OWNERS: Record<string, TradeOwner> = { self: 'self', spouse: 'spouse', joint: 'joint', child: 'dependent' };
const ASSET_CODES: [RegExp, string][] = [
  [/option/i, 'OP'],
  [/^stock/i, 'ST'],
  [/corporate bond/i, 'CS'],
  [/government|treasury/i, 'GS'],
  [/municipal/i, 'GS'],
];

const text = (html: string) =>
  html
    .replace(/<div[\s\S]*?<\/div>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const iso = (us: string) => {
  const [m, d, y] = us.trim().split('/');
  return `${y}-${m}-${d}`;
};

export function parseSenateReport(html: string): ParsedTrade[] {
  const body = html.slice(html.indexOf('<tbody'));
  const out: ParsedTrade[] = [];
  for (const row of body.split('<tr').slice(1)) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1]);
    if (cells.length < 8) continue;
    const date = text(cells[1]);
    if (!/^\d\d\/\d\d\/\d{4}$/.test(date)) continue;
    const kind = text(cells[6]).toLowerCase();
    const txType: TradeType | null = kind.startsWith('purchase') ? 'purchase' : kind.includes('partial') ? 'partial' : kind.startsWith('sale') ? 'sale' : kind.startsWith('exchange') ? 'exchange' : null;
    if (!txType) continue;
    const asset = text(cells[4]);
    const tickerText = text(cells[3]);
    const { low, high } = parseAmount(text(cells[7]));
    const typeName = text(cells[5]);
    out.push({
      owner: OWNERS[text(cells[2]).toLowerCase()] ?? 'self',
      asset: asset.slice(0, 300),
      ticker: /^[A-Z][A-Z0-9.\-]{0,15}$/.test(tickerText) ? tickerText : null,
      assetType: ASSET_CODES.find(([re]) => re.test(typeName))?.[1] ?? 'OT',
      txType,
      txDate: iso(date),
      notifiedDate: null,
      amountLow: low,
      amountHigh: high,
    });
  }
  return out;
}

export async function fetchSenateFilings(days: number, { skip }: { skip?: (filingId: string) => Promise<boolean> } = {}): Promise<SenateFiling[]> {
  const jar = path.join(mkdtempSync(path.join(tmpdir(), 'efd-')), 'jar.txt');
  const curl = (args: string[]) => execFileSync('curl', ['-s', '-b', jar, '-c', jar, '-A', UA, ...args], { maxBuffer: 1 << 27 }).toString('utf8');
  const tokenOf = (html: string) => /csrfmiddlewaretoken" value="([^"]+)/.exec(html)?.[1] ?? '';
  curl([HOME, '-o', '/dev/null']);
  const home = curl([HOME]);
  curl(['-e', HOME, '-d', `prohibition_agreement=1&csrfmiddlewaretoken=${tokenOf(home)}`, HOME, '-o', '/dev/null']);
  const csrf = /csrftoken\s+(\S+)/.exec(execFileSync('grep', ['csrftoken', jar]).toString())?.[1] ?? '';
  const since = new Date(Date.now() - days * 864e5);
  const start = `${String(since.getMonth() + 1).padStart(2, '0')}/${String(since.getDate()).padStart(2, '0')}/${since.getFullYear()} 00:00:00`;
  const rows: string[][] = [];
  for (let offset = 0; ; offset += 100) {
    const body = new URLSearchParams({
      start: String(offset), length: '100', report_types: '[11]', filer_types: '[]', submitted_start_date: start, submitted_end_date: '',
      candidate_state: '', senator_state: '', office_id: '', first_name: '', last_name: '', csrfmiddlewaretoken: csrf,
    }).toString();
    const res = JSON.parse(curl(['-e', 'https://efdsearch.senate.gov/search/', '-H', `X-CSRFToken: ${csrf}`, '-d', body, 'https://efdsearch.senate.gov/search/report/data/']));
    rows.push(...res.data);
    if (offset + 100 >= res.recordsFiltered) break;
  }
  process.stderr.write(`senate: ${rows.length} periodic transaction reports since ${start.slice(0, 10)}\n`);
  const out: SenateFiling[] = [];
  for (const [first, last, , link, filed] of rows) {
    const href = /href="([^"]+)"/.exec(link)?.[1];
    // Paper filings are scanned images ("/view/paper/"): nothing to read.
    if (!href?.includes('/view/ptr/')) continue;
    const filingId = href.split('/').filter(Boolean).pop()!;
    if (skip && (await skip(filingId))) continue;
    const html = curl([`https://efdsearch.senate.gov${href}`]);
    out.push({
      first: first.replace(/\s+[A-Z]\.?$/, ''),
      last: last.replace(/,?\s+(Jr|Sr|II|III|IV)\.?$/i, ''),
      state: null,
      filingId,
      filedDate: iso(filed),
      sourceUrl: `https://efdsearch.senate.gov${href}`,
      trades: parseSenateReport(html),
    });
  }
  return out;
}
