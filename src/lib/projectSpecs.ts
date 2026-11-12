// A building project's headline quantities (PinProject, 0249): homes, rooms, seats, height, area, parking.
export type ProjectBasis = 'published' | 'planned' | 'reported';
export const PROJECT_BASES: readonly ProjectBasis[] = ['published', 'planned', 'reported'];

export type PinProjectJson = {
  units: number | null;
  affordableUnits: number | null;
  rooms: number | null;
  seats: number | null;
  beds: number | null;
  stories: number | null;
  sqft: number | null;
  acres: number | null;
  parking: number | null;
  parkAcres: number | null;
  source: 'title' | 'hand';
  basis: ProjectBasis | null;
  sourceUrl: string | null;
  note: string | null;
  checkedAt: string;
};

export const BASIS_WORDS: Record<ProjectBasis, string> = {
  published: 'stated by the source',
  planned: 'planned design figure',
  reported: 'press-reported proposal',
};

export type ProjectTile = { key: string; label: string; value: string; sub: string | null; dot: string };

const n = (v: number) => Math.round(v).toLocaleString('en-US');

// The tiles to show, in a fixed order, skipping figures the pin does not have.
export function projectTiles(p: PinProjectJson): ProjectTile[] {
  const tiles: ProjectTile[] = [];
  if (p.units != null) {
    const share = p.affordableUnits != null ? `${n(p.affordableUnits)} affordable (${Math.round((p.affordableUnits / p.units) * 100)}%)` : null;
    tiles.push({ key: 'units', label: 'Homes', value: n(p.units), sub: share ?? (p.units === 1 ? 'unit' : 'units'), dot: 'bg-emerald-400' });
  } else if (p.affordableUnits != null) {
    tiles.push({ key: 'affordable', label: 'Affordable homes', value: n(p.affordableUnits), sub: 'income-restricted', dot: 'bg-emerald-400' });
  }
  if (p.rooms != null) tiles.push({ key: 'rooms', label: 'Hotel rooms', value: n(p.rooms), sub: 'rooms / keys', dot: 'bg-rose-400' });
  if (p.seats != null) tiles.push({ key: 'seats', label: 'Seats', value: n(p.seats), sub: 'capacity', dot: 'bg-violet-400' });
  if (p.beds != null) tiles.push({ key: 'beds', label: 'Beds', value: n(p.beds), sub: null, dot: 'bg-sky-400' });
  if (p.stories != null) tiles.push({ key: 'stories', label: 'Height', value: `${n(p.stories)} ${p.stories === 1 ? 'story' : 'stories'}`, sub: null, dot: 'bg-amber-400' });
  if (p.sqft != null) tiles.push({ key: 'sqft', label: 'Floor area', value: p.sqft >= 1000 ? `${(Math.round(p.sqft / 100) / 10).toLocaleString('en-US')}K sq ft` : `${n(p.sqft)} sq ft`, sub: p.sqft >= 1000 ? `${n(p.sqft)} sq ft` : null, dot: 'bg-sky-400' });
  if (p.acres != null) tiles.push({ key: 'acres', label: 'Site', value: `${(Math.round(p.acres * 10) / 10).toLocaleString('en-US')} ac`, sub: null, dot: 'bg-lime-400' });
  if (p.parking != null) tiles.push({ key: 'parking', label: 'Parking', value: n(p.parking), sub: 'spaces', dot: 'bg-slate-400' });
  if (p.parkAcres != null) tiles.push({ key: 'parkAcres', label: 'Parks', value: `${(Math.round(p.parkAcres * 10) / 10).toLocaleString('en-US')} ac`, sub: 'of parks', dot: 'bg-green-400' });
  return tiles;
}

// Quantities read off a pin title ("600-Unit Housing", "20,000-Seat Arena", "300-Room Hotel", "74 Homes").
// Conservative: only a count directly attached to a known noun, and never a number that is a sale/price/percent.
const COUNT = '(\\d{1,3}(?:,\\d{3})+|\\d+)';
const RX: [keyof Pick<PinProjectJson, 'units' | 'rooms' | 'seats' | 'beds' | 'stories'>, RegExp][] = [
  ['units', new RegExp(`\\b${COUNT}[- ](?:(?:affordable|new|market-rate|senior|student|rental|luxury)[- ])*(?:units?|apartments?|homes|condos?|condominiums?|townhomes?|townhouses|residences)\\b`, 'i')],
  ['rooms', new RegExp(`\\b${COUNT}[- ](?:rooms?|keys?|suites?)\\b`, 'i')],
  ['seats', new RegExp(`\\b${COUNT}[- ]seat`, 'i')],
  ['beds', new RegExp(`\\b${COUNT}[- ]beds?\\b`, 'i')],
  ['stories', new RegExp(`\\b${COUNT}[- ](?:stor(?:y|ies)|floors?)\\b`, 'i')],
];
export function projectFromTitle(title: string): Partial<Record<'units' | 'rooms' | 'seats' | 'beds' | 'stories', number>> {
  const out: Partial<Record<'units' | 'rooms' | 'seats' | 'beds' | 'stories', number>> = {};
  for (const [key, rx] of RX) {
    const m = rx.exec(title);
    if (!m) continue;
    const v = Number(m[1].replace(/,/g, ''));
    if (v > 0 && v < 1e6) out[key] = v;
  }
  return out;
}
