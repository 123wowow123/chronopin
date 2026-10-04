// A listed US company's C-suite and their pay, read from the Summary
// Compensation Table of its latest proxy statement (DEF 14A) on SEC EDGAR.
// The table lists the "named executive officers": the chief executive, the
// chief financial officer and the next three best paid, who are the C-suite
// for a company this size. Every lookup runs on the dev machine
// (`npm run companies:executives`); prod stores what a local run sends it.
//
// EDGAR is keyless but wants a contact in the User-Agent (a project one, never
// the owner's address) and at most 10 requests a second.

import { executiveRank, type CompanyExecutiveInput } from './model/companyExecutive';

const HEADERS = { 'User-Agent': 'chronopin-dev/1.0 (contact@chronopin.local)' };
const FETCH_MS = 30_000;

async function get(url: string): Promise<Response> {
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(FETCH_MS) });
  if (!res.ok) throw new Error(`${new URL(url).host} ${res.status}`);
  return res;
}

type Listed = { cik_str: number; ticker: string; title: string };
let listed: Promise<Listed[]> | null = null;

// EDGAR's own list of tickers, fetched once.
const listings = () => (listed ??= get('https://www.sec.gov/files/company_tickers.json').then((r) => r.json() as Promise<Record<string, Listed>>).then(Object.values));

// Ticker symbol -> its EDGAR listing.
async function listingOf(symbol: string): Promise<Listed | null> {
  const all = await listings();
  const want = symbol.toUpperCase();
  return all.find((c) => c.ticker.toUpperCase() === want) ?? all.find((c) => c.ticker.toUpperCase() === want.replace('-', '.')) ?? null;
}

const cikOf = async (symbol: string) => (await listingOf(symbol))?.cik_str ?? null;

// The name EDGAR files a ticker under ("BOEING CO"), to tell a company from a
// division or label that shares its parent's ticker.
export const registrantName = async (symbol: string) => (await listingOf(symbol))?.title ?? null;

const LEGAL = new Set(['inc', 'incorporated', 'corp', 'corporation', 'co', 'company', 'ltd', 'limited', 'plc', 'llc', 'holdings', 'brands', 'sa', 'nv', 'ag', 'se']);

// A name's words without the legal ones: "BOEING CO" -> boeing, "V F CORP" -> v f.
const significant = (name: string) => {
  const words = name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(' ').filter(Boolean);
  while (words.length > 1 && LEGAL.has(words[words.length - 1])) words.pop();
  return words.filter((w) => !LEGAL.has(w) || words.length === 1);
};

// Whether a company of ours is the one EDGAR files the ticker for, and not a
// division, label or brand that shares its parent's ticker ("Boeing
// Commercial Airplanes", "Columbia Records"): the names are the same, one is
// the other's first words plus at most one more, the same words in another
// order ("Eli Lilly", "LILLY ELI"), or ours is its initials ("AMD").
export function sameCompany(ours: string, registrant: string): boolean {
  const a = significant(ours);
  const b = significant(registrant);
  // A leading "The" is dropped from either, joined to the name or not.
  const aj = a.join('').replace(/^the(?=.)/, '');
  const bj = b.join('').replace(/^the(?=.)/, '');
  if (!aj || !bj) return false;
  return aj === bj || (bj.startsWith(aj) && b.length <= a.length + 1) || b.map((w) => w[0]).join('') === aj || [...a].sort().join('') === [...b].sort().join('');
}

export type Proxy = { url: string; filed: string; html: string };

// The company's latest DEF 14A, or null when it files none (a foreign filer).
export async function latestProxy(symbol: string): Promise<Proxy | null> {
  const cik = await cikOf(symbol);
  if (!cik) return null;
  const sub = (await (await get(`https://data.sec.gov/submissions/CIK${String(cik).padStart(10, '0')}.json`)).json()) as {
    filings: { recent: { form: string[]; filingDate: string[]; accessionNumber: string[]; primaryDocument: string[] } };
  };
  const r = sub.filings.recent;
  const i = r.form.findIndex((f) => f === 'DEF 14A');
  if (i < 0) return null;
  const url = `https://www.sec.gov/Archives/edgar/data/${cik}/${r.accessionNumber[i].replaceAll('-', '')}/${r.primaryDocument[i]}`;
  return { url, filed: r.filingDate[i], html: await (await get(url)).text() };
}

