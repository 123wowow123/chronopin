// Reads a person's profile from JSON a person or a script sent
// (PUT /api/people/:id, `npm run people:apply`): every field is
// checked and clamped, so what reaches the table is what the page can render.
// A field that is absent stays absent; a string that is not what it should be
// is dropped rather than stored half-right.

import {
  CONTRIBUTION_KINDS,
  EARNING_KINDS,
  IMPACT_CRITERIA,
  OCTAGON_AXES,
  MATTER_KINDS,
  MATTER_STATUSES,
  PERSON_ROLES,
  PROPERTY_KINDS,
  TRIP_KINDS,
  safeUrl,
  type ContributionKind,
  type ContributionImpact,
  type EarningKind,
  type ImpactConfidence,
  type MatterKind,
  type MatterStatus,
  type OctagonAxis,
  type PersonMatter,
  type PersonPhase,
  type PersonContribution,
  type PersonEarning,
  type PersonProperty,
  type PersonRole,
  type PersonTrip,
  type PropertyKind,
  type TripKind,
} from '@/lib/people';

const MAX_ROWS = 400;

export type PersonInput = {
  name: string;
  role?: PersonRole;
  office?: string | null;
  jurisdiction?: string | null;
  party?: string | null;
  politics?: string | null;
  politicsSourceUrl?: string | null;
  inOfficeSince?: string | null;
  birthDate?: string | null;
  deathDate?: string | null;
  // The day they left the office; null while serving.
  leftOfficeDate?: string | null;
  // The day the record was searched for legal and ethics matters (0155).
  mattersCheckedDate?: string | null;
  // The highest degree held (2..5), what it was, and where it was read (0162).
  educationLevel?: number | null;
  educationNote?: string | null;
  educationSourceUrl?: string | null;
  religion?: string | null;
  religionSourceUrl?: string | null;
  weightKg?: number | null;
  weightAsOf?: string | null;
  weightSourceUrl?: string | null;
  health?: string | null;
  healthAsOf?: string | null;
  healthSourceUrl?: string | null;
  description?: string | null;
  photoUrl?: string | null;
  photoCredit?: string | null;
  wikiUrl?: string | null;
  websiteUrl?: string | null;
  bioguideId?: string | null;
  govtrackId?: number | null;
  wikidataId?: string | null;
  // Present: the list replaces what is stored. Absent: left alone.
  earnings?: PersonEarning[];
  contributions?: (PersonContribution & { origin?: 'congress' | 'wikidata' | 'hand' })[];
  properties?: PersonProperty[];
  trips?: PersonTrip[];
  matters?: PersonMatter[];
  phases?: PersonPhase[];
};

export class PersonInputError extends Error {}

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim().slice(0, max);
  return v || null;
}

// An ISO day that is a real day.
export function day(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]) ? value.trim() : null;
}

const whole = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 1e13 ? Math.round(value) : null;

const oneOf = <T extends string>(list: readonly T[], value: unknown, fallback: T): T => (list.includes(value as T) ? (value as T) : fallback);

function rows<T>(value: unknown, read: (row: Record<string, unknown>) => T | null, what: string): T[] {
  if (!Array.isArray(value)) throw new PersonInputError(`${what} must be an array`);
  if (value.length > MAX_ROWS) throw new PersonInputError(`${what} has more than ${MAX_ROWS} rows`);
  return value.flatMap((row) => {
    const read1 = isRecord(row) ? read(row) : null;
    return read1 ? [read1] : [];
  });
}

const currency = (v: unknown) => (typeof v === 'string' && /^[A-Za-z]{3}$/.test(v) ? v.toUpperCase() : 'USD');

export function readEarning(r: Record<string, unknown>): PersonEarning | null {
  const year = Number(r.year);
  if (!Number.isInteger(year) || year < 1950 || year > 2100) return null;
  const amount = whole(r.amount);
  const amountLow = whole(r.amountLow);
  const amountHigh = whole(r.amountHigh);
  if (amount == null && (amountLow == null || amountHigh == null)) return null;
  const range = amount == null;
  return {
    year,
    kind: oneOf<EarningKind>(EARNING_KINDS, r.kind, 'salary'),
    label: text(r.label, 200) ?? '',
    amount,
    amountLow: range ? Math.min(amountLow!, amountHigh!) : null,
    amountHigh: range ? Math.max(amountLow!, amountHigh!) : null,
    currency: currency(r.currency),
    sourceUrl: safeUrl(text(r.sourceUrl, 2000)),
    note: text(r.note, 1000),
  };
}

