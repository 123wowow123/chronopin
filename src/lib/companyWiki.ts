// The wiki behind a company: its sourced facts compiled into an Open Knowledge Format (v0.2)
// `Organization` concept whose statements cite numbered sources. Pure: the server loads the facts
// (src/server/model/companyWiki.ts).

import { companyPath } from './topics';
import { frontmatter } from './okf';

export const COMPANY_WIKI_GENERATOR = 'chronopin-company-wiki/1';
export const COMPANY_WIKI_VERSION = 1;

export type CompanyFacts = {
  name: string;
  description: string | null;
  wikiUrl: string | null;
  websiteUrl: string | null;
  ticker: string | null;
  hqAddress: string | null;
  marketCap: number | null;
  parent: { name: string; wikiUrl: string | null } | null;
  // How the sector was decided: from the SEC's SIC code, from a hand-checked list, or from the asset's name.
  sector: { sector: string; how: 'sic' | 'manual' | 'name'; sic: number | null; sicLabel: string | null; cik: number | null } | null;
  executives: { name: string; title: string }[];
  // Disclosed trades in the ticker by members of Congress and other officials.
  trades: { count: number; people: number; first: string | null; last: string | null; committees: { id: string; name: string }[] } | null;
};

export type WikiSource = { ref: number; url: string; title: string };

const edgar = (cik: number) => `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${String(cik).padStart(10, '0')}`;
const SIC_LIST = 'https://www.sec.gov/search-filings/standard-industrial-classification-sic-code-list';

export function compileCompanyWiki(f: CompanyFacts, builtAt: Date, origin = 'https://www.chronopin.com'): { page: string; sources: WikiSource[] } {
  const sources: WikiSource[] = [];
  const cite = (url: string | null | undefined, title: string): string => {
    if (!url) return '';
    let s = sources.find((x) => x.url === url);
    if (!s) sources.push((s = { ref: sources.length + 1, url, title }));
    return `[^s${s.ref}]`;
  };
  const lines: string[] = [`# ${f.name}`, ''];
  lines.push(`${f.description ? `${f.description}${cite(f.wikiUrl, `${f.name} on Wikipedia`)}` : `${f.name}.`}`);

  const facts: string[] = [];
  if (f.ticker) facts.push(`- Ticker: ${f.ticker}`);
  if (f.hqAddress) facts.push(`- Headquarters: ${f.hqAddress}`);
  if (f.marketCap != null) facts.push(`- Market capitalization: $${(f.marketCap / 1e9).toFixed(1)} billion`);
  if (f.parent) facts.push(`- Parent company: ${f.parent.name}${cite(f.parent.wikiUrl, `${f.parent.name} on Wikipedia`)}`);
  if (f.websiteUrl) facts.push(`- Website: ${f.websiteUrl}${cite(f.websiteUrl, `${f.name} website`)}`);
  if (facts.length) lines.push('', '## Facts', '', ...facts);

  if (f.sector) {
    const s = f.sector;
    lines.push('', '## Sector', '');
    if (s.how === 'sic' && s.cik) {
      lines.push(`Classified as **${s.sector}** from its SEC Standard Industrial Classification code ${s.sic}${s.sicLabel ? ` (${s.sicLabel})` : ''}${cite(edgar(s.cik), `${f.name} on SEC EDGAR`)}${cite(SIC_LIST, 'SEC SIC code list')}.`);
    } else if (s.how === 'manual') {
      lines.push(`Classified as **${s.sector}** by hand from the company's main business; EDGAR's ticker list does not carry it.`);
    } else {
      lines.push(`Classified as **${s.sector}** from the holding's name (no SEC filer to read a code from).`);
    }
    lines.push('', 'The sector decides whether a disclosed trade is marked as a possible conflict of interest: a trade is marked when a committee its member sits on oversees this sector. That is a prompt to look, not a finding of wrongdoing.');
  }

  if (f.executives.length) {
    lines.push('', '## Leadership', '', ...f.executives.map((e) => `- ${e.name}, ${e.title}`));
  }

  if (f.trades) {
    const t = f.trades;
    lines.push('', '## Disclosed trades', '', `${t.count} trade(s) in ${f.ticker} by ${t.people} disclosing official(s)${t.first && t.last ? `, ${t.first} to ${t.last}` : ''}. Amounts are filed as ranges and up to 45 days late.`);
    if (t.committees.length) lines.push('', `Committees whose oversight includes this sector, on which a trading member sits: ${t.committees.map((c) => `${c.name}${cite(`${origin}/api/committees/${c.id}/wiki?path=page`, `${c.name} (committee wiki)`)}`).join('; ')}.`);
  }

  if (sources.length) lines.push('', '## Sources', '', ...sources.map((s) => `[^s${s.ref}]: ${s.title}. ${s.url}`));

  const head = frontmatter({
    type: 'Organization',
    title: f.name,
    description: f.description?.slice(0, 200) || f.name,
    resource: `${origin}${companyPath(f.name)}`,
    tags: ['company', ...(f.sector ? [f.sector.sector] : [])],
    sources: sources.map((s) => ({ id: `s${s.ref}`, resource: s.url, title: s.title })),
    generated: { by: COMPANY_WIKI_GENERATOR, at: builtAt },
  });
  return { page: `${head}\n\n${lines.join('\n')}\n`, sources };
}