const ENTITIES: Record<string, string> = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", rsquo: "'", lsquo: "'", ndash: '–', mdash: '—' };

function text(html: string): string {
  return html
    .replace(/<(br|\/p|\/div)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
    .replace(/[​‌﻿]/g, '')
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n+/g, '\n')
    .trim();
}

// A footnote mark after a figure or name: "(2)", "(3)(4)", "(a)".
const FOOTNOTES = /(\s*\(\w{1,2}\))+$/;

// The rows of the proxy's Summary Compensation Table, each a list of its
// non-empty cells ("$" and footnote marks dropped), or [] when it has none.
export function compensationRows(html: string): string[][] {
  const tables = html.match(/<table[\s\S]*?<\/table>/gi) ?? [];
  // Tags become spaces here, so a header split across cells still reads.
  // The Summary Compensation Table is the one with all its columns: salary,
  // stock or option awards, "all other compensation" and the total. Filings
  // head the name column "Name and Principal Position", "Name and Title" or
  // just "Name", so the columns are the test.
  const table = tables.find((t) => {
    const cells = (t.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) ?? []).map(text);
    const whole = cells.join(' ');
    return (
      cells.some((c) => /^salary\b/i.test(c)) &&
      cells.some((c) => /^total\b/i.test(c)) &&
      /all\s+other/i.test(whole) &&
      /(stock|option)/i.test(whole) &&
      /awards/i.test(whole) &&
      /\b20\d\d\b/.test(whole)
    );
  });
  if (!table) return [];
  return (table.match(/<tr[\s\S]*?<\/tr>/gi) ?? [])
    .map((row) => {
      const cells = (row.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) ?? [])
        .map(text)
        .filter((cell) => cell && !/^[$)%]$/.test(cell) && !/^(\(\w{1,2}\)\s*)+$/.test(cell));
      // Some filings put every year of a person in one row, each cell holding
      // one line per year ("2025\n2024"): the newest is the first line.
      const at = cells.findIndex((c) => /^20\d\d(\n20\d\d)+$/.test(c));
      return at < 0 ? cells : cells.map((c, i) => (i >= at ? c.split('\n')[0] : c));
    })
    .filter((cells) => cells.length);
}

const money = (cell: string) => {
  const plain = cell.replace(/^\$\s*/, '').replace(FOOTNOTES, '');
  return /^[\d,]+(\.\d+)?$/.test(plain) ? Math.round(Number(plain.replace(/,/g, ''))) : /^[—–-]+$/.test(plain) ? 0 : null;
};

// The chief-officer seats (and the president and general counsel, who sit
// with them) among the named executives.
const SEAT = /\b(chief|ceo|cfo|coo|cto|cio|cmo|general counsel)\b|(?<!vice )\bpresident\b/i;

// A title that is only a past one: it starts "Former ...", or says a chief
// seat was "former" and does not go on to name a current one.
const isFormer = (title: string) =>
  !/\b(current|now)\b/i.test(title) && (/^(former|prior|previous)\b/i.test(title) || /\bformer\s+(\w+\s+){0,3}(co-)?(chief|ceo|cfo|coo|president)/i.test(title));

// Where a title begins: its first word, in any case.
const TITLE_WORD = '(?:Chair(?:man|woman|person)?|Co-|Chief|President|Executive|Senior|Vice|Former|Interim|Principal|Group|Global|General|Head|Founder|Managing|Director|Officer|CEO|CFO|COO|CTO|CIO|CMO|EVP|SVP)';
const TITLE_LINE = new RegExp(`^${TITLE_WORD}\\b`, 'i');
const TITLE_SPLIT = new RegExp(`,?\\s+(?=${TITLE_WORD}\\b)`, 'i');

