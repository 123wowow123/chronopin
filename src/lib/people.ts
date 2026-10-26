// A person's page (/person/<slug>): the shape of what it shows, and
// the arithmetic the page does on it - age, a year's earnings, the order of
// things. Shared by the server (src/server/model/person.ts), the page and
// its tests. Every fact carries the URL it was read from; a fact nobody has
// published is absent (null), and the page leaves it off rather than say
// "unknown".

import { topicSlug } from './topics';

export const PERSON_ROLES = [
  'president', 'vice-president', 'cabinet', 'senator', 'representative', 'governor', 'politician',
  'business', 'entertainment', 'sports', 'arts', 'science', 'media', 'netizen', 'other',
] as const;
export type PersonRole = (typeof PERSON_ROLES)[number];

// The political roles: their page leads with laws and offices, and a politician
// who has left office is listed with the former officeholders.
export const POLITICAL_ROLES: readonly PersonRole[] = ['president', 'vice-president', 'cabinet', 'senator', 'representative', 'governor', 'politician'];
export const isPolitical = (role: PersonRole) => POLITICAL_ROLES.includes(role);

// A tab on the index with fewer people than this is not worth a tab: its
// people join the tab of a neighbouring role (foldRoles).
export const MIN_TAB_PEOPLE = 10;

// For each role, the role whose tab its people are listed under. A role with
// fewer than MIN_TAB_PEOPLE people joins the executive branch (a political
// role) or Other notable people (the rest); the rest keep their own tab.
// `counts` is the number of people each role would show on its own.
export function foldRoles(counts: Partial<Record<PersonRole, number>>, min = MIN_TAB_PEOPLE): Map<PersonRole, PersonRole> {
  const tab = new Map<PersonRole, PersonRole>(PERSON_ROLES.map((r) => [r, r]));
  const size = { ...counts };
  for (const role of PERSON_ROLES) {
    const n = size[role] ?? 0;
    const target: PersonRole = isPolitical(role) ? 'cabinet' : 'other';
    if (n === 0 || n >= min || role === target || role === 'president' || role === 'netizen') continue;
    tab.set(role, target);
    size[target] = (size[target] ?? 0) + n;
    size[role] = 0;
  }
  return tab;
}

export const EARNING_KINDS = ['salary', 'outside-income', 'royalties', 'investments', 'pension', 'endorsements', 'prize-money', 'business-income', 'other'] as const;
export type EarningKind = (typeof EARNING_KINDS)[number];

export const CONTRIBUTION_KINDS = ['law', 'bill', 'executive-order', 'committee', 'office', 'initiative', 'award', 'work', 'company', 'record', 'other'] as const;
export type ContributionKind = (typeof CONTRIBUTION_KINDS)[number];

// Colours for a chart's series: the octagon's phases and the lines of a year's
// earnings. Mid-saturated, so each reads on the light and the dark theme.
export const CHART_COLORS = ['#3b82f6', '#84cc16', '#f97316', '#a855f7', '#06b6d4', '#ec4899', '#eab308', '#94a3b8'] as const;

// How wide a line is drawn in a year's bar: its amount, or the middle of a
// disclosure's range. The figures beside the bar always say which it is.
export function lineWeight(line: Pick<PersonEarning, 'amount' | 'amountLow' | 'amountHigh'>): number {
  if (line.amount != null) return line.amount;
  return ((line.amountLow ?? 0) + (line.amountHigh ?? 0)) / 2;
}

// A legal or ethics matter: only where an official body or court acted, with
// its status stated (src/server/personInput.ts, 0154).
export const MATTER_KINDS = ['insider-trading', 'securities', 'corruption', 'fraud', 'tax', 'campaign-finance', 'ethics', 'obstruction', 'misconduct', 'other'] as const;
export type MatterKind = (typeof MATTER_KINDS)[number];

export const MATTER_STATUSES = [
  'investigated', 'charged', 'convicted', 'pleaded-guilty', 'acquitted', 'dismissed', 'closed-no-action',
  'settled', 'found-liable', 'sanctioned', 'findings-issued', 'pardoned', 'overturned',
] as const;
export type MatterStatus = (typeof MATTER_STATUSES)[number];

