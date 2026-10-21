import { describe, expect, it } from 'vitest';
import { titlePower } from './power';

describe('titlePower', () => {
  it('reads capacity and kind off a title', () => {
    expect(titlePower('Firefly Clean Solar Center: 402 MW Solar Plant in Lawrence County')).toEqual({ megawatts: 402, kind: 'generation' });
    expect(titlePower('Hoytdale Energy Storage Project: 150 MW BESS in Beaver County')).toEqual({ megawatts: 150, kind: 'storage' });
    expect(titlePower('Taurus Data Center Hub: 116 MW Clean Compute Campus')).toEqual({ megawatts: 116, kind: 'usage' });
    expect(titlePower('Tiwai Point Smelter Line 4 Restart: 50 MW More Power')).toEqual({ megawatts: 50, kind: 'usage' });
  });
  it('prefers MWac over MWdc and ignores MWh', () => {
    expect(titlePower('Atlas Solar VI: 135 MWdc (100 MWac) Solar Phase')).toEqual({ megawatts: 100, kind: 'generation' });
    expect(titlePower('Kay Energy Storage Facility: 50 MW / 200 MWh BESS')).toEqual({ megawatts: 50, kind: 'storage' });
    expect(titlePower('Tesla Reports Q3 Deliveries and 13.7 GWh of Storage')).toBeNull();
  });
  it('treats a clean-energy storage centre as storage and a solar hybrid as generation', () => {
    expect(titlePower('South Platte Clean Energy Storage Center: 250 MW BESS')?.kind).toBe('storage');
    expect(titlePower('Muon Solar & Storage Project: 1,170 MWac Hybrid Center')?.kind).toBe('generation');
  });
  it('skips deals and titles with no capacity', () => {
    expect(titlePower('Tesla and NatPower Sign a 25 GW Megapack Deal')).toBeNull();
    expect(titlePower('A new solar farm opens')).toBeNull();
  });
});
