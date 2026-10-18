import { describe, expect, it } from 'vitest';
import { openFromHours, readPlace, readPlaceId } from './placeScrape';

// Wording and layout taken from real Maps panels captured 2026-09-21.
describe('readPlace', () => {
  it('reads the name, rating and hours off the panel', () => {
    const out = readPlace({
      labels: ['4.6 stars ', 'Write a review'],
      text: "The French Laundry\n4.6\n(2,275)\nFrench restaurant\nOpen · Closes 8 PM\n6640 Washington St\n(707) 944-2380\n",
      heading: 'The French Laundry',
    });
    expect(out).toMatchObject({ name: 'The French Laundry', rating: 4.6, hours: 'Open · Closes 8 PM' });
  });

  // Not an oversight: the panel's count could never be told from a
  // neighbour's or a sub-rating's, so the scrape reports none at all. See the
  // comment in placeScrape.ts for the four rules that were tried and failed.
  it('never reports a rating count, however inviting the page looks', () => {
    expect(
      readPlace({ labels: ['4.6 stars '], text: 'Somewhere\n4.6\n(2,275)\n', heading: 'Somewhere' }).ratingCount,
    ).toBeNull();
  });






  it('is all nulls for a panel with no rating, rather than guessing', () => {
    const out = readPlace({ labels: ['Write a review'], text: 'A New Place\nOpening soon\n', heading: 'A New Place' });
    expect(out).toMatchObject({ name: 'A New Place', rating: null, ratingCount: null });
  });

  it('takes the rating from the aria-label, which outlives the markup', () => {
    expect(readPlace({ labels: ['4.0 stars '], text: 'x', heading: 'x' }).rating).toBe(4);
  });
});

describe('openFromHours', () => {
  it("reads Google's wording as open or shut", () => {
    expect(openFromHours('Open · Closes 8 PM')).toBe(true);
    expect(openFromHours('Closes 11 PM')).toBe(true);
    expect(openFromHours('Closed · Opens 5 PM Thu')).toBe(false);
    expect(openFromHours('Opens 5 PM')).toBe(false);
    expect(openFromHours('Permanently closed')).toBe(false);
    expect(openFromHours('Temporarily closed')).toBe(false);
  });

  it('says nothing when the page said nothing', () => {
    expect(openFromHours(null)).toBeNull();
    expect(openFromHours('')).toBeNull();
    expect(openFromHours('French restaurant')).toBeNull();
  });
});

describe('readPlaceId', () => {
  it('reads the id and a real address', () => {
    const body = `)]}'\n[["Noma Copenhagen",[[null,null,"ChIJpYCQZztTUkYRFOE368Xs6kI",null,[null,"Refshalevej 96, 1432 København, Denmark"]]]]]`;
    expect(readPlaceId(body)).toMatchObject({ placeId: 'ChIJpYCQZztTUkYRFOE368Xs6kI', address: 'Refshalevej 96, 1432 København, Denmark' });
  });

  // The Chimelong case: the payload carries review prose, and a pattern loose
  // enough for a number-last European address matched a whole sentence.
  it('does not mistake review prose for an address', () => {
    const body = `)]}'\n[["Chimelong",[[null,null,"ChIJh6ZZonVxATQR5UQ_YqC0978",null,["I loved it so much. Really so much fun packed into 1 day, and the waits were short"]]]]]`;
    const out = readPlaceId(body);
    expect(out?.placeId).toBe('ChIJh6ZZonVxATQR5UQ_YqC0978');
    expect(out?.address).toBeNull();
  });

  // Magic Kingdom's payload offered "Aug 20, 2026" where an address goes.
  it('does not mistake a date for an address', () => {
    const body = `)]}'\n[["Magic Kingdom",[[null,null,"ChIJgUulalN-3YgRGoTaWM2LawY",null,["Aug 20, 2026"]]]]]`;
    expect(readPlaceId(body)?.address).toBeNull();
  });

  it('is null when there is no place id at all', () => {
    expect(readPlaceId(')]}\'\n[["nothing here"]]')).toBeNull();
  });
});