export const PROPERTY_KINDS = ['residence', 'second-home', 'investment', 'land', 'other'] as const;
export type PropertyKind = (typeof PROPERTY_KINDS)[number];

export const TRIP_KINDS = ['leisure', 'sponsored', 'official'] as const;
export type TripKind = (typeof TRIP_KINDS)[number];

// Whole units of `currency`, or a disclosure's range (amount null).
export type PersonEarning = {
  year: number;
  kind: EarningKind;
  label: string;
  amount: number | null;
  amountLow: number | null;
  amountHigh: number | null;
  currency: string;
  sourceUrl: string | null;
  note: string | null;
};

// Welfare-economics criteria a contribution's impact is assessed on (0156).
// Scores run -2 (clearly harms) to +2 (clearly benefits), by what the cited
// evidence says. `distribution` is shown beside the rest and never added in:
// how much to weigh who gains and who loses is a value judgment, not a finding.
export const IMPACT_CRITERIA = ['efficiency', 'externalities', 'growth', 'fiscal', 'distortion', 'distribution'] as const;
export type ImpactCriterion = (typeof IMPACT_CRITERIA)[number];
export const METER_CRITERIA: readonly ImpactCriterion[] = ['efficiency', 'externalities', 'growth', 'fiscal', 'distortion'];
export type ImpactConfidence = 'high' | 'medium' | 'low';

export type ContributionImpact = {
  scores: Partial<Record<ImpactCriterion, number>>;
  confidence: ImpactConfidence;
  // Credible sources (economist panels, studies) disagree about the sign.
  contested: boolean;
  // The finding in a sentence or two, citing the evidence's own words.
  basis: string | null;
  evidenceUrl: string;
  assessedDate: string | null;
};

// The octagon: eight axes, each scored 0..5 against a written rubric from
// documented evidence, per phase of a life (0161). Appearance and personality
// - two of the six in the "hexagonal human" chart - are not here: they cannot
// be scored from evidence. Nor is family background: nobody earns it, and the
// chart's critics' main objection is that it measures what one is born with.
// Every axis reads "more = more of that thing": a long Misconduct spoke is more
// documented misconduct, not a better score, which is why the shape has no
// ideal and no total.
export const OCTAGON_AXES = ['education', 'wealth', 'position', 'standing', 'health', 'misconduct', 'social', 'economic'] as const;
export type OctagonAxis = (typeof OCTAGON_AXES)[number];

export type PhaseAxis = {
  score: number;
  basis: string | null;
  evidenceUrl: string;
  confidence: ImpactConfidence;
};

export type PersonPhase = {
  // 'generated': built from the person's documented data when their wiki is
  // compiled (generateOverview); 'hand': researched and set through the API.
  origin?: 'hand' | 'generated';
  label: string;
  startYear: number | null;
  endYear: number | null;
  summary: string | null;
  axes: Partial<Record<OctagonAxis, PhaseAxis>>;
};

export type PersonContribution = {
  kind: ContributionKind;
  title: string;
  summary: string | null;
  role: string | null;
  // An ISO day, or null.
  date: string | null;
  reference: string | null;
  importance: number;
  sourceUrl: string | null;
  // The impact assessment (0156), when one has been made.
  impact?: ContributionImpact | null;
};

export type PersonMatter = {
  kind: MatterKind;
  title: string;
  summary: string | null;
  status: MatterStatus;
  authority: string | null;
  filedDate: string | null;
  resolvedDate: string | null;
  penalty: string | null;
  sourceUrl: string;
  asOf: string | null;
};

export type PersonProperty = {
  name: string;
  kind: PropertyKind;
  location: string | null;
  valueLow: number | null;
  valueHigh: number | null;
  currency: string;
  acquiredYear: number | null;
  asOf: string | null;
  sourceUrl: string | null;
  note: string | null;
};

export type PersonTrip = {
  destination: string;
  kind: TripKind;
  startDate: string;
  endDate: string | null;
  sourceUrl: string | null;
  note: string | null;
};

// The row a list shows: enough for a card, no sub-tables.
export type PersonSummary = {
  id: number;
  name: string;
  slug: string;
  role: PersonRole;
  office: string | null;
  jurisdiction: string | null;
  party: string | null;
  photoUrl: string | null;
  // The day they left the office, or null while serving: a former officeholder
  // when set, or when they have died (isFormer).
  leftOfficeDate: string | null;
  deathDate: string | null;
};

