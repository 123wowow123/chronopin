// A dam project's headline figures (PinDam, 0254): height, crest, storage, capacity.
export type DamBasis = 'published' | 'planned' | 'reported';
export const DAM_BASES: readonly DamBasis[] = ['published', 'planned', 'reported'];
export const DAM_TYPES = ['embankment', 'concrete', 'rcc', 'rockfill', 'earthfill', 'gravity', 'arch', 'other'] as const;
export type DamType = (typeof DAM_TYPES)[number];
export const DAM_SCOPES = ['new', 'raise', 'safety', 'outlet', 'storage'] as const;
export type DamScope = (typeof DAM_SCOPES)[number];

export type PinDamJson = {
  heightFt: number | null;
  crestLengthFt: number | null;
  storageAcreFt: number | null;
  addedStorageAcreFt: number | null;
  capacityMw: number | null;
  damType: DamType | null;
  river: string | null;
  owner: string | null;
  state: string | null;
  scope: DamScope | null;
  basis: DamBasis | null;
  sourceUrl: string | null;
  note: string | null;
  checkedAt: string;
};

export const DAM_TYPE_WORDS: Record<DamType, string> = {
  embankment: 'Embankment', concrete: 'Concrete', rcc: 'Roller-compacted concrete', rockfill: 'Rockfill',
  earthfill: 'Earthfill', gravity: 'Concrete gravity', arch: 'Arch', other: 'Other',
};
export const DAM_SCOPE_WORDS: Record<DamScope, string> = {
  new: 'New dam', raise: 'Dam raise', safety: 'Dam safety retrofit', outlet: 'Outlet / fish passage / gates', storage: 'Pumped storage',
};
export const DAM_BASIS_WORDS: Record<DamBasis, string> = {
  published: 'stated by the source', planned: 'planned design figure', reported: 'press-reported figure',
};

const n = (v: number) => Math.round(v).toLocaleString('en-US');
const d1 = (v: number) => (Math.round(v * 10) / 10).toLocaleString('en-US');

// Acre-feet read as the way water agencies say it: "1.5M acre-ft", "77,000 acre-ft".
export function acreFeet(v: number): string {
  return v >= 1_000_000 ? `${d1(v / 1_000_000)}M acre-ft` : `${n(v)} acre-ft`;
}

export type DamTile = { key: string; label: string; value: string; sub: string | null; dot: string };

export function damTiles(p: PinDamJson): DamTile[] {
  const tiles: DamTile[] = [];
  if (p.heightFt != null) tiles.push({ key: 'height', label: 'Dam height', value: `${d1(p.heightFt)} ft`, sub: `${d1(p.heightFt * 0.3048)} m`, dot: 'bg-amber-400' });
  if (p.crestLengthFt != null) tiles.push({ key: 'crest', label: 'Crest length', value: `${n(p.crestLengthFt)} ft`, sub: `${n(p.crestLengthFt * 0.3048)} m`, dot: 'bg-slate-400' });
  if (p.storageAcreFt != null) tiles.push({ key: 'storage', label: 'Reservoir storage', value: acreFeet(p.storageAcreFt), sub: `${d1((p.storageAcreFt * 325_851) / 1e9)} billion gal`, dot: 'bg-sky-400' });
  if (p.addedStorageAcreFt != null) tiles.push({ key: 'added', label: 'Added storage', value: acreFeet(p.addedStorageAcreFt), sub: 'new capacity', dot: 'bg-cyan-400' });
  if (p.capacityMw != null) tiles.push({ key: 'mw', label: 'Capacity', value: `${n(p.capacityMw)} MW`, sub: 'generation / pumped storage', dot: 'bg-emerald-400' });
  if (p.damType) tiles.push({ key: 'type', label: 'Dam type', value: DAM_TYPE_WORDS[p.damType], sub: p.scope ? DAM_SCOPE_WORDS[p.scope] : null, dot: 'bg-violet-400' });
  else if (p.scope) tiles.push({ key: 'scope', label: 'Work', value: DAM_SCOPE_WORDS[p.scope], sub: null, dot: 'bg-violet-400' });
  if (p.river) tiles.push({ key: 'river', label: 'River', value: p.river, sub: p.state, dot: 'bg-blue-400' });
  if (p.owner) tiles.push({ key: 'owner', label: 'Owner', value: p.owner, sub: null, dot: 'bg-rose-400' });
  return tiles;
}

