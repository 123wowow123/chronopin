// Wikis for a congressional committee and for a trade filing, as Open Knowledge Format (v0.2) concepts whose
// statements cite numbered sources. Pure: the server loads the rows (src/server/model/govWiki.ts).

import { COMMITTEE_ABOUT } from './committeeAbout';
import { frontmatter } from './okf';
import { personPath } from './people';
import { formatAmountRange } from './trades';

export const GOV_WIKI_GENERATOR = 'chronopin-gov-wiki/1';
export const GOV_WIKI_VERSION = 1;

export type WikiSource = { ref: number; url: string; title: string };
export type Compiled = { title: string; page: string; sources: WikiSource[] };

const sourcer = () => {
  const sources: WikiSource[] = [];
  const cite = (url: string | null | undefined, title: string) => {
    if (!url) return '';
    let s = sources.find((x) => x.url === url);
    if (!s) sources.push((s = { ref: sources.length + 1, url, title }));
    return `[^s${s.ref}]`;
  };
  return { sources, cite };
};

const finish = (type: string, title: string, description: string, resource: string, tags: string[], lines: string[], sources: WikiSource[], at: Date): Compiled => {
  if (sources.length) lines.push('', '## Sources', '', ...sources.map((s) => `[^s${s.ref}]: ${s.title}. ${s.url}`));
  const head = frontmatter({
    type, title, description, resource, tags,
    sources: sources.map((s) => ({ id: `s${s.ref}`, resource: s.url, title: s.title })),
    generated: { by: GOV_WIKI_GENERATOR, at },
  });
  return { title, page: `${head}\n\n${lines.join('\n')}\n`, sources };
};

const BASE = 'https://unitedstates.github.io/congress-legislators';
export const MEMBERSHIP_URL = `${BASE}/committee-membership-current.json`;
export const COMMITTEES_URL = `${BASE}/committees-current.json`;

export type CommitteeFacts = {
  committeeId: string;
  name: string;
  chamber: string;
  parent: { committeeId: string; name: string } | null;
  sectors: string[];
  members: { name: string; title: string | null; rank: number | null }[];
  subcommittees: { committeeId: string; name: string; members: number }[];
  // Disclosed trades by its members in a sector it oversees.
  flagged: { trades: number; people: number; tickers: { ticker: string; count: number }[] };
};

export function compileCommittee(f: CommitteeFacts, at: Date, origin = 'https://www.chronopin.com'): Compiled {
  const { sources, cite } = sourcer();
  const own = f.name.replace(/^.*?: /, '');
  const lines = [`# ${f.parent ? `${own} (${f.parent.name})` : f.name}`, ''];
  lines.push(`${f.parent ? `A subcommittee of the ${f.parent.name}` : `A ${f.chamber} committee of the U.S. Congress`}, identified as ${f.committeeId}${cite(COMMITTEES_URL, 'congress-legislators: current committees')}.`);
  if (COMMITTEE_ABOUT[f.committeeId]) lines.push('', COMMITTEE_ABOUT[f.committeeId]);
  lines.push('', '## Oversight', '');
  lines.push(
    f.sectors.length
      ? `Treated as overseeing: ${f.sectors.join(', ')}. A disclosed trade in one of these sectors by a member is marked as a possible conflict of interest. The mapping is the site's own reading of the committee's jurisdiction, not an official list.`
      : 'No single sector: the committee oversees the whole government or the economy at large, so it does not mark any trade.',
  );
  lines.push('', `## Members (${f.members.length})`, '');
  for (const m of f.members) lines.push(`- [${m.name}](${personPath(m.name)})${m.title ? `, ${m.title}` : ''}${cite(MEMBERSHIP_URL, 'congress-legislators: current committee membership')}`);
  if (f.subcommittees.length) {
    lines.push('', '## Subcommittees', '', ...f.subcommittees.map((s) => `- ${s.name.replace(/^.*?: /, '')} (${s.committeeId}), ${s.members} member(s)`));
  }
  if (f.flagged.trades) {
    lines.push('', '## Trades marked as possible conflicts', '', `${f.flagged.trades} disclosed trade(s) by ${f.flagged.people} member(s) are in a sector this committee oversees; most-traded: ${f.flagged.tickers.map((t) => `${t.ticker} (${t.count})`).join(', ')}. Seats are today's, so older trades are judged by current membership; a match is a prompt to look, not a finding.`);
  }
  return finish('Committee', f.name, COMMITTEE_ABOUT[f.committeeId] ?? `${f.chamber} committee ${f.committeeId}${f.sectors.length ? `; oversees ${f.sectors.join(', ')}` : ''}`, `${origin}/api/committees/${f.committeeId}/wiki?path=page`, ['committee', f.chamber, ...f.sectors], lines, sources, at);
}

export type FilingFacts = {
  chamber: 'house' | 'senate' | 'executive';
  filingId: string;
  filer: string;
  filedDate: string | null;
  sourceUrl: string;
  trades: { txDate: string; asset: string; ticker: string | null; txType: string; amountLow: number | null; amountHigh: number | null; owner: string; sector: string | null; conflicts: string[] }[];
};

const KIND = { house: 'House periodic transaction report', senate: 'Senate periodic transaction report', executive: 'OGE Form 278-T periodic transaction report' } as const;

export function compileFiling(f: FilingFacts, at: Date): Compiled {
  const { sources, cite } = sourcer();
  const title = `${KIND[f.chamber]} ${f.filingId} - ${f.filer}`;
  const flagged = f.trades.filter((t) => t.conflicts.length);
  const lines = [`# ${title}`, ''];
  lines.push(`Filed${f.filedDate ? ` on ${f.filedDate}` : ''} by [${f.filer}](${personPath(f.filer)}) with the ${f.chamber === 'house' ? 'House Clerk' : f.chamber === 'senate' ? 'Senate Office of Public Records' : 'Office of Government Ethics'}${cite(f.sourceUrl, title)}. It lists ${f.trades.length} trade(s); amounts are filed as ranges, and a report may be filed up to 45 days after the trade.`);
  lines.push('', '## Trades', '', '| Date | Asset | Ticker | Type | Amount | Sector | Possible conflict |', '| --- | --- | --- | --- | --- | --- | --- |');
  for (const t of f.trades) {
    lines.push(`| ${t.txDate} | ${t.asset.replace(/\|/g, '/')} | ${t.ticker ?? ''} | ${t.txType} | ${formatAmountRange(t.amountLow, t.amountHigh)} | ${t.sector ?? ''} | ${t.conflicts.join('; ').replace(/\|/g, '/')} |`);
  }
  if (flagged.length) {
    lines.push('', '## Possible conflicts of interest', '', `${flagged.length} of ${f.trades.length} trade(s) are in a sector overseen by a committee ${f.filer} sits on. That is a prompt to look closer, not a finding of wrongdoing.`);
  }
  return finish('Report', title, `${f.filer}: ${f.trades.length} trade(s)${flagged.length ? `, ${flagged.length} possible conflict(s)` : ''}`, f.sourceUrl, ['trade-filing', f.chamber, ...(flagged.length ? ['possible-conflict'] : [])], lines, sources, at);
}
