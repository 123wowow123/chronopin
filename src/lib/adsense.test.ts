import { describe, expect, it } from 'vitest';
import { adsenseAllowed, parseAdsenseSlots } from './adsense';

describe('parseAdsenseSlots', () => {
  it('takes an ad unit id for a slot and trims it', () => {
    expect(parseAdsenseSlots({ 'timeline-side': ' 1234567890 ' })).toEqual({ setting: { 'timeline-side': '1234567890' } });
  });

  it('takes the bottom banner of a pin page too', () => {
    expect(parseAdsenseSlots({ 'pin-bottom': '9876543210' })).toEqual({ setting: { 'pin-bottom': '9876543210' } });
  });

  it('leaves a slot with no or an empty id without a unit', () => {
    expect(parseAdsenseSlots({ 'timeline-side': '' })).toEqual({ setting: {} });
    expect(parseAdsenseSlots({})).toEqual({ setting: {} });
  });

  it('refuses an id that is not digits, or a body that is not an object', () => {
    expect(parseAdsenseSlots({ 'timeline-side': 'ca-pub-4845333369058390' })).toHaveProperty('problem');
    expect(parseAdsenseSlots({ 'timeline-side': 123 })).toHaveProperty('problem');
    expect(parseAdsenseSlots(['1234567890'])).toHaveProperty('problem');
    expect(parseAdsenseSlots(null)).toHaveProperty('problem');
  });
});

describe('adsenseAllowed', () => {
  it('shows Google ads to anyone old enough, and to a viewer of unknown age', () => {
    expect(adsenseAllowed(null)).toBe(true);
    expect(adsenseAllowed(13)).toBe(true);
    expect(adsenseAllowed(12)).toBe(false);
  });
});
