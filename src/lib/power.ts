// A pin's electrical capacity (PinPower, 0196).
// generation: power the facility puts out; usage: power it draws.
export type PowerKind = 'generation' | 'usage';
export const POWER_KINDS: readonly PowerKind[] = ['generation', 'usage'];
export const POWER_KIND_LABEL: Record<PowerKind, string> = { generation: 'Generates', usage: 'Uses' };

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
