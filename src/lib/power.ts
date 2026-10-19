// A pin's electrical capacity (PinPower, 0196).
export type PinPowerJson = {
  megawatts: number;
  source: 'title' | 'hand';
  sourceUrl: string | null;
  note: string | null;
  checkedAt: string;
};

// 500 -> "500 MW", 1500 -> "1.5 GW".
export function formatMegawatts(mw: number): string {
  return mw >= 1000 ? `${(Math.round(mw / 10) / 100).toLocaleString('en-US')} GW` : `${(Math.round(mw * 10) / 10).toLocaleString('en-US')} MW`;
}
