import { describe, expect, it } from 'vitest';
import { busynessNow, readBusyness } from './googleBusyness';

// The wording Google uses on a Maps place panel. These are what the regexes
// are actually up against; when Google changes them this test is what fails
// first, which is the point of it.
describe('readBusyness', () => {
  it('reads the live bar against what the hour is normally like', () => {
    expect(
      readBusyness({
        labels: ['Currently 45% busy, usually 70% busy at 7 PM', 'Share'],
        text: 'Popular times\nLive\nBusier than usual',
      }),
    ).toEqual({ live: 45, typical: 70, waitMinutes: null, trend: 'more' });
  });

  it('takes this hour bar as typical when there is no live reading', () => {
    expect(
      readBusyness({ labels: ['80% busy at 1 PM, current time', 'Directions'], text: 'Popular times' }),
    ).toMatchObject({ live: null, typical: 80 });
  });

  it('reads a wait, and plans for the top of a range rather than the flattering end', () => {
    expect(readBusyness({ labels: [], text: 'Usually a 30 min wait' })).toMatchObject({ waitMinutes: 30 });
    expect(readBusyness({ labels: [], text: 'Wait time: up to 45 min' })).toMatchObject({ waitMinutes: 45 });
    expect(readBusyness({ labels: [], text: 'Usually a 20-40 min wait' })).toMatchObject({ waitMinutes: 40 });
  });

  it('normalises how Google words the comparison', () => {
    expect(readBusyness({ labels: [], text: 'Not too busy' })?.trend).toBe('much-less');
    expect(readBusyness({ labels: [], text: 'Less busy than usual' })?.trend).toBe('less');
    expect(readBusyness({ labels: [], text: 'Busier than usual' })?.trend).toBe('more');
    expect(readBusyness({ labels: [], text: 'As busy as it gets' })?.trend).toBe('much-more');
  });

  it('is null when the page said nothing about busyness, which is the usual answer', () => {
    expect(readBusyness({ labels: ['Share', 'Directions'], text: "Katz's Delicatessen\n4.5\n(55,434)\nDeli" })).toBeNull();
    expect(readBusyness({ labels: [], text: '' })).toBeNull();
  });

  it('is not fooled by the review keyword chip, which names a wait with no number', () => {
    // A real label from the captured page: it is a count of reviews that
    // mention waiting, not a wait time.
    expect(readBusyness({ labels: ['wait time, mentioned in 1,214 reviews'], text: 'Reviews' })).toBeNull();
  });
});

// The guard against a measured regression: reading the Maps page costs a
// Chromium launch, which put 4.4s into a cold request before busyness was
// taken off the awaited path. The API calls this, and it must answer at once.
describe('busynessNow', () => {
  it('answers synchronously rather than waiting for a browser', () => {
    const t0 = Date.now();
    const out = busynessNow('ChIJCar0f49ZwokR6ozLV-dHNTE');
    expect(Date.now() - t0).toBeLessThan(50);
    // Null until some earlier read has settled - a first view shows no bar.
    expect(out).toBeNull();
  });

  it('never throws, whatever the place id', () => {
    expect(() => busynessNow('')).not.toThrow();
    expect(() => busynessNow('not-a-place-id')).not.toThrow();
  });
});
