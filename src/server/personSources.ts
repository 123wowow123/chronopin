// What the person importers (scripts/people/import.ts) read from
// GovTrack, Congress.gov and the statutory pay tables, as pure functions so
// the rules are testable without the network.

import type { PersonEarning, PersonRole } from '@/lib/people';

export const STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky',
  LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island',
  SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia', PR: 'Puerto Rico', GU: 'Guam', VI: 'U.S. Virgin Islands',
  AS: 'American Samoa', MP: 'Northern Mariana Islands',
};

export type GovTrackRole = {
  role_type: 'senator' | 'representative';
  state: string;
  district: number | null;
  party: string | null;
  startdate: string;
  enddate: string;
  leadership_title: string | null;
  website?: string | null;
  person: { bioguideid: string | null; birthday: string | null; firstname: string; lastname: string; nickname?: string; namemod?: string; link: string };
};

// "Susan Collins", "Ted Cruz" (the nickname a member goes by), "John Smith Jr.".
export function memberName(p: Pick<GovTrackRole['person'], 'firstname' | 'lastname' | 'nickname' | 'namemod'>): string {
  return [p.nickname?.trim() || p.firstname.trim(), p.lastname.trim(), p.namemod?.trim()].filter(Boolean).join(' ');
}

export function govtrackId(link: string): number | null {
  const m = /\/(\d+)\/?$/.exec(link);
  return m ? Number(m[1]) : null;
}

const ORDINAL = (n: number) => {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`;
};

// "United States Senator from Maine", "United States Representative from
// Texas's 3rd congressional district", "... at-large".
export function officeLabel(r: Pick<GovTrackRole, 'role_type' | 'state' | 'district'>): string {
  const state = STATES[r.state] ?? r.state;
  if (r.role_type === 'senator') return `United States Senator from ${state}`;
  const seat = r.district && r.district > 0 ? `${ORDINAL(r.district)} congressional district` : 'at-large';
  const place = r.state === 'DC' ? state : `${state}'s ${seat}`;
  return `United States ${r.state === 'DC' || r.state === 'PR' || r.state === 'GU' || r.state === 'VI' || r.state === 'AS' || r.state === 'MP' ? 'Delegate' : 'Representative'} from ${place}`;
}

export function roleOf(r: Pick<GovTrackRole, 'role_type'>): PersonRole {
  return r.role_type === 'senator' ? 'senator' : 'representative';
}

// Annual salary rates (US dollars) set by law and held since the January 2009
// adjustment (CRS 97-1011, "Salaries of Members of Congress: Recent Actions
// and Historical Tables"; CRS RL30064). The Speaker is paid $223,500, the
// majority and minority leaders of both chambers and the President pro
// tempore $193,400, and everyone else $174,000. A year before 2009 is not
// given: the earlier rates are not in this table, so no tile is made for it.
export const CONGRESS_PAY_SOURCE = 'https://www.everycrsreport.com/files/2026-05-06_97-1011_f3f1ab82689feb24bc412b23307dc3c9522276f1.html';
export const CONGRESS_PAY_FROM = 2009;

export function congressSalary(year: number, leadershipTitle: string | null | undefined): number | null {
  if (year < CONGRESS_PAY_FROM) return null;
  const title = (leadershipTitle ?? '').toLowerCase();
  if (title === 'speaker') return 223_500;
  if (/^(majority|minority) leader$/.test(title) || title === 'president pro tempore') return 193_400;
  return 174_000;
}

// One salary line per calendar year the member held a seat on 1 July of that
// year (a term starts on 3 January, so this counts the years served in full
// and leaves out a year of which only a stub was served).
export function salaryEarnings(
  terms: Pick<GovTrackRole, 'role_type' | 'startdate' | 'enddate' | 'leadership_title'>[],
  throughYear: number,
): PersonEarning[] {
  const out = new Map<number, PersonEarning>();
  for (const term of terms) {
    for (let year = Math.max(CONGRESS_PAY_FROM, Number(term.startdate.slice(0, 4))); year <= Math.min(throughYear, Number(term.enddate.slice(0, 4))); year += 1) {
      const midYear = `${year}-07-01`;
      if (term.startdate > midYear || term.enddate < midYear) continue;
      const amount = congressSalary(year, term.leadership_title);
      if (amount == null) continue;
      const leadership = term.leadership_title ? ` (${term.leadership_title})` : '';
      const previous = out.get(year);
      if (previous && (previous.amount ?? 0) >= amount) continue;
      out.set(year, {
        year,
        kind: 'salary',
        label: `${term.role_type === 'senator' ? 'Senate' : 'House'} salary${leadership}`,
        amount,
        amountLow: null,
        amountHigh: null,
        currency: 'USD',
        sourceUrl: CONGRESS_PAY_SOURCE,
        note: null,
      });
    }
  }
  return [...out.values()].sort((a, b) => b.year - a.year);
}