// An impact assessment stands only with scores (-2..2 on known criteria), a
// confidence, and an https evidence URL: an assessment without its evidence is
// dropped, never stored as an opinion.
export function readImpact(value: unknown): ContributionImpact | null {
  if (!isRecord(value) || !isRecord(value.scores)) return null;
  const evidenceUrl = safeUrl(text(value.evidenceUrl, 2000));
  const confidence = ['high', 'medium', 'low'].includes(String(value.confidence)) ? (value.confidence as ImpactConfidence) : null;
  if (!evidenceUrl || !confidence) return null;
  const scores: ContributionImpact['scores'] = {};
  for (const criterion of IMPACT_CRITERIA) {
    const v = (value.scores as Record<string, unknown>)[criterion];
    if (typeof v === 'number' && Number.isFinite(v) && v >= -2 && v <= 2) scores[criterion] = Math.round(v * 2) / 2;
  }
  if (!Object.keys(scores).length) return null;
  return { scores, confidence, contested: value.contested === true, basis: text(value.basis, 1000), evidenceUrl, assessedDate: day(value.assessedDate) };
}

export function readContribution(r: Record<string, unknown>): (PersonContribution & { origin: 'congress' | 'wikidata' | 'hand' }) | null {
  const title = text(r.title, 400);
  if (!title) return null;
  const importance = Number(r.importance);
  return {
    kind: oneOf<ContributionKind>(CONTRIBUTION_KINDS, r.kind, 'law'),
    title,
    summary: text(r.summary, 2000),
    role: text(r.role, 16),
    date: day(r.date),
    reference: text(r.reference, 120),
    importance: Number.isInteger(importance) && importance >= 1 && importance <= 5 ? importance : 3,
    sourceUrl: safeUrl(text(r.sourceUrl, 2000)),
    impact: readImpact(r.impact),
    origin: oneOf(['congress', 'wikidata', 'hand'] as const, r.origin, 'hand'),
  };
}

export function readProperty(r: Record<string, unknown>): PersonProperty | null {
  const name = text(r.name, 200);
  if (!name) return null;
  const year = Number(r.acquiredYear);
  return {
    name,
    kind: oneOf<PropertyKind>(PROPERTY_KINDS, r.kind, 'residence'),
    location: text(r.location, 200),
    valueLow: whole(r.valueLow),
    valueHigh: whole(r.valueHigh),
    currency: currency(r.currency),
    acquiredYear: Number.isInteger(year) && year > 1700 && year < 2100 ? year : null,
    asOf: day(r.asOf),
    sourceUrl: safeUrl(text(r.sourceUrl, 2000)),
    note: text(r.note, 1000),
  };
}

export function readTrip(r: Record<string, unknown>): PersonTrip | null {
  const destination = text(r.destination, 200);
  const startDate = day(r.startDate);
  if (!destination || !startDate) return null;
  const endDate = day(r.endDate);
  return {
    destination,
    kind: oneOf<TripKind>(TRIP_KINDS, r.kind, 'leisure'),
    startDate,
    endDate: endDate && endDate >= startDate ? endDate : null,
    sourceUrl: safeUrl(text(r.sourceUrl, 2000)),
    note: text(r.note, 1000),
  };
}

// A legal or ethics matter stands only with a status from the list and an
// https source: a row without either is dropped, never stored half-stated. The
// status is the point - a charge is not a conviction - so there is no default.
export function readMatter(r: Record<string, unknown>): PersonMatter | null {
  const title = text(r.title, 400);
  const sourceUrl = safeUrl(text(r.sourceUrl, 2000));
  if (!title || !sourceUrl || !MATTER_STATUSES.includes(r.status as MatterStatus)) return null;
  const filedDate = day(r.filedDate);
  const resolvedDate = day(r.resolvedDate);
  return {
    kind: oneOf<MatterKind>(MATTER_KINDS, r.kind, 'other'),
    title,
    summary: text(r.summary, 2000),
    status: r.status as MatterStatus,
    authority: text(r.authority, 200),
    filedDate,
    resolvedDate: resolvedDate && (!filedDate || resolvedDate >= filedDate) ? resolvedDate : null,
    penalty: text(r.penalty, 500),
    sourceUrl,
    asOf: day(r.asOf),
  };
}

// A life phase with its octagon: an axis stands only with a score 0..5, a
// confidence and an https evidence URL - the rest are dropped, so the chart
// shows a gap where there is no evidence, never a guess. A phase with no axis
// left is dropped.
export function readPhase(r: Record<string, unknown>): PersonPhase | null {
  const label = text(r.label, 80);
  if (!label || !isRecord(r.axes)) return null;
  const axes: PersonPhase['axes'] = {};
  for (const axis of OCTAGON_AXES) {
    const a = (r.axes as Record<string, unknown>)[axis];
    if (!isRecord(a)) continue;
    const score = a.score;
    const evidenceUrl = safeUrl(text(a.evidenceUrl, 2000));
    const confidence = ['high', 'medium', 'low'].includes(String(a.confidence)) ? (a.confidence as ImpactConfidence) : null;
    if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 5 || !evidenceUrl || !confidence) continue;
    axes[axis as OctagonAxis] = { score: Math.round(score * 2) / 2, basis: text(a.basis, 600), evidenceUrl, confidence };
  }
  if (!Object.keys(axes).length) return null;
  const year = (v: unknown) => (Number.isInteger(Number(v)) && Number(v) >= 1500 && Number(v) <= 2200 && v !== null && v !== '' ? Number(v) : null);
  const startYear = year(r.startYear);
  const endYear = year(r.endYear);
  return { label, startYear, endYear: startYear != null && endYear != null && endYear < startYear ? null : endYear, summary: text(r.summary, 600), axes };
}


