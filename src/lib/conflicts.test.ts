import { describe, expect, it } from 'vitest';
import { committeeSectors, sectorOfName, sectorOfSic } from './conflicts';

describe('sectorOfSic', () => {
  it('maps SIC codes to sectors, narrow ranges first', () => {
    expect(sectorOfSic(3721)).toBe('defense'); // aircraft
    expect(sectorOfSic(2834)).toBe('healthcare'); // pharmaceutical preparations
    expect(sectorOfSic(1311)).toBe('energy'); // crude petroleum
    expect(sectorOfSic(3674)).toBe('tech'); // semiconductors
    expect(sectorOfSic(6770)).toBe('finance'); // blank check, inside the real estate range
    expect(sectorOfSic(6798)).toBe('realestate'); // REIT
    expect(sectorOfSic(1)).toBeNull();
  });
});

describe('committeeSectors', () => {
  it('gives a full committee its sectors and a subcommittee its own subject or its parent’s', () => {
    expect(committeeSectors('HSAS', 'House Committee on Armed Services')).toEqual(['defense']);
    expect(committeeSectors('HSIF14', 'Health')).toEqual(['healthcare']);
    expect(committeeSectors('HSIF16', 'Something Else')).toContain('telecom');
    expect(committeeSectors('HSAP02', 'Defense')).toEqual(['defense']);
    expect(committeeSectors('HSAP', 'Appropriations')).toEqual([]);
  });
});

describe('sectorOfName', () => {
  it('classifies funds, bonds and stocks by name; broad-market funds have none', () => {
    expect(sectorOfName('US Treasury Note 11/15/2029')).toBe('finance');
    expect(sectorOfName('iShares US Technology ETF (IYW)')).toBe('tech');
    expect(sectorOfName('Lincoln Electric Holdings, Inc.')).not.toBe('utilities');
    expect(sectorOfName('SPDR S&P 500 (SPY)')).toBeNull();
  });
});