// "Became Public Law No: 119-118." -> "Pub. L. 119-118"; null for a bill
// that did not become law.
export function publicLawFrom(actionText: string | null | undefined): string | null {
  const m = /Became Public Law No:\s*(\d+-\d+)/i.exec(actionText ?? '');
  return m ? `Pub. L. ${m[1]}` : null;
}

export type CongressBill = {
  congress: number;
  type: string;
  number: string;
  title: string;
  introducedDate?: string;
  latestAction?: { actionDate?: string; text?: string };
  policyArea?: { name?: string };
};

// A sponsored bill that became law, as a contribution (kind 'law', role
// 'sponsor'); null when it did not. The date is the day it became law.
export function lawContribution(bill: CongressBill) {
  const reference = publicLawFrom(bill.latestAction?.text);
  if (!reference) return null;
  const type = bill.type.toLowerCase();
  const path = { hr: 'house-bill', s: 'senate-bill', hjres: 'house-joint-resolution', sjres: 'senate-joint-resolution' }[type];
  return {
    kind: 'law' as const,
    title: bill.title.trim().slice(0, 400),
    summary: bill.policyArea?.name ? `Policy area: ${bill.policyArea.name}. Introduced as ${bill.type.toUpperCase()} ${bill.number} in the ${bill.congress}th Congress.` : `Introduced as ${bill.type.toUpperCase()} ${bill.number} in the ${bill.congress}th Congress.`,
    role: 'sponsor',
    date: bill.latestAction?.actionDate ?? null,
    reference,
    importance: 3,
    sourceUrl: path ? `https://www.congress.gov/bill/${bill.congress}th-congress/${path}/${bill.number}` : null,
    origin: 'congress' as const,
  };
}

// Wikidata lists one faith under several items ("Catholicism", "Roman
// Catholic", "Catholic Church"); the page names it once. Other labels keep
// their own words, in the order Wikidata gave them, each once.
export function religionLabel(labels: string[]): string | null {
  const out: string[] = [];
  for (const raw of labels) {
    const label = raw.trim();
    if (!label || /^Q\d+$/.test(label)) continue;
    const name = /^(catholicism|roman catholic(ism)?|catholic church|catholic)$/i.test(label) ? 'Catholic' : label;
    if (!out.some((o) => o.toLowerCase() === name.toLowerCase())) out.push(name);
  }
  // Wikidata also lists the families and church-government labels a
  // denomination belongs to (Congregational churches, congregationalist
  // polity, Protestantism): when a more specific label is there, they go.
  const general = /\b(polity|churches|christianity|protestantism)\b/i;
  const specific = out.filter((o) => !general.test(o));
  const kept = specific.length ? specific : out;
  return kept.length ? kept.slice(0, 2).join(', ') : null;
}

// "Democratic Party" -> "Democratic": the way the page names a party.
export function partyLabel(label: string | null | undefined): string | null {
  const v = label?.trim().replace(/\s+Party$/i, '');
  return v && !/^Q\d+$/.test(v) ? v : null;
}

// Where a member's unbroken service in their chamber began: terms are
// [start, end] days (end null = still sitting), joined when one starts within
// `gapDays` of the previous one's end, and the run that holds the latest term
// is the one reported. Wikidata lists a member's terms one Congress at a time
// (and sometimes a stray overlapping one), so intervals are merged, not
// summed.
export function tenureStart(terms: { start: string; end: string | null }[], gapDays = 120): string | null {
  const sorted = terms.filter((t) => /^\d{4}-\d{2}-\d{2}$/.test(t.start)).sort((a, b) => a.start.localeCompare(b.start));
  if (!sorted.length) return null;
  const DAY = 86_400_000;
  const ms = (d: string) => Date.parse(`${d}T00:00:00Z`);
  const far = '9999-12-31';
  let runStart = sorted[0].start;
  let runEnd = sorted[0].end ?? far;
  for (const term of sorted.slice(1)) {
    if (ms(term.start) - ms(runEnd) > gapDays * DAY) runStart = term.start;
    const end = term.end ?? far;
    if (end > runEnd || ms(term.start) - ms(runEnd) > gapDays * DAY) runEnd = end;
  }
  return runStart;
}
