// Executive-branch periodic transaction reports (OGE Form 278-T) - the stock
// trades the president, vice president, cabinet and other appointees disclose.
// Reads the text pdftotext -layout gives for one report. Pure, so the importer
// and the tests share it. A 278-T does not say whose account a trade was in
// (the filer's, spouse's or a dependent's), nor an asset type code.

import { parseAmount, type ParsedTrade, type TradeType } from './trades';

const TYPES: Record<string, TradeType> = { purchase: 'purchase', sale: 'sale', 'sale (partial)': 'partial', exchange: 'exchange' };

const ROW = /^\s*(\d+)\s{2,}(.*?)\s{2,}(Purchase|Sale \(Partial\)|Sale|Exchange)\s+(\d\d\/\d\d\/\d{4})\s+(?:Yes|No)\s+(\$[\d,]+(?:\s*-\s*(?:\$[\d,]+)?)?|Over\s+\$[\d,]+)\s*$/i;
// The table header, the page footer ("Hegseth, Pete - Page 2") and the form's own lines.
const SKIP = /^\s*(#\s+DESCRIPTION|RECEIVED OVER|30 DAYS AGO|.*- Page \d+\s*$|Transactions\s*$|\f)/;

const isoDate = (us: string) => {
  const [m, d, y] = us.split('/');
  return `${y}-${m}-${d}`;
};

// `complete` is false when a numbered line that looks like a transaction (it has a
// type word or a dollar amount) was not read - a scanned report whose text is OCR
// noise, or a layout this does not know. Such a report is not stored: a half-read
// disclosure would understate what was traded.
export type OgeReport = { filedDate: string | null; trades: ParsedTrade[]; complete: boolean; unread: number };

export function parseOge278T(text: string): OgeReport {
  const lines = text.split(/\r?\n/);
  // The filer's own e-signature date is when the report was filed.
  const signed = /electronically signed on (\d\d\/\d\d\/\d{4})/.exec(text);
  const trades: ParsedTrade[] = [];
  let current: ParsedTrade | null = null;
  let open = false; // the row's amount ended in "-": its upper bound is on a later line
  let describing = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = ROW.exec(line.replace(/^\f/, ''));
    if (m) {
      const { low, high } = parseAmount(m[5]);
      const asset = m[2].trim();
      current = {
        owner: 'self',
        asset,
        ticker: null,
        assetType: null,
        txType: TYPES[m[3].toLowerCase()],
        txDate: isoDate(m[4]),
        notifiedDate: null,
        amountLow: low,
        amountHigh: high,
      };
      trades.push(current);
      open = /-\s*$/.test(m[5]) && high == null;
      describing = true;
      continue;
    }
    if (!current) continue;
    if (SKIP.test(line)) continue;
    if (/^\s*$/.test(line)) {
      describing = false;
      continue;
    }
    if (open) {
      const rest = /(\$[\d,]+)\s*$/.exec(line);
      if (rest) {
        current.amountHigh = Number(rest[1].replace(/[$,]/g, ''));
        open = false;
        continue;
      }
    }
    // A description that wraps ("GO BDS") sits right under its row.
    if (describing && /^\s{4,}\S/.test(line) && !/^\s*\d+\s{2,}\S/.test(line)) current.asset = `${current.asset} ${line.trim()}`;
  }
  // A trade cannot be dated after the day the filer signed the report, so such a date
  // is a typo on the form (RFK Jr.'s 04/04/2225): read it as the filing year, or the
  // year before, when that fits; otherwise keep it as filed.
  const filed = signed ? isoDate(signed[1]) : null;
  if (filed) {
    for (const t of trades) {
      if (t.txDate <= filed) continue;
      const fixed = [Number(filed.slice(0, 4)), Number(filed.slice(0, 4)) - 1].map((y) => `${y}${t.txDate.slice(4)}`).find((d) => d <= filed);
      if (fixed) t.txDate = fixed;
    }
  }
  for (const t of trades) {
    const ticker = /\(([A-Z][A-Z0-9.\-]{0,9})\)\s*$/.exec(t.asset);
    t.ticker = ticker ? ticker[1] : null;
    t.asset = t.asset.replace(/\s+/g, ' ').replace(/\s*See Endnote$/i, '').trim();
  }
  const looksLikeTrade = lines.filter((l) => /^[\f ]*\d+\s{2,}\S/.test(l) && (/\$\s?\d/.test(l) || /\b(Purchase|Sale|Exchange)\b/i.test(l))).length;
  return { filedDate: signed ? isoDate(signed[1]) : null, trades, complete: trades.length > 0 && trades.length === looksLikeTrade, unread: Math.max(0, looksLikeTrade - trades.length) };
}

// A report's file in OGE's PAS index is a 278-T when its name says so
// ("Pete-Hegseth-04.11.2025-278T.pdf"); the annual, nominee and ethics-agreement
// reports sit in the same index.
export const isOge278TFile = (url: string) => /278[-_ ]?T\.pdf$/i.test(decodeURIComponent(url.split('?')[0]));

// The report's id in the index: the 32-hex segment of /PAS+Index/<id>/$FILE/...
export const ogeReportId = (url: string) => /PAS\+Index\/([0-9A-F]{32})\//i.exec(url)?.[1]?.toUpperCase() ?? null;