// Retired, resigned, defeated or dead: listed with the former officeholders.
export function isFormer(p: Pick<PersonSummary, 'leftOfficeDate' | 'deathDate'>): boolean {
  return p.leftOfficeDate != null || p.deathDate != null;
}

export const RESEARCH_TOPICS = ['legal', 'standing', 'society', 'education', 'wealth', 'other'] as const;
export type ResearchTopic = (typeof RESEARCH_TOPICS)[number];
export const RESEARCH_COVERAGE = ['searched', 'partial', 'not-found'] as const;
export type ResearchCoverage = (typeof RESEARCH_COVERAGE)[number];

// What was looked for on a topic and what came of it (0163). Not a source of
// facts: it records how far a search went, so an empty section is not read as
// "nothing there".
export type PersonResearchNote = {
  topic: ResearchTopic;
  coverage: ResearchCoverage;
  checkedDate: string;
  note: string;
  unciteable: { url: string; why: string | null }[];
};

export type PersonProfile = PersonSummary & {
  politics: string | null;
  politicsSourceUrl: string | null;
  inOfficeSince: string | null;
  birthDate: string | null;
  religion: string | null;
  religionSourceUrl: string | null;
  weightKg: number | null;
  weightAsOf: string | null;
  weightSourceUrl: string | null;
  health: string | null;
  healthAsOf: string | null;
  healthSourceUrl: string | null;
  description: string | null;
  photoCredit: string | null;
  wikiUrl: string | null;
  websiteUrl: string | null;
  // Congress's bioguide id: the official biography the basics cite.
  bioguideId: string | null;
  // The highest degree held (2..5), what it was, and where it was read (0162).
  educationLevel: number | null;
  educationNote: string | null;
  educationSourceUrl: string | null;
  // The day the record was searched for legal and ethics matters; null =
  // nobody has looked, and the page shows no meter (0155).
  mattersCheckedDate: string | null;
  earnings: PersonEarning[];
  contributions: PersonContribution[];
  properties: PersonProperty[];
  trips: PersonTrip[];
  matters: PersonMatter[];
  phases: PersonPhase[];
  // How far each topic was researched (0163); absent on older records.
  researchNotes?: PersonResearchNote[];
};

export function personPath(name: string): string {
  return `/person/${encodeURIComponent(topicSlug(name))}`;
}

// The order the index lists the offices in: the top of the executive first,
// then the legislature, then the states.
export const ROLE_ORDER: Record<PersonRole, number> = {
  president: 0,
  'vice-president': 1,
  cabinet: 2,
  senator: 3,
  representative: 4,
  governor: 5,
  politician: 6,
  business: 7,
  entertainment: 8,
  sports: 9,
  arts: 10,
  science: 11,
  media: 12,
  netizen: 13,
  other: 14,
};

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

// Whole years between an ISO birth day and `at` (an ISO day or a Date, read
// in UTC): the birthday counts on the day itself. Null for a birth day that
// is missing or not a real date, or one after `at`.
export function ageOn(birthDate: string | null | undefined, at: string | Date): number | null {
  const born = birthDate ? DAY.exec(birthDate) : null;
  if (!born) return null;
  const on = typeof at === 'string' ? DAY.exec(at) : null;
  const [by, bm, bd] = [Number(born[1]), Number(born[2]), Number(born[3])];
  const [y, m, d] = on
    ? [Number(on[1]), Number(on[2]), Number(on[3])]
    : [at instanceof Date ? at.getUTCFullYear() : NaN, at instanceof Date ? at.getUTCMonth() + 1 : NaN, at instanceof Date ? at.getUTCDate() : NaN];
  if ([by, bm, bd, y, m, d].some(Number.isNaN)) return null;
  const real = new Date(Date.UTC(by, bm - 1, bd));
  if (real.getUTCFullYear() !== by || real.getUTCMonth() !== bm - 1 || real.getUTCDate() !== bd) return null;
  let years = y - by;
  if (m < bm || (m === bm && d < bd)) years -= 1;
  return years >= 0 ? years : null;
}

// How old the person is now, or was when they died.
export function currentAge(p: Pick<PersonProfile, 'birthDate' | 'deathDate'>, now: Date): number | null {
  return ageOn(p.birthDate, p.deathDate ?? now);
}

