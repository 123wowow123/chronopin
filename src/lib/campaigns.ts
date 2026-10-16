// Campaign finance rows from the FEC's bulk files: reading them and
// describing a race. Pure, so the importer, the page and the tests share it.

export type CampaignRival = {
  fecCandidateId: string;
  name: string;
  party: string | null;
  status: string | null;
  receipts: number | null;
  disbursements: number | null;
  cashOnHand: number | null;
  votePct: number | null;
  general: boolean;
  sourceUrl: string;
};

export type CampaignPac = { committeeId: string; name: string; amount: number; count: number; sourceUrl: string };

export type CampaignCycle = {
  cycle: number;
  fecCandidateId: string;
  office: 'H' | 'S';
  state: string;
  district: string | null;
  status: string | null;
  party: string | null;
  receipts: number | null;
  disbursements: number | null;
  cashOnHand: number | null;
  individual: number | null;
  pac: number | null;
  partyCommittee: number | null;
  selfFunded: number | null;
  debts: number | null;
  coverageEnd: string | null;
  votePct: number | null;
  sourceUrl: string;
  rivals: CampaignRival[];
  pacs: CampaignPac[];
};

// One line of the FEC's weball file (pipe-separated).
export type WeballRow = Omit<CampaignRival, 'sourceUrl' | 'general'> & {
  office: 'H' | 'S' | 'P';
  state: string;
  district: string | null;
  individual: number | null;
  pac: number | null;
  partyCommittee: number | null;
  selfFunded: number | null;
  debts: number | null;
  coverageEnd: string | null;
  general: boolean;
};

const num = (s: string | undefined) => {
  if (s == null || s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

export function parseWeballLine(line: string): WeballRow | null {
  const c = line.split('|');
  if (c.length < 28 || !/^[HSP]\d/.test(c[0])) return null;
  const cvg = /^(\d\d)\/(\d\d)\/(\d{4})$/.exec(c[27] ?? '');
  return {
    fecCandidateId: c[0],
    name: c[1].trim(),
    status: c[2] || null,
    party: c[4] || null,
    receipts: num(c[5]),
    disbursements: num(c[7]),
    cashOnHand: num(c[10]),
    individual: num(c[17]),
    selfFunded: num(c[11]),
    debts: num(c[16]),
    office: c[0][0] as 'H' | 'S' | 'P',
    state: c[18],
    district: c[0][0] === 'H' ? c[19] || null : null,
    general: !!c[23],
    votePct: num(c[24]),
    pac: num(c[25]),
    partyCommittee: num(c[26]),
    coverageEnd: cvg ? `${cvg[3]}-${cvg[1]}-${cvg[2]}` : null,
  };
}

// "SMITH, JOHN Q. JR" -> { last: 'smith', first: 'john' } for matching.
export function nameParts(fec: string): { last: string; first: string } {
  const [last = '', rest = ''] = fec.split(',');
  const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
  return { last: fold(last), first: fold(rest).split(' ')[0] ?? '' };
}

export const fecCandidateUrl = (id: string, cycle: number) => `https://www.fec.gov/data/candidate/${id}/?cycle=${cycle}`;
export const fecCommitteeUrl = (id: string, cycle: number) => `https://www.fec.gov/data/committee/${id}/?cycle=${cycle}`;

// FEC capitalises names in capitals: "BEGICH, NICHOLAS III" -> "Nicholas Begich III".
export function displayName(fec: string): string {
  const [last = '', rest = ''] = fec.split(',').map((s) => s.trim());
  const title = (s: string) => s.toLowerCase().replace(/(^|[\s\-'.])([a-z])/g, (_m, a, b) => a + b.toUpperCase());
  const parts = rest.replace(/\b(MR|MRS|MS|DR|HON)\.?(?=\s|$)/gi, '').split(' ').filter(Boolean);
  const suffix = parts.length > 1 && /^(jr|sr|ii|iii|iv)\.?$/i.test(parts[parts.length - 1]) ? parts.pop()! : '';
  return [title(parts.join(' ')), title(last), suffix ? suffix.replace(/^(ii|iii|iv)$/i, (m) => m.toUpperCase()).replace(/^(jr|sr)\.?$/i, (m) => title(m)) : ''].filter(Boolean).join(' ');
}

export const PARTY_NAMES: Record<string, string> = { DEM: 'Democratic', REP: 'Republican', IND: 'Independent', LIB: 'Libertarian', GRE: 'Green', NPA: 'No party', DFL: 'Democratic-Farmer-Labor' };
export const STATUS_NAMES: Record<string, string> = { I: 'Incumbent', C: 'Challenger', O: 'Open seat' };

// The FEC's quarterly filing deadlines: April 15, July 15, October 15 and the
// year-end report on January 31. Answers with the latest one on or before
// `now` (a day, YYYY-MM-DD, UTC). The personCampaigns task runs once after each.
export function latestQuarterlyDeadline(now: Date): string {
  const y = now.getUTCFullYear();
  const days = [`${y - 1}-10-15`, `${y}-01-31`, `${y}-04-15`, `${y}-07-15`, `${y}-10-15`];
  const today = now.toISOString().slice(0, 10);
  return days.filter((d) => d <= today).pop()!;
}

// The two-year cycle a date falls in: 2026 for any day of 2025-2026.
export const cycleOf = (now: Date) => Math.ceil(now.getUTCFullYear() / 2) * 2;

// Due once the latest deadline is `graceDays` old (the FEC's bulk files trail
// the filings by a day or two) and has not been run for yet.
export function campaignRefreshDue(now: Date, lastDeadlineRun: string | null, graceDays = 3): { due: boolean; deadline: string } {
  const deadline = latestQuarterlyDeadline(now);
  const ready = new Date(`${deadline}T00:00:00Z`).getTime() + graceDays * 864e5 <= now.getTime();
  return { due: ready && (lastDeadlineRun ?? '') < deadline, deadline };
}
