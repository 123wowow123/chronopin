import { describe, expect, it } from 'vitest';
import { estimateInput, parseEstimate } from './estimateDate';

describe('parseEstimate', () => {
  it('accepts a dated answer with a basis and prefixes Estimated:', () => {
    const e = parseEstimate({ startDateTime: '2027-03-31T00:00:00Z', endDateTime: null, allDay: true, basis: 'Q1 2027 per the operator; unconfirmed.' });
    expect(e?.start).toEqual(new Date('2027-03-31T00:00:00Z'));
    expect(e?.end).toBeUndefined();
    expect(e?.reasoning).toBe('Estimated: Q1 2027 per the operator; unconfirmed.');
  });

  it('keeps an existing Estimated: prefix and a later end', () => {
    const e = parseEstimate({ startDateTime: '2027-04-27T00:00:00Z', endDateTime: '2027-04-30T00:00:00Z', allDay: true, basis: 'Estimated: from the calendar.' });
    expect(e?.reasoning).toBe('Estimated: from the calendar.');
    expect(e?.end).toEqual(new Date('2027-04-30T00:00:00Z'));
  });

  it('drops an end that is not after the start', () => {
    expect(parseEstimate({ startDateTime: '2027-04-27T00:00:00Z', endDateTime: '2027-04-26T00:00:00Z', allDay: true, basis: 'x' })?.end).toBeUndefined();
  });

  it('is no estimate without a valid start or a basis', () => {
    expect(parseEstimate({ startDateTime: null, endDateTime: null, allDay: false, basis: '' })).toBeNull();
    expect(parseEstimate({ startDateTime: 'soon', endDateTime: null, allDay: true, basis: 'x' })).toBeNull();
    expect(parseEstimate({ startDateTime: '2027-01-01T00:00:00Z', endDateTime: null, allDay: true, basis: '  ' })).toBeNull();
    expect(parseEstimate(null)).toBeNull();
  });
});

describe('estimateInput', () => {
  it('lists the references with what their pages say', () => {
    const text = estimateInput({
      pageUrl: 'https://a.test/x',
      pageText: 'The committee will meet again.',
      references: [{ url: 'https://who.test/r', title: 'WHO', confidence: 88, publishedDate: '2026-08-18', reasoning: 'meets every three months' }],
      today: '2026-09-30',
    });
    expect(text).toContain('Today: 2026-09-30');
    expect(text).toContain('[1] https://who.test/r');
    expect(text).toContain('published: 2026-08-18; confidence 88');
    expect(text).toContain('meets every three months');
  });
});