// One tile of the earnings strip: a calendar year, what the lines add up to,
// and the lines. A year whose lines are all ranges adds up to a range; a mix
// adds the known amounts and carries the ranges on the high and low ends.
export type EarningYear = {
  year: number;
  currency: string;
  low: number;
  high: number;
  // True when the total is one amount, not a range.
  exact: boolean;
  lines: PersonEarning[];
};

// Years newest first, each with its lines, largest first. A year holding more
// than one currency keeps the currency of its biggest line and drops the
// others from the sum rather than adding euros to dollars.
export function earningYears(earnings: PersonEarning[]): EarningYear[] {
  const byYear = new Map<number, PersonEarning[]>();
  for (const e of earnings) byYear.set(e.year, [...(byYear.get(e.year) ?? []), e]);
  const size = (e: PersonEarning) => e.amount ?? e.amountHigh ?? 0;
  return [...byYear.entries()]
    .map(([year, rows]) => {
      const sorted = [...rows].sort((a, b) => size(b) - size(a) || a.label.localeCompare(b.label));
      const currency = sorted[0].currency;
      const lines = sorted.filter((e) => e.currency === currency);
      let low = 0;
      let high = 0;
      let exact = true;
      for (const e of lines) {
        if (e.amount != null) {
          low += e.amount;
          high += e.amount;
        } else {
          low += e.amountLow ?? 0;
          high += e.amountHigh ?? 0;
          exact = false;
        }
      }
      return { year, currency, low, high, exact, lines };
    })
    .sort((a, b) => b.year - a.year);
}

// The laws first (the career-defining ones, then the newest), then the rest
// grouped by kind in the order CONTRIBUTION_KINDS gives.
export function sortContributions(list: PersonContribution[]): PersonContribution[] {
  const kind = (c: PersonContribution) => CONTRIBUTION_KINDS.indexOf(c.kind);
  return [...list].sort(
    (a, b) =>
      kind(a) - kind(b) ||
      a.importance - b.importance ||
      (b.date ?? '').localeCompare(a.date ?? '') ||
      a.title.localeCompare(b.title),
  );
}

// A value range as one phrase's numbers: the same ends are one amount.
export function valueRange(low: number | null, high: number | null): { low: number; high: number } | null {
  if (low == null && high == null) return null;
  const a = low ?? high!;
  const b = high ?? low!;
  return { low: Math.min(a, b), high: Math.max(a, b) };
}

// A source link only when it is an https URL: what is stored came from a
// person or a script, and it is rendered as an href.
export function safeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

