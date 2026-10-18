import { describe, expect, it } from 'vitest';
import { cleanDetails, countTurns, listingHref, listingKindOf, listingProblem, ratingProblem, storedTitle, type ListingInput } from './listings';

const place = { latitude: 32.72, longitude: -117.16, name: 'San Diego' };
const item = (patch: Partial<ListingInput> = {}): ListingInput => ({
  title: 'Nike Air Max 95',
  price: 170,
  description: '',
  details: { category: 'mensClothing', condition: 'likeNew' },
  photos: ['listing/1-a.jpg'],
  video: null,
  location: place,
  ...patch,
});

describe('listingKindOf', () => {
  it('sells a pin as its product, by the pin’s category', () => {
    expect(listingKindOf({ productName: 'Nike Air Max 95', categories: ['Fashion'] })).toBe('item');
    expect(listingKindOf({ productName: 'Tesla Model Y', categories: ['Automotive', 'Energy'] })).toBe('vehicle');
    expect(listingKindOf({ productName: 'Aman Residences', categories: ['Property'] })).toBe('home');
    expect(listingKindOf({ productName: 'Barista', categories: ['Labour'] })).toBe('job');
  });

  it('has nothing to sell on a pin that names no product', () => {
    expect(listingKindOf({ productName: null, categories: ['Automotive'] })).toBeNull();
    expect(listingKindOf({ productName: '  ', categories: [] })).toBeNull();
  });
});

describe('listingProblem', () => {
  it('passes a complete item', () => {
    expect(listingProblem('item', item())).toBeUndefined();
  });

  it('asks for what the kind needs', () => {
    expect(listingProblem('item', item({ title: ' ' }))).toEqual({ field: 'title', code: 'required' });
    expect(listingProblem('item', item({ price: null }))).toEqual({ field: 'price', code: 'required' });
    expect(listingProblem('item', item({ details: { category: 'mensClothing' } }))).toEqual({ field: 'condition', code: 'required' });
    expect(listingProblem('item', item({ photos: [] }))).toEqual({ field: 'photos', code: 'required' });
    expect(listingProblem('item', item({ location: null }))).toEqual({ field: 'location', code: 'required' });
  });

  it('takes a video alone as the one piece of media an item needs', () => {
    expect(listingProblem('item', item({ photos: [], video: 'listing/1-v.mp4' }))).toBeUndefined();
    expect(listingProblem('job', item({ title: 'Barista', description: 'Mornings', photos: [], details: { jobCategory: 'food', jobType: 'partTime', payType: 'hourly', locationType: 'onSite' } }))).toBeUndefined();
  });

  it('refuses an option the field does not have, and too many photos', () => {
    expect(listingProblem('item', item({ details: { category: 'cars', condition: 'new' } }))).toEqual({ field: 'category', code: 'invalid' });
    expect(listingProblem('item', item({ photos: Array.from({ length: 11 }, (_, i) => `listing/1-${i}.jpg`) }))).toEqual({ field: 'photos', code: 'tooMany' });
  });

  it('checks a vehicle’s year and VIN, and names it by its details', () => {
    const vehicle = item({ title: '', details: { vehicleType: 'car', year: 2019, make: 'Toyota', model: 'Camry' } });
    expect(listingProblem('vehicle', vehicle)).toBeUndefined();
    expect(listingProblem('vehicle', { ...vehicle, details: { ...vehicle.details, year: 1850 } })).toEqual({ field: 'year', code: 'invalid' });
    expect(listingProblem('vehicle', { ...vehicle, details: { ...vehicle.details, vin: 'NOTAVIN' } })).toEqual({ field: 'vin', code: 'invalid' });
    expect(storedTitle('vehicle', vehicle)).toBe('2019 Toyota Camry');
  });

  it('takes half bathrooms but not a third', () => {
    const home = item({ title: '', details: { offer: 'rent', propertyType: 'house', bedrooms: 3, bathrooms: 2.5 } });
    expect(listingProblem('home', home)).toBeUndefined();
    expect(listingProblem('home', { ...home, details: { ...home.details, bathrooms: 2.3 } })).toEqual({ field: 'bathrooms', code: 'invalid' });
  });

  it('wants a job described, its pay range in order, and no photo', () => {
    const job = item({
      title: 'Barista',
      description: 'Morning shifts',
      photos: [],
      price: 18,
      details: { jobCategory: 'food', jobType: 'partTime', payType: 'hourly', locationType: 'onSite', maxPay: 22 },
    });
    expect(listingProblem('job', job)).toBeUndefined();
    expect(listingProblem('job', { ...job, description: '' })).toEqual({ field: 'description', code: 'required' });
    expect(listingProblem('job', { ...job, details: { ...job.details, maxPay: 10 } })).toEqual({ field: 'maxPay', code: 'invalid' });
    expect(listingProblem('job', { ...job, video: 'listing/1-v.mp4' })).toEqual({ field: 'video', code: 'invalid' });
  });
});

describe('cleanDetails', () => {
  it('keeps only the kind’s fields, trimmed, without blanks', () => {
    expect(cleanDetails('item', { category: 'books', brand: '  Penguin ', color: '', year: 2020, benefits: ['tips'] })).toEqual({ category: 'books', brand: 'Penguin' });
    expect(cleanDetails('vehicle', { vin: ' 1hgcm82633a004352 ', cleanTitle: false })).toEqual({ vin: '1HGCM82633A004352' });
  });
});

describe('countTurns', () => {
  it('counts each change of speaker as a turn', () => {
    expect(countTurns([])).toBe(0);
    expect(countTurns([1, 1, 1])).toBe(1);
    expect(countTurns([1, 2, 2, 1, 2, 1, 1, 2, 1])).toBe(7);
  });
});

describe('ratingProblem', () => {
  it('wants one to five stars and the role’s own tags', () => {
    expect(ratingProblem('seller', { stars: 5, tags: ['fairPricing'], body: 'Great' })).toBeUndefined();
    expect(ratingProblem('seller', { stars: 0 })).toMatch(/stars/);
    expect(ratingProblem('seller', { stars: 4.5 })).toMatch(/stars/);
    expect(ratingProblem('buyer', { stars: 3, tags: ['fairPricing'] })).toMatch(/tags/);
    expect(ratingProblem('buyer', { stars: 3, body: 'x'.repeat(751) })).toMatch(/750/);
  });
});

describe('listingHref', () => {
  it('opens a listing on its pin, or on the Marketplace map when it has none', () => {
    expect(listingHref({ id: 5, pinId: 12 })).toBe('/pin/12?listing=5');
    expect(listingHref({ id: 5, pinId: null })).toBe('/map?show=market&listing=5');
  });
});
