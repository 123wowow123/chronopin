import { describe, expect, it } from 'vitest';
import { searchName, townOf } from './resolve';

describe('searchName', () => {
  it('takes the restaurant out of an event title', () => {
    expect(searchName({ title: 'Mikiya Wagyu Shabu House Opens on Convoy Street', company: 'Chubby Group' })).toBe(
      'Mikiya Wagyu Shabu House',
    );
    expect(searchName({ title: 'Noma Reopens on Its Urban Farm Site', company: 'Noma' })).toBe('Noma');
  });

  it('prefers the company when the title opens with a person, not the venue', () => {
    // "Wolfgang Puck" resolved to CUT Beverly Hills - another of his
    // restaurants - and "Alice Waters" searched for the chef herself. Both are
    // caught because the company name is present in the title.
    expect(searchName({ title: 'Wolfgang Puck Opens the First Spago on the Sunset Strip', company: 'Spago' })).toBe('Spago');
    expect(searchName({ title: 'Alice Waters Opens Chez Panisse in Berkeley', company: 'Chez Panisse' })).toBe('Chez Panisse');
  });

  it('keeps the title when the company is the operator, not the venue', () => {
    // "Chubby Group" is nowhere in the title, so the title holds the venue.
    expect(searchName({ title: 'Chubby Cattle Takes Over Mira Mesa\'s Former Red Lobster', company: 'Chubby Group' })).toBe(
      'Chubby Cattle',
    );
  });

  it('keeps the title when it and the company are the same venue', () => {
    expect(searchName({ title: 'The Ledbury Reopens in Notting Hill', company: 'The Ledbury' })).toBe('The Ledbury');
  });

  it('falls back to the company when no event verb is there to cut at', () => {
    expect(searchName({ title: 'Somewhere Entirely Unparseable', company: 'Odette' })).toBe('Odette');
  });

  it('manages with no company at all', () => {
    expect(searchName({ title: 'Alinea Opens in Chicago', company: null })).toBe('Alinea');
  });
});

describe('townOf', () => {
  it('takes the town and country out of an address label', () => {
    expect(townOf('2184 Creek Street, Yountville, Napa County, California 94599, United States')).toBe(
      'Yountville, United States',
    );
  });

  it('is null when there is nothing to narrow with', () => {
    expect(townOf(null)).toBeNull();
    expect(townOf('Somewhere')).toBeNull();
  });
});
