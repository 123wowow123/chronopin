import { describe, expect, it } from 'vitest';
import { projectFromTitle, projectTiles, type PinProjectJson } from './projectSpecs';

describe('projectFromTitle', () => {
  it('reads counts attached to a noun', () => {
    expect(projectFromTitle('Plans Reported for 600-Unit Housing at Garfield')).toEqual({ units: 600 });
    expect(projectFromTitle("Diriyah's 20,000-Seat Arena")).toEqual({ seats: 20000 });
    expect(projectFromTitle('Opens in Frisco With a 300-Room Hotel')).toEqual({ rooms: 300 });
    expect(projectFromTitle('Imani Village Opens 74 Homes')).toEqual({ units: 74 });
  });
  it('ignores prices and unrelated numbers', () => {
    expect(projectFromTitle('Target Lowers Prices on 2,000 Home Items')).toEqual({});
  });
});

describe('projectTiles', () => {
  const base: PinProjectJson = { units: null, affordableUnits: null, rooms: null, seats: null, beds: null, stories: null, sqft: null, acres: null, parking: null, parkAcres: null, source: 'hand', basis: null, sourceUrl: null, note: null, checkedAt: '' };
  it('shows the affordable share under the homes tile', () => {
    const [t] = projectTiles({ ...base, units: 600, affordableUnits: 150 });
    expect(t.value).toBe('600');
    expect(t.sub).toBe('150 affordable (25%)');
  });
  it('skips absent figures', () => expect(projectTiles(base)).toEqual([]));
});