// Wikipedia's REST thumbnail URLs end in "?utm_source=...". Pasted into a
// Special:FilePath URL the query becomes part of the file name and Commons
// answers 404, so a picture that exists shows no thumb. Keep the bare file name.
export function commonsFileUrl(url: string | null): string | null {
  const m = url?.match(/^(https:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\/)([^?]*?)((?:%3F|\?).*)?$/i);
  if (!m || !m[3]) return url;
  const width = url!.match(/[?&]width=(\d+)\s*$/)?.[1] ?? '480';
  return `${m[1]}${m[2]}?width=${width}`;
}

// "File:Name.jpg?utm_source=..." -> "File:Name.jpg".
function stripQuery(credit: string | null): string | null {
  return credit ? credit.replace(/\?utm_[^\s]*$/, '') : credit;
}

export function readPerson(body: unknown): PersonInput {
  if (!isRecord(body)) throw new PersonInputError('Expected a JSON object');
  const name = text(body.name, 200);
  if (!name) throw new PersonInputError('A person needs a name');
  const weight = typeof body.weightKg === 'number' && Number.isFinite(body.weightKg) ? body.weightKg : null;
  const govtrack = Number(body.govtrackId);
  const out: PersonInput = {
    name,
    role: PERSON_ROLES.includes(body.role as PersonRole) ? (body.role as PersonRole) : undefined,
    office: text(body.office, 200),
    jurisdiction: text(body.jurisdiction, 120),
    party: text(body.party, 80),
    politics: text(body.politics, 2000),
    politicsSourceUrl: safeUrl(text(body.politicsSourceUrl, 2000)),
    inOfficeSince: day(body.inOfficeSince),
    birthDate: day(body.birthDate),
    deathDate: day(body.deathDate),
    leftOfficeDate: day(body.leftOfficeDate),
    mattersCheckedDate: day(body.mattersCheckedDate),
    // A degree is stored only with the page it was read from.
    educationLevel:
      typeof body.educationLevel === 'number' && body.educationLevel >= 1 && body.educationLevel <= 5 && safeUrl(text(body.educationSourceUrl, 2000))
        ? Math.round(body.educationLevel * 2) / 2
        : null,
    educationNote: text(body.educationNote, 300),
    educationSourceUrl: safeUrl(text(body.educationSourceUrl, 2000)),
    religion: text(body.religion, 120),
    religionSourceUrl: safeUrl(text(body.religionSourceUrl, 2000)),
    // A weight is a figure someone published: it must come with where, and
    // with a day, or it is not stored.
    weightKg: weight != null && weight >= 25 && weight <= 400 && safeUrl(text(body.weightSourceUrl, 2000)) ? Math.round(weight * 10) / 10 : null,
    weightAsOf: day(body.weightAsOf),
    weightSourceUrl: safeUrl(text(body.weightSourceUrl, 2000)),
    health: text(body.health, 2000),
    healthAsOf: day(body.healthAsOf),
    healthSourceUrl: safeUrl(text(body.healthSourceUrl, 2000)),
    description: text(body.description, 4000),
    photoUrl: commonsFileUrl(safeUrl(text(body.photoUrl, 2000))),
    photoCredit: stripQuery(text(body.photoCredit, 300)),
    wikiUrl: safeUrl(text(body.wikiUrl, 2000)),
    websiteUrl: safeUrl(text(body.websiteUrl, 2000)),
    bioguideId: text(body.bioguideId, 12),
    govtrackId: Number.isInteger(govtrack) && govtrack > 0 ? govtrack : null,
    wikidataId: /^Q\d{1,12}$/.test(String(body.wikidataId ?? '')) ? String(body.wikidataId) : null,
  };
  // Health and religion are sensitive claims: each is stored only with its
  // source, so a reader can see who said it and a correction knows what to
  // check.
  if (!out.healthSourceUrl) {
    out.health = null;
    out.healthAsOf = null;
  }
  if (!out.religionSourceUrl) out.religion = null;
  if (body.earnings !== undefined) out.earnings = rows(body.earnings, readEarning, 'earnings');
  if (body.contributions !== undefined) out.contributions = rows(body.contributions, readContribution, 'contributions');
  if (body.properties !== undefined) out.properties = rows(body.properties, readProperty, 'properties');
  if (body.trips !== undefined) out.trips = rows(body.trips, readTrip, 'trips');
  if (body.matters !== undefined) out.matters = rows(body.matters, readMatter, 'matters');
  if (body.phases !== undefined) out.phases = rows(body.phases, readPhase, 'phases');
  return out;
}