// ---- aggregates (the /dams stats panel and map) -----------------------------------------
export type DamRow = {
  id: number; title: string; href: string; state: string | null; status: string | null; scope: DamScope | null;
  heightFt: number | null; storageAcreFt: number | null; addedStorageAcreFt: number | null; capacityMw: number | null;
  price: number | null; priceCurrency: string | null; lat: number | null; lon: number | null; start: string | null; end: string | null;
};
export type StateAgg = { state: string; count: number; costUsd: number; storageAcreFt: number; addedStorageAcreFt: number; capacityMw: number; lat: number; lon: number };
export type DamTotals = {
  count: number; costUsd: number; pricedCount: number; storageAcreFt: number; addedStorageAcreFt: number; capacityMw: number;
  tallestFt: number | null; tallestId: number | null; states: number; byStatus: Record<string, number>; byScope: Record<string, number>;
};

// Cost is summed only for USD prices (no FX conversion, per the construction rules).
export function aggregateDams(rows: DamRow[]): { totals: DamTotals; byState: StateAgg[] } {
  const totals: DamTotals = { count: rows.length, costUsd: 0, pricedCount: 0, storageAcreFt: 0, addedStorageAcreFt: 0, capacityMw: 0, tallestFt: null, tallestId: null, states: 0, byStatus: {}, byScope: {} };
  const states = new Map<string, StateAgg & { latSum: number; lonSum: number; located: number }>();
  for (const r of rows) {
    const usd = r.price != null && r.priceCurrency === 'USD' ? r.price : 0;
    if (usd > 0) { totals.costUsd += usd; totals.pricedCount++; }
    totals.storageAcreFt += r.storageAcreFt ?? 0;
    totals.addedStorageAcreFt += r.addedStorageAcreFt ?? 0;
    totals.capacityMw += r.capacityMw ?? 0;
    if (r.heightFt != null && (totals.tallestFt == null || r.heightFt > totals.tallestFt)) { totals.tallestFt = r.heightFt; totals.tallestId = r.id; }
    const status = r.status ?? 'No status tag';
    totals.byStatus[status] = (totals.byStatus[status] ?? 0) + 1;
    if (r.scope) totals.byScope[r.scope] = (totals.byScope[r.scope] ?? 0) + 1;
    if (!r.state) continue;
    let s = states.get(r.state);
    if (!s) { s = { state: r.state, count: 0, costUsd: 0, storageAcreFt: 0, addedStorageAcreFt: 0, capacityMw: 0, lat: 0, lon: 0, latSum: 0, lonSum: 0, located: 0 }; states.set(r.state, s); }
    s.count++; s.costUsd += usd; s.storageAcreFt += r.storageAcreFt ?? 0; s.addedStorageAcreFt += r.addedStorageAcreFt ?? 0; s.capacityMw += r.capacityMw ?? 0;
    if (r.lat != null && r.lon != null) { s.latSum += r.lat; s.lonSum += r.lon; s.located++; }
  }
  totals.states = states.size;
  const byState = [...states.values()]
    .filter((s) => s.located > 0)
    .map(({ latSum, lonSum, located, ...s }) => ({ ...s, lat: latSum / located, lon: lonSum / located }))
    .sort((a, b) => b.costUsd - a.costUsd || b.count - a.count || a.state.localeCompare(b.state));
  return { totals, byState };
}

export function usdShort(v: number): string {
  if (v >= 1e9) return `$${d1(v / 1e9)}B`;
  if (v >= 1e6) return `$${n(v / 1e6)}M`;
  return `$${n(v)}`;
}
