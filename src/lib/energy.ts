// A pin's annual electricity use (PinEnergy, 0197), in gigawatt-hours.
export type EnergyBasis = 'published' | 'contracted' | 'calculated';

export const ENERGY_BASES: readonly EnergyBasis[] = ['published', 'contracted', 'calculated'];

export type PinEnergyJson = {
  gwh: number;
  basis: EnergyBasis;
  sourceUrl: string | null;
  note: string | null;
  checkedAt: string;
};

// 950 -> "950 GWh", 1800 -> "1.8 TWh", 16000 -> "16 TWh".
export function formatGigawattHours(gwh: number): string {
  return gwh >= 1000 ? `${(Math.round(gwh / 10) / 100).toLocaleString('en-US')} TWh` : `${(Math.round(gwh * 10) / 10).toLocaleString('en-US')} GWh`;
}

// What the basis says about the figure, for the pin page.
export const ENERGY_BASIS_WORDS: Record<EnergyBasis, string> = {
  published: 'a year',
  contracted: 'a year contracted',
  calculated: 'a year at most, calculated from the megawatts',
};