// Names and titles that share a cell are split on its line breaks (a long name
// can wrap onto a line of its own: "Jane / Fraser / CEO"), at the first line
// that starts like a title; one that runs on in a single line is split where
// the title's first word starts.
export function splitNameTitle(cell: string): { name: string; title: string } | null {
  const lines = cell.split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  const found = lines.findIndex((l, i) => i > 0 && TITLE_LINE.test(l));
  if (found > 0) return { name: lines.slice(0, found).join(' '), title: lines.slice(found).join(' ').replace(/^[,\-–]\s*/, '') };
  const joined = lines.join(' ');
  const split = TITLE_SPLIT.exec(joined);
  if (split) return { name: joined.slice(0, split.index), title: joined.slice(split.index + split[0].length) };
  return lines.length >= 2 ? { name: lines[0], title: lines.slice(1).join(' ') } : null;
}

const SMALL = new Set(['and', 'of', 'the', 'for', 'to', 'in', 'on']);
const ACRONYMS = new Set(['ceo', 'cfo', 'coo', 'cto', 'cio', 'cmo', 'cpo', 'clo', 'u.s.', 'us', 'ai', 'it', 'hr', 'evp', 'svp', 'vp']);

// Some proxies set names and titles in capitals ("CHAIR OF THE BOARD AND
// CEO") or all lower case ("executive vice president").
export function tidyCase(value: string): string {
  if (/^[a-z]/.test(value) && value !== value.toLowerCase()) return value[0].toUpperCase() + value.slice(1);
  if ((value !== value.toUpperCase() && value !== value.toLowerCase()) || !/[A-Za-z]/.test(value)) return value;
  return value
    .toLowerCase()
    .split(/(\s+)/)
    .map((w, i) => (ACRONYMS.has(w.replace(/[,;&]+$/, '')) ? w.toUpperCase() : SMALL.has(w) && i ? w : w.replace(/(^|[-'(])([a-z])/g, (_, a, b) => a + b.toUpperCase())))
    .join('');
}

// "Van de Put, Dirk" is "Dirk Van de Put"; "Malave, Jr." keeps its suffix.
const SUFFIX = /^(jr|sr|ii|iii|iv|m\.?d|ph\.?d|cpa|esq)\b/i;
const flipLastFirst = (name: string) => {
  const parts = name.split(/,\s*/);
  return parts.length === 2 && !SUFFIX.test(parts[1]) ? `${parts[1]} ${parts[0]}` : name;
};

// A person's name without the footnote mark or comma after it.
export function cleanName(name: string): string {
  const plain = name.trim().replace(/[\s,]+$/, '').replace(FOOTNOTES, '').replace(/\d{1,2}$/, '').replace(/[\s,]+$/, '').replace(/\s+/g, ' ').trim();
  return tidyCase(flipLastFirst(plain));
}

const cleanTitle = (title: string) => tidyCase(title.replace(FOOTNOTES, '').replace(/(?<=[a-z)])\d{1,2}$/i, '').replace(/\s+/g, ' ').replace(/[,\s]+$/, '').trim());

// Which of a row's figures is the total: the header's own "Total" column when
// every cell is there ("SEC Total" before "Total Without Change in Pension"),
// else the last figure.
function totalIndex(header: string[], figures: number[]): number {
  const columns = header.slice(2);
  const at = columns.findIndex((h) => /^(sec\s+)?total\b/i.test(h.replace(/\s+/g, ' ')));
  return at >= 0 && columns.length === figures.length ? at : figures.length - 1;
}

const isYear = (cell: string | undefined) => /^20\d\d$/.test(cell ?? '');

// One person per named executive: the newest fiscal year's salary and total.
export function parseExecutives(html: string, sourceUrl: string): CompanyExecutiveInput[] {
  const all = compensationRows(html);
  const headerAt = Math.max(0, all.findIndex((r) => r.some((c) => /^(fiscal\s+)?year$/i.test(c))));
  const header = all[headerAt] ?? [];
  const found = new Map<string, CompanyExecutiveInput>();
  let current: string | null = null;
  // Whether the row before was one a person's name or title began on, so the
  // cell under it may be the rest of their title.
  let inTitle = false;
  for (const cells of all.slice(headerAt + 1)) {
    let [first, ...rest] = cells;
    let named = false;
    let continued = false;
    if (!isYear(first)) {
      const nextIsYear = isYear(rest[0]);
      const who = splitNameTitle(first);
      const exec = current ? found.get(current)! : null;
      // The title runs on over the rows below the name, one line to a row
      // (Macy's, Comcast, Adobe, Tapestry): "Chairman and Chief" / "Executive Officer".
      const dangling = !!exec && /(&|and|of|,)$/i.test(exec.title);
      if (exec && inTitle && (nextIsYear || cells.length === 1) && (!exec.title || TITLE_LINE.test(first) || dangling)) {
        exec.title = cleanTitle(exec.title ? `${exec.title} ${first}` : first);
        continued = true;
        if (cells.length === 1) {
          inTitle = true;
          continue;
        }
      } else if (who) {
        current = cleanName(who.name);
        named = true;
        if (!found.has(current)) found.set(current, { name: current, title: cleanTitle(who.title), origin: 'sec', sourceUrl, fiscalYear: null });
        if (cells.length === 1) {
          // The person on a row of their own, the years on the rows below (RTX).
          inTitle = true;
          continue;
        }
      } else if ((nextIsYear || cells.length === 1) && !/\d/.test(first.replace(FOOTNOTES, ''))) {
        current = cleanName(first);
        named = true;
        if (!found.has(current)) found.set(current, { name: current, title: '', origin: 'sec', sourceUrl, fiscalYear: null });
        if (cells.length === 1) {
          // A name alone on its row; the title and years follow (Uber).
          inTitle = true;
          continue;
        }
      } else {
        inTitle = false;
        continue;
      }
      [first, ...rest] = rest;
    }
    inTitle = named || continued;
    if (!current || !isYear(first)) continue;
    const year = Number(first);
    const figures = rest.map(money).filter((n): n is number => n != null);
    const exec = found.get(current)!;
    // Rows come newest year first; only a newer one replaces.
    if (figures.length >= 2 && (exec.fiscalYear == null || year > exec.fiscalYear)) {
      exec.fiscalYear = year;
      exec.salary = figures[0];
      exec.totalCompensation = figures[totalIndex(header, figures)];
    }
  }
  return [...found.values()].filter(
    (e) =>
      e.fiscalYear != null &&
      SEAT.test(e.title) &&
      !isFormer(e.title) &&
      // A garbled row (a title taken for a name, a column slipped) is dropped
      // rather than shown: a name is two to five words, with no title in it.
      /^\S+( \S+){1,4}$/.test(e.name) &&
      !TITLE_LINE.test(e.name) &&
      !/\b(officer|chair|chairman|director|president|board)\b/i.test(e.name) &&
      (e.totalCompensation ?? 0) > 0 &&
      (e.totalCompensation ?? 0) >= (e.salary ?? 0),
  );
}

export async function secExecutives(symbol: string): Promise<{ proxyUrl: string; filed: string; executives: CompanyExecutiveInput[] } | null> {
  const proxy = await latestProxy(symbol);
  if (!proxy) return null;
  const executives = parseExecutives(proxy.html, proxy.url);
  // A read with no chief executive in it missed rows (a layout it does not
  // know, like Tesla's): better nothing than a partial list shown as complete.
  return { proxyUrl: proxy.url, filed: proxy.filed, executives: executives.some((e) => executiveRank(e.title) === 1) ? executives : [] };
}
