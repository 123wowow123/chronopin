// A pin's electrical capacity (PinPower, 0196).
// generation: power the facility puts out; usage: power it draws; storage: batteries and the like,
// whose megawatts are charge/discharge rating.
export type PowerKind = 'generation' | 'usage' | 'storage';
export const POWER_KINDS: readonly PowerKind[] = ['generation', 'usage', 'storage'];
export const POWER_KIND_LABEL: Record<PowerKind, string> = { generation: 'Generates', usage: 'Uses', storage: 'Stores' };

export type PinPowerJson = {
  megawatts: number;
  kind: PowerKind;
  source: 'title' | 'hand';
  sourceUrl: string | null;
  note: string | null;
  checkedAt: string;
};

// 500 -> "500 MW", 1500 -> "1.5 GW".
export function formatMegawatts(mw: number): string {
  return mw >= 1000 ? `${(Math.round(mw / 10) / 100).toLocaleString('en-US')} GW` : `${(Math.round(mw * 10) / 10).toLocaleString('en-US')} MW`;
}

// Reading a capacity and a kind off a pin's title ("500 MW", "1,124 MWac", "2.5 GWdc").
// Used for the title backfill and for every pin save that has no PinPower row.
const UNIT = /(\d[\d,]*(?:\.\d+)?)\s?(MW|GW|megawatts?|gigawatts?)(ac|dc|p|e|t)?(?![A-Za-z])/gi;
const NOT_A_FACILITY = /\b(deliver|deal|agree|sign|buy|buys|acquir|stock|shares|order|purchase|PPA|contract)/i;
const DATA_CENTRE = /\b(data ?cent(er|re)s?|AI campus|hyperscale|compute|crypto|bitcoin|mining campus)\b/i;
const USAGE = /\b(smelter|fab|megafab|gigafactory|factory|electrolys|electroliz|charging|steel plant|ammonia|refiner|truck stop)\b/i;
const GENERATION = /\b(solar|wind|nuclear|reactor|SMR|hydro(electric|power)?|geothermal|power ?plant|power station|gas[- ]fired|coal|combined[- ]cycle|turbine|fuel cell|biomass|photovoltaic|generating)\b/i;
// Only a source when no storage word is present ("Clean Energy Storage Center" is a battery).
const WEAK_GENERATION = /\b(energy center|energy complex|clean energy)\b/i;
const STORAGE = /\b(battery|batteries|BESS|energy storage|storage (center|centre|facility|project|system)|pumped storage|megapack)\b/i;

export function capacityMw(title: string): number | null {
  const found = [...title.matchAll(UNIT)].map((m) => {
    const n = Number(m[1].replace(/,/g, ''));
    const giga = /^g/i.test(m[2]);
    return { mw: giga ? n * 1000 : n, dc: /^(dc|p)$/i.test(m[3] ?? '') };
  });
  if (!found.length) return null;
  // 135 MWdc (100 MWac): the AC figure is what reaches the grid.
  const first = found[0];
  return (first.dc ? (found.find((f) => !f.dc) ?? first) : first).mw;
}

export function kindOf(title: string): PowerKind | null {
  if (DATA_CENTRE.test(title) || USAGE.test(title)) return 'usage';
  if (GENERATION.test(title)) return 'generation';
  if (STORAGE.test(title)) return 'storage';
  if (WEAK_GENERATION.test(title)) return 'generation';
  return null;
}

// The capacity and kind a title states, or null when it states none, is not a
// facility (a delivery count, a deal) or cannot be classified.
export function titlePower(title: string): { megawatts: number; kind: PowerKind } | null {
  const megawatts = capacityMw(title);
  const kind = kindOf(title);
  if (!megawatts || !(megawatts > 0) || megawatts >= 10_000_000 || !kind || NOT_A_FACILITY.test(title)) return null;
  return { megawatts, kind };
}
