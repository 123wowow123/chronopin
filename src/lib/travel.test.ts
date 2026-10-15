import { describe, expect, it } from 'vitest';
import type { PinHotelJson } from './pinHotel';
import {
  formatMonthRange,
  formatPricePerNight,
  getBestTimeToGo,
  getResortPricePerNight,
  getResortTopActivities,
  isMonthInPrimeSeason,
  MONTH_NAMES,
  RESORT_ACTIVITIES_MAP,
  sortTravelResorts,
  TRAVEL_SEASONS,
  type BestTimeToGo,
  type TravelResortPin,
} from './travel';

describe('travel best time to go', () => {
  it('returns custom curated timing for Capella Kyoto', () => {
    const { destination, timing } = getBestTimeToGo(15302);
    expect(destination).toContain('Kyoto');
    expect(timing.recommendedMonths).toEqual([3, 4, 5, 10, 11]);
    expect(timing.bestSeason).toContain('Cherry Blossoms');
    expect(timing.months).toHaveLength(12);
    expect(timing.months[3].status).toBe('prime'); // April (month 4, index 3)
    expect(timing.months[7].status).toBe('avoid'); // August (month 8, index 7, basin heat)
  });

  it('returns custom curated timing for Amoh Rhodes', () => {
    const { destination, timing } = getBestTimeToGo(15289);
    expect(destination).toContain('Rhodes');
    expect(timing.recommendedMonths).toEqual([5, 6, 9, 10]);
    expect(timing.bestSeason).toContain('Aegean');
    expect(timing.months[4].status).toBe('prime'); // May
    expect(timing.months[8].status).toBe('prime'); // September
  });

  it('returns custom curated timing for ICEHOTEL 365', () => {
    const { destination, timing } = getBestTimeToGo(763);
    expect(destination).toContain('Lapland');
    expect(timing.recommendedMonths).toContain(12); // Dec
    expect(timing.recommendedMonths).toContain(1); // Jan
    expect(timing.recommendedMonths).toContain(6); // Midnight Sun
  });

  it('formats month ranges cleanly', () => {
    expect(formatMonthRange([3, 4, 5, 10, 11])).toBe('Mar – May & Oct – Nov');
    expect(formatMonthRange([12, 1, 2, 3, 4])).toBe('Jan – Apr & Dec');
    expect(formatMonthRange([6, 7, 8])).toBe('Jun – Aug');
    expect(formatMonthRange([5])).toBe('May');
    expect(formatMonthRange([])).toBe('Year-round');
  });

  it('evaluates whether a month is prime season', () => {
    const { timing } = getBestTimeToGo(15302); // Kyoto: 3, 4, 5, 10, 11
    expect(isMonthInPrimeSeason(timing, 4)).toBe(true);
    expect(isMonthInPrimeSeason(timing, 11)).toBe(true);
    expect(isMonthInPrimeSeason(timing, 8)).toBe(false);
  });

  it('has consistent definitions for TRAVEL_SEASONS', () => {
    expect(TRAVEL_SEASONS.length).toBeGreaterThanOrEqual(5);
    const spring = TRAVEL_SEASONS.find((s) => s.id === 'spring');
    expect(spring?.months).toEqual([3, 4, 5]);
    const summer = TRAVEL_SEASONS.find((s) => s.id === 'summer');
    expect(summer?.months).toEqual([6, 7, 8]);
    const autumn = TRAVEL_SEASONS.find((s) => s.id === 'autumn');
    expect(autumn?.months).toEqual([9, 10, 11]);
    const winter = TRAVEL_SEASONS.find((s) => s.id === 'winter');
    expect(winter?.months).toEqual([12, 1, 2]);
  });

  it('verifies that MONTH_NAMES has all 12 abbreviated months', () => {
    expect(MONTH_NAMES).toHaveLength(12);
    expect(MONTH_NAMES[0]).toBe('Jan');
    expect(MONTH_NAMES[11]).toBe('Dec');
  });

  it('formats resort nightly prices and ranges correctly', () => {
    const kyoto = getResortPricePerNight(15302);
    expect(kyoto).toBeDefined();
    expect(kyoto?.amount).toBe(1250);
    expect(kyoto?.maxAmount).toBe(2400);
    expect(kyoto?.formatted).toBe('$1,250 – $2,400');
    expect(kyoto?.isRange).toBe(true);
    expect(kyoto?.currency).toBe('USD');

    const customEur = formatPricePerNight(1100, 2200, 'EUR');
    expect(customEur?.formatted).toBe('€1,100 – €2,200');
    expect(customEur?.isRange).toBe(true);

    const singlePrice = formatPricePerNight(850, null, 'GBP');
    expect(singlePrice?.formatted).toBe('£850');
    expect(singlePrice?.isRange).toBe(false);

    expect(formatPricePerNight(null)).toBeUndefined();
    expect(formatPricePerNight(0)).toBeUndefined();
    expect(formatPricePerNight(-100)).toBeUndefined();
  });

  it('sorts resorts by rating and price with tie-breaking and season priority', () => {
    const makeResort = (
      id: number,
      title: string,
      rubricScore: number,
      price: number,
      recommendedMonths: number[] = [4, 5],
    ): TravelResortPin =>
      ({
        id,
        title,
        rubricScore,
        pricePerNight: { amount: price, currency: 'USD', formatted: `$${price}`, isRange: false },
        bestTimeToGo: { recommendedMonths } as unknown as BestTimeToGo,
        hotel: {} as unknown as PinHotelJson,
        destination: 'Test',
      }) as unknown as TravelResortPin;

    const r1 = makeResort(1, 'Alpha Resort', 4.8, 1200);
    const r2 = makeResort(2, 'Beta Resort', 4.8, 800); // Same rating as r1, cheaper
    const r3 = makeResort(3, 'Gamma Resort', 4.5, 500); // Lower rating, lowest price
    const r4 = makeResort(4, 'Delta Resort', 4.9, 2000); // Highest rating, highest price

    const resorts = [r1, r2, r3, r4];

    // 1. rating-desc: Highest rating first; ties broken by lower price
    const byRatingDesc = sortTravelResorts(resorts, 'rating-desc');
    expect(byRatingDesc.map((r) => r.id)).toEqual([4, 2, 1, 3]);

    // 2. rating-asc: Lowest rating first; ties broken by lower price
    const byRatingAsc = sortTravelResorts(resorts, 'rating-asc');
    expect(byRatingAsc.map((r) => r.id)).toEqual([3, 2, 1, 4]);

    // 3. price-asc: Lowest price first; ties broken by higher rating
    const byPriceAsc = sortTravelResorts(resorts, 'price-asc');
    expect(byPriceAsc.map((r) => r.id)).toEqual([3, 2, 1, 4]);

    // 4. price-desc: Highest price first; ties broken by higher rating
    const byPriceDesc = sortTravelResorts(resorts, 'price-desc');
    expect(byPriceDesc.map((r) => r.id)).toEqual([4, 1, 2, 3]);

    // Test price tie breaking with different ratings
    const pTie1 = makeResort(10, 'Resort A', 4.6, 1000);
    const pTie2 = makeResort(11, 'Resort B', 4.9, 1000);
    const priceTies = sortTravelResorts([pTie1, pTie2], 'price-asc');
    expect(priceTies.map((r) => r.id)).toEqual([11, 10]); // Higher rating first on price tie

    // 5. Season filtering: active season months put prime resorts first
    const r5 = makeResort(5, 'Epsilon Winter Chalet', 4.7, 900, [12, 1, 2]);
    const mixed = [r1, r2, r3, r4, r5];

    // In winter months [12, 1, 2], r5 should come first even when sorting by rating-desc
    const winterPrime = sortTravelResorts(mixed, 'rating-desc', [12, 1, 2]);
    expect(winterPrime[0].id).toBe(5);
    expect(winterPrime.slice(1).map((r) => r.id)).toEqual([4, 2, 1, 3]);

    // 6. distance-asc & distance-desc sorting
    const tokyoOrigin = { latitude: 35.6762, longitude: 139.6503 };
    const kyotoPin = {
      ...r1,
      id: 101,
      title: 'Kyoto Resort',
      latitude: 35.0116,
      longitude: 135.7681, // ~370 km from Tokyo
    };
    const londonPin = {
      ...r2,
      id: 102,
      title: 'London Resort',
      latitude: 51.5074,
      longitude: -0.1278, // ~9560 km from Tokyo
    };
    const unknownPin = {
      ...r3,
      id: 103,
      title: 'Unknown Location Resort',
      latitude: undefined,
      longitude: undefined,
    };

    const geoMixed = [londonPin, unknownPin, kyotoPin];

    const byDistanceAsc = sortTravelResorts(geoMixed, 'distance-asc', null, tokyoOrigin);
    // Nearest first, unknown location last
    expect(byDistanceAsc.map((r) => r.id)).toEqual([101, 102, 103]);

    const byDistanceDesc = sortTravelResorts(geoMixed, 'distance-desc', null, tokyoOrigin);
    // Farthest first, unknown location last
    expect(byDistanceDesc.map((r) => r.id)).toEqual([102, 101, 103]);
  });

  it('curates rich verified top activities for resorts', () => {
    // Capella Kyoto
    const kyotoActivities = getResortTopActivities(15302);
    expect(kyotoActivities.length).toBeGreaterThanOrEqual(3);
    expect(kyotoActivities.some((a) => a.category === 'Culture')).toBe(true);
    expect(kyotoActivities.some((a) => a.category === 'Wellness')).toBe(true);
    expect(kyotoActivities.some((a) => a.title.includes('Zen Temple'))).toBe(true);

    // ICEHOTEL 365
    const icehotelActivities = getResortTopActivities(763);
    expect(icehotelActivities.length).toBeGreaterThanOrEqual(3);
    expect(icehotelActivities.some((a) => a.category === 'Snow')).toBe(true);
    expect(icehotelActivities.some((a) => a.title.includes('Ice Sculpting'))).toBe(true);

    // Constance Moofushi
    const maldivesActivities = getResortTopActivities(4129);
    expect(maldivesActivities.length).toBeGreaterThanOrEqual(3);
    expect(maldivesActivities.some((a) => a.category === 'Water')).toBe(true);
    expect(maldivesActivities.some((a) => a.title.includes('Whale Shark'))).toBe(true);

    // Verify all entries in RESORT_ACTIVITIES_MAP have valid categories and non-empty descriptions
    const allIds = Object.keys(RESORT_ACTIVITIES_MAP).map(Number);
    expect(allIds.length).toBe(32);
    for (const id of allIds) {
      const activities = RESORT_ACTIVITIES_MAP[id];
      expect(activities.length).toBeGreaterThanOrEqual(3);
      for (const act of activities) {
        expect(act.title.length).toBeGreaterThan(5);
        expect(act.description.length).toBeGreaterThan(15);
        expect(['Culture', 'Wellness', 'Adventure', 'Water', 'Nature', 'Dining', 'Snow']).toContain(
          act.category,
        );
      }
    }
  });
});