// Whole units of a currency in the page's own words: "$174,000" up to a
// million, "$2.4M" beyond it.
export function formatMoney(locale: string, amount: number, currency: string, compactDigits = 1): string {
  const compact = Math.abs(amount) >= 1_000_000;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      notation: compact ? 'compact' : 'standard',
      maximumFractionDigits: compact ? compactDigits : 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString(locale)}`;
  }
}

// "$174,000" for one amount, "$100K - $1M" for a range.
// Two ends that compact to the same figure ($1.10B and $1.14B) are given more
// digits, and shown as one amount only if they still read the same.
export function formatMoneyRange(locale: string, low: number, high: number, currency: string): string {
  if (low === high) return formatMoney(locale, low, currency);
  for (const digits of [1, 2, 3]) {
    const a = formatMoney(locale, low, currency, digits);
    const b = formatMoney(locale, high, currency, digits);
    if (a !== b) return `${a} \u2013 ${b}`;
  }
  return formatMoney(locale, low, currency);
}

// Newest first, by the day it was decided or, failing that, filed.
export function sortMatters(list: PersonMatter[]): PersonMatter[] {
  const day = (m: PersonMatter) => m.resolvedDate ?? m.filedDate ?? '';
  return [...list].sort((a, b) => day(b).localeCompare(day(a)) || a.title.localeCompare(b.title));
}

// Statuses that are findings against the person, as against a step in a
// process (investigated, charged) or an outcome in their favour (acquitted,
// dismissed, closed, overturned). Used to colour the badge, never to rank.
export const ADVERSE_STATUSES: readonly MatterStatus[] = ['convicted', 'pleaded-guilty', 'found-liable', 'sanctioned', 'findings-issued', 'settled'];

export const METER_LEVELS = ['none', 'open', 'one', 'several', 'extensive'] as const;
export type MeterLevel = (typeof METER_LEVELS)[number];

// What a matter's status counts as on the meter. A finding is something a
// court or regulator did against the person - a conviction, a plea, a
// liability finding, a sanction, a penalty or settlement (a pardon follows
// a conviction, so it stays one). An open matter is a step in a process:
// investigated, charged. Anything that ended in the person's favour is
// resolved and counts against nothing.
export const FINDING_STATUSES: readonly MatterStatus[] = ['convicted', 'pleaded-guilty', 'found-liable', 'sanctioned', 'findings-issued', 'settled', 'pardoned'];
export const OPEN_STATUSES: readonly MatterStatus[] = ['investigated', 'charged'];

export type Meter = { level: MeterLevel; index: number; findings: number; open: number; resolved: number; checked: string };

// The misconduct meter: a tally of documented official actions, nothing
// more. It is null until someone has reviewed the person's record (a date in
// `checked`), because no research is not a clean record. 0 findings and 0
// open: "none documented"; only open: "under scrutiny"; then by how many
// findings there are: 1, 2-3, 4 or more. Severity is not weighed: that is a
// judgment this site does not make, and each matter's own status and penalty
// are shown beside it.
export function misconductMeter(matters: Pick<PersonMatter, 'status'>[], checked: string | null | undefined): Meter | null {
  if (!checked) return null;
  const findings = matters.filter((m) => FINDING_STATUSES.includes(m.status)).length;
  const open = matters.filter((m) => OPEN_STATUSES.includes(m.status)).length;
  const resolved = matters.length - findings - open;
  const level: MeterLevel = findings >= 4 ? 'extensive' : findings >= 2 ? 'several' : findings === 1 ? 'one' : open > 0 ? 'open' : 'none';
  return { level, index: METER_LEVELS.indexOf(level), findings, open, resolved, checked };
}

// How far one contribution's own scores come to, -2..+2: the plain mean of the
// scored criteria that count toward the meter. Null when none of them is scored.
export function impactScore(impact: ContributionImpact | null | undefined): number | null {
  if (!impact) return null;
  const values = METER_CRITERIA.map((c) => impact.scores[c]).filter((v): v is number => typeof v === 'number');
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

export const CONFIDENCE_WEIGHT: Record<ImpactConfidence, number> = { high: 1, medium: 0.6, low: 0.3 };
// A career-defining contribution (importance 1) counts five times a minor one.
export const importanceWeight = (importance: number) => 6 - Math.min(5, Math.max(1, importance));

export const SOCIETY_LEVELS = ['harmful', 'leaning-harmful', 'mixed', 'leaning-beneficial', 'beneficial'] as const;
export type SocietyLevel = (typeof SOCIETY_LEVELS)[number];
// The smallest number of assessed contributions that is a meter at all. A few
// laws judged on partly secondary evidence say more about which laws could be
// assessed than about the person, so the gauge waits for a real body of work;
// each assessment still shows on its own contribution before that.
export const MIN_ASSESSED = 5;

export type SocietyMeter = {
  level: SocietyLevel;
  // The weighted mean on the -2..+2 scale, and the lowest and highest
  // assessed contribution, so the spread is never hidden by the average.
  value: number;
  min: number;
  max: number;
  assessed: number;
  total: number;
  contested: number;
};

// "Good for society", from documented impact: the weighted mean of the
// assessed contributions' scores (weight = importance x evidence confidence),
// shown with how many of the person's contributions it rests on and how many
// are contested. It is null below MIN_ASSESSED. It measures what the cited
// evidence says about the effects of what the person did - efficiency,
// market failures, growth, fiscal sustainability, distortion - and does not
// weigh distribution or judge intent or character.
export function societyMeter(contributions: Pick<PersonContribution, 'importance' | 'impact'>[]): SocietyMeter | null {
  const rated = contributions
    .map((c) => ({ score: impactScore(c.impact), weight: importanceWeight(c.importance) * CONFIDENCE_WEIGHT[c.impact?.confidence ?? 'low'], contested: !!c.impact?.contested }))
    .filter((r): r is { score: number; weight: number; contested: boolean } => r.score != null);
  if (rated.length < MIN_ASSESSED) return null;
  const totalWeight = rated.reduce((a, r) => a + r.weight, 0);
  const value = rated.reduce((a, r) => a + r.score * r.weight, 0) / totalWeight;
  const level: SocietyLevel = value <= -1.2 ? 'harmful' : value <= -0.4 ? 'leaning-harmful' : value < 0.4 ? 'mixed' : value < 1.2 ? 'leaning-beneficial' : 'beneficial';
  return {
    level,
    value: Math.round(value * 100) / 100,
    min: Math.min(...rated.map((r) => r.score)),
    max: Math.max(...rated.map((r) => r.score)),
    assessed: rated.length,
    total: contributions.length,
    contested: rated.filter((r) => r.contested).length,
  };
}

// "1968-1987", "2017-2021", "2025-" or "" for a phase whose years are not known.
export function phaseYears(p: Pick<PersonPhase, 'startYear' | 'endYear'>): string {
  if (p.startYear == null && p.endYear == null) return '';
  if (p.startYear != null && p.endYear == null) return `${p.startYear}\u2013`;
  if (p.startYear == null) return `\u2013${p.endYear}`;
  return p.startYear === p.endYear ? String(p.startYear) : `${p.startYear}\u2013${p.endYear}`;
}

// A phase needs this many scored axes to draw a shape of its own. Fewer is a
// line or a few points, and several of those side by side say less than one
// profile does.
export const MIN_PHASE_AXES = 5;

// When no researched phase has enough evidence to stand alone, the life phases
// are shown as one entry: for each axis the most recent phase that scored it
// (phases are in time order, undated ones first). A person with even one
// well-evidenced phase keeps the phases apart, as the presidents do.
export function collapseSparsePhases(phases: PersonPhase[]): PersonPhase[] {
  if (phases.length < 2) return phases;
  if (phases.some((p) => Object.keys(p.axes).length >= MIN_PHASE_AXES)) return phases;
  const ordered = [...phases].sort((a, b) => (a.startYear ?? -9999) - (b.startYear ?? -9999));
  const axes: PersonPhase['axes'] = {};
  for (const p of ordered) for (const axis of OCTAGON_AXES) if (p.axes[axis]) axes[axis] = p.axes[axis];
  const starts = ordered.map((p) => p.startYear).filter((y): y is number => y != null);
  const last = ordered.at(-1)!;
  const named = ordered.map((p) => `${p.label}${phaseYears(p) ? ` (${phaseYears(p)})` : ''}`);
  return [
    {
      origin: 'hand',
      label: 'Overview',
      startYear: starts.length ? Math.min(...starts) : null,
      endYear: last.endYear,
      summary: `Each axis from the most recent phase that scored it. Phases: ${named.join('; ')}.`,
      axes,
    },
  ];
}

export type OctagonPoint = { axis: OctagonAxis; x: number; y: number; score: number | null; labelX: number; labelY: number; anchor: 'start' | 'middle' | 'end' };

// The chart's geometry in a (size x size) box: where each axis ends, where its
// score falls (null for an axis with no evidence, which is a gap, not zero),
// and where its label sits. The first axis points straight up and the rest
// follow clockwise at 45 degrees; a score of 5 reaches `radius`.
export function octagonPoints(
  axes: Partial<Record<OctagonAxis, { score: number }>>,
  size = 240,
  radius = 78,
  labelOffset = 14,
): OctagonPoint[] {
  const c = size / 2;
  return OCTAGON_AXES.map((axis, i) => {
    const angle = (-90 + i * 45) * (Math.PI / 180);
    const score = axes[axis]?.score;
    const r = typeof score === 'number' ? (Math.min(5, Math.max(0, score)) / 5) * radius : 0;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const round = (n: number) => Math.round(n * 100) / 100;
    return {
      axis,
      x: round(c + r * cos),
      y: round(c + r * sin),
      score: typeof score === 'number' ? score : null,
      labelX: round(c + (radius + labelOffset) * cos),
      labelY: round(c + (radius + labelOffset) * sin + 3),
      anchor: Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end',
    };
  });
}

// The ring at a score of `level` (1..5) as an SVG polygon "x,y x,y ...".
export function octagonRing(level: number, size = 240, radius = 78): string {
  const c = size / 2;
  const r = (level / 5) * radius;
  return OCTAGON_AXES.map((_, i) => {
    const a = (-90 + i * 45) * (Math.PI / 180);
    return `${Math.round((c + r * Math.cos(a)) * 100) / 100},${Math.round((c + r * Math.sin(a)) * 100) / 100}`;
  }).join(' ');
}

// ---- The generated overview radar --------------------------------------
//
// Every person's radar is backed by their wiki: when it is compiled, an
// "Overview" phase is generated from what is documented about them, each axis
// by a written rule and with the source it rests on. An axis nothing
// documents is left out - a gap, never a guess - so the shape is as complete
// as the record. Four axes can be generated mechanically:
//   position   the scope of the office or role held (ROLE_POSITION)
//   wealth     the latest documented year's income against the IRS's
//              percentiles (INCOME_SPLITS); a net worth is not generated
//   education  the highest degree Wikidata records (educationLevelOf)
//   misconduct the reviewed legal record, as the misconduct meter reads it
// Standing, health, social good and economic good need research, and are set
// by hand through the wiki's update API.

// Where a role sits on the position rubric: 5 head of state or government,
// 4 a statewide or national-level office, 3 a senior manager or legislator.
// Roles that say nothing about scope (business, sports...) are left out.
export const ROLE_POSITION: Partial<Record<PersonRole, { score: number; rule: string }>> = {
  president: { score: 5, rule: 'head of state and government' },
  'vice-president': { score: 4.5, rule: 'second-highest national office, one step from head of state' },
  cabinet: { score: 4, rule: 'a national-level executive office' },
  senator: { score: 4, rule: 'a national-level, statewide office' },
  governor: { score: 4, rule: 'a statewide executive office' },
  representative: { score: 3, rule: 'a national legislator for a district' },
  politician: { score: 3, rule: 'a senior political role' },
};

// The lowest adjusted gross income (US dollars, tax year 2022) in each IRS
// percentile of returns, as the Tax Foundation tabulates the IRS's Statistics
// of Income. A year's income at or above a split point scores that much; the
// scale tops out at 4 (the top 1%): a finer top needs net worth, which is not
// generated.
export const INCOME_SPLITS = [
  { min: 663_164, score: 4, label: 'top 1%' },
  { min: 261_591, score: 3, label: 'top 5%' },
  { min: 178_611, score: 2.5, label: 'top 10%' },
  { min: 99_857, score: 2, label: 'top 25%' },
  { min: 50_339, score: 1.5, label: 'top 50%' },
] as const;
export const INCOME_SOURCE = 'https://taxfoundation.org/data/all/federal/latest-federal-income-tax-data-2025/';

// "$174,000" in the thresholds' terms: below the median is 1.
export function incomeScore(amount: number): { score: number; label: string } {
  const split = INCOME_SPLITS.find((s) => amount >= s.min);
  return split ? { score: split.score, label: split.label } : { score: 1, label: 'below the median' };
}

// A degree's name on the education scale: 5 a research doctorate, 4 a
// master's or a professional degree (J.D., M.D.), 3 a bachelor's, 2 an
// associate degree. Null for a name that is none of those.
export function educationLevelOf(degree: string): number | null {
  const d = degree.toLowerCase();
  if (/\bph\.?\s?d\b|doctor of philosophy|\bd\.?\s?phil\b|\bed\.?\s?d\b|doctor of (science|education|public|engineering|theology|ministry|business)/.test(d)) return 5;
  if (/juris doctor|\bj\.?\s?d\b|\bm\.?\s?d\b|doctor of (medicine|dental|osteopathic|veterinary|pharmacy|law)|\bll\.?\s?[bm]\b|bachelor of laws|master|\bm\.?\s?b\.?\s?a\b|\bm\.?\s?[ap]\.?\s?[ap]?\b|\bm\.?\s?s\b|\bm\.?\s?sc\b|\bm\.?\s?ed\b|\bm\.?\s?f\.?\s?a\b|\bm\.?\s?div\b/.test(d)) return 4;
  if (/bachelor|\bb\.?\s?a\b|\bb\.?\s?s\b|\bb\.?\s?sc\b|\ba\.?\s?b\b|\bb\.?\s?b\.?\s?a\b|\bb\.?\s?f\.?\s?a\b|\bb\.?\s?e\b/.test(d)) return 3;
  if (/associate/.test(d)) return 2;
  return null;
}

// How the reviewed legal record reads on the 0..5 misconduct axis: 0 none
// documented, 1 only matters resolved in their favour, 2 one open matter, 3 one
// finding, 4 two or three, 5 four or more. Not generated for a person whose
// record nobody has reviewed.
export function misconductAxis(matters: Pick<PersonMatter, 'status'>[], checked: string | null | undefined): number | null {
  const meter = misconductMeter(matters, checked);
  if (!meter) return null;
  if (meter.findings >= 4) return 5;
  if (meter.findings >= 2) return 4;
  if (meter.findings === 1) return 3;
  if (meter.open > 0) return 2;
  return meter.resolved > 0 ? 1 : 0;
}

const confidence = (c: ImpactConfidence): ImpactConfidence => c;

// The Overview phase generated from a profile's documented data, or null
// when nothing at all can be generated. Each axis carries the rule that gave
// its score and the URL of what it was read from, so it is checkable.
export function generateOverview(
  p: Pick<PersonProfile, 'role' | 'office' | 'earnings' | 'matters' | 'mattersCheckedDate' | 'wikiUrl' | 'bioguideId' | 'educationLevel' | 'educationNote' | 'educationSourceUrl'>,
): PersonPhase | null {
  const axes: PersonPhase['axes'] = {};
  const biography = p.bioguideId && /^[A-Z]\d{6}$/.test(p.bioguideId) ? `https://bioguide.congress.gov/search/bio/${p.bioguideId}` : p.wikiUrl;

  const position = ROLE_POSITION[p.role];
  if (position && biography && safeUrl(biography)) {
    axes.position = {
      score: position.score,
      basis: `${p.office ?? p.role}: ${position.rule}.`,
      evidenceUrl: biography,
      confidence: confidence('high'),
    };
  }

  // The latest year with a documented total, in dollars only.
  const years = earningYears(p.earnings.filter((e) => e.currency === 'USD' && !e.kind.includes('pension')));
  const latest = years[0];
  if (latest) {
    const amount = latest.exact ? latest.high : (latest.low + latest.high) / 2;
    const { score, label } = incomeScore(amount);
    const source = latest.lines.find((l) => safeUrl(l.sourceUrl))?.sourceUrl;
    if (source) {
      axes.wealth = {
        score,
        basis: `Documented income of ${formatMoney('en-US', amount, 'USD')} in ${latest.year} is ${label === 'below the median' ? label : `in the ${label}`} of US returns by adjusted gross income (IRS, tax year 2022, as tabulated by the Tax Foundation). Income, not net worth.`,
        evidenceUrl: source,
        confidence: confidence(latest.exact ? 'medium' : 'low'),
      };
    }
  }

  if (p.educationLevel != null && p.educationSourceUrl && safeUrl(p.educationSourceUrl)) {
    axes.education = {
      score: p.educationLevel,
      basis: p.educationNote ? `Highest recorded degree: ${p.educationNote}.` : 'Highest recorded degree.',
      evidenceUrl: p.educationSourceUrl,
      confidence: confidence('medium'),
    };
  }

  const misconduct = misconductAxis(p.matters, p.mattersCheckedDate);
  const matterSource = p.matters.map((m) => m.sourceUrl).find((u) => safeUrl(u));
  if (misconduct != null && (matterSource || biography)) {
    axes.misconduct = {
      score: misconduct,
      basis: p.matters.length ? `${p.matters.length} documented matter(s) in the reviewed legal record, counted as the misconduct meter counts them.` : 'No matter documented by a court, regulator or ethics body in the reviewed record.',
      evidenceUrl: (matterSource ?? biography)!,
      confidence: confidence(p.matters.length ? 'high' : 'low'),
    };
  }

  if (!Object.keys(axes).length) return null;
  return { origin: 'generated', label: 'Overview', startYear: null, endYear: null, summary: 'Generated from documented data: the office held, income against IRS percentiles, the highest recorded degree, and the reviewed legal record. Axes with no documented evidence are left out.', axes };
}
