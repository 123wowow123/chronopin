import { describe, expect, it } from 'vitest';
import { openFromHours, readPlace, readPlaceId } from './placeScrape';

// Wording and layout taken from real Maps panels captured 2026-09-21.
describe('readPlace', () => {
  it('reads the name, rating, count and hours off the panel', () => {
    const out = readPlace({
      labels: ['4.6 stars ', 'Write a review'],
      text: "The French Laundry\n4.6\n(2,275)\nFrench restaurant\nOpen · Closes 8 PM\n6640 Washington St\n(707) 944-2380\n",
      heading: 'The French Laundry',
    });
    expect(out).toMatchObject({ name: 'The French Laundry', rating: 4.6, ratingCount: 2275, hours: 'Open · Closes 8 PM' });
  });

  // The bug the first real dry run caught: the phone number's area code was
  // read as the rating count, so the pin claimed 707 ratings.
  it('does not read a phone area code as the rating count', () => {
    const out = readPlace({
      labels: ['4.6 stars '],
      text: "The French Laundry\n(707) 944-2380\n4.6\n(2,275)\nOpen · Closes 8 PM\n",
      heading: 'The French Laundry',
    });
    expect(out.ratingCount).toBe(2275);
  });

  // Galaxy's Edge read 685, 685, then 42: some renders carry a second
  // "4.8 (42)" block and the first pair in the text is the wrong one.
  it('takes the largest matching pair, not the first', () => {
    const out = readPlace({
      labels: ['4.8 stars '],
      text: "Star Wars: Galaxy's Edge\n4.8\n(42)\nTheme park\n4.8\n(685)\nOpen · Closes 12 AM\n",
      heading: "Star Wars: Galaxy's Edge",
    });
    expect(out.ratingCount).toBe(685);
  });

  it('leaves the count null when no number sits with the rating', () => {
    const out = readPlace({ labels: ['4.5 stars '], text: 'Somewhere\n4.5\nDeli\n(707) 944-2380\n', heading: 'Somewhere' });
    expect(out.rating).toBe(4.5);
    expect(out.ratingCount).toBeNull();
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
