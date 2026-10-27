import { describe, expect, it } from 'vitest';
import { parseScrapedCompetitors } from './competitors';

describe('parseScrapedCompetitors', () => {
  it('keeps named rivals, drops repeats and junk, and stops at five', () => {
    const rivals = parseScrapedCompetitors([
      { name: ' Airbus A320neo ', maker: 'Airbus', summary: 'Narrowbody rival' },
      { name: 'airbus a320neo' },
      { maker: 'no name' },
      null,
      ...['B', 'C', 'D', 'E', 'F'].map((name) => ({ name })),
    ]);
    expect(rivals.map((r) => r.name)).toEqual(['Airbus A320neo', 'B', 'C', 'D', 'E']);
    expect(rivals[0]).toEqual({ name: 'Airbus A320neo', maker: 'Airbus', summary: 'Narrowbody rival' });
    expect(rivals[1]).toEqual({ name: 'B', maker: null, summary: null });
  });

  it('answers an empty list for anything that is not a list', () => {
    expect(parseScrapedCompetitors(undefined)).toEqual([]);
    expect(parseScrapedCompetitors('Airbus')).toEqual([]);
  });
});
