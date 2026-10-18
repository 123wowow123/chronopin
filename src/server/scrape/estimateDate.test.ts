import { describe, expect, it } from 'vitest';
import { estimateFromReferences, isUndated } from './estimateDate';

const ref = (over: Record<string, unknown>) => ({ url: 'https://www.example.com/a', confidence: 80, ...over }) as never;

describe('estimateFromReferences', () => {
  it('dates an undated pin from its most confident reference', () => {
    const pin: Record<string, unknown> = {};
    const done = estimateFromReferences(pin, [
      ref({ url: 'https://news.test/x', confidence: 75, startDate: '2027-05-01', reasoning: 'says May 1' }),
      ref({ url: 'https://www.agency.gov/y', confidence: 92, startDate: '2027-04-27', endDate: '2027-04-29', reasoning: 'the calendar lists 27-29 April' }),
    ]);
    expect(done).toBe(true);
    expect(pin.utcStartDateTime).toEqual(new Date('2027-04-27T00:00:00Z'));
    expect(pin.utcEndDateTime).toEqual(new Date('2027-04-30T00:00:00Z'));
    expect(pin.allDay).toBe(true);
    expect(pin.allDayStated).toBe(true);
    expect(pin.dateConfidence).toBe('estimated');
    expect(pin.dateConfidenceReasoning).toMatch(/^Estimated: the source states no date; agency\.gov \(confidence 92\)/);
    expect(pin.dateConfidenceReasoning).toContain('Differing: news.test (2027-05-01)');
  });

  it('names the references that agree', () => {
    const pin: Record<string, unknown> = { dateConfidence: 'unknown' };
    estimateFromReferences(pin, [
      ref({ url: 'https://a.test/1', confidence: 90, startDate: '2027-01-06' }),
      ref({ url: 'https://b.test/2', confidence: 80, startDate: '2027-01-06' }),
    ]);
    expect(pin.dateConfidenceReasoning).toContain('Agreeing: b.test.');
    expect(pin.allDayStated).toBe(false);
  });

  it('leaves a dated pin alone', () => {
    const pin: Record<string, unknown> = { utcStartDateTime: new Date('2026-12-01T00:00:00Z'), dateConfidence: 'scheduled' };
    expect(estimateFromReferences(pin, [ref({ startDate: '2027-01-01' })])).toBe(false);
    expect(pin.dateConfidence).toBe('scheduled');
  });

  it('never dates from a publication date or a malformed day', () => {
    const pin: Record<string, unknown> = {};
    expect(estimateFromReferences(pin, [ref({ publishedDate: '2026-09-01' }), ref({ startDate: 'May 2027' })])).toBe(false);
    expect(pin.utcStartDateTime).toBeUndefined();
    expect(isUndated(pin)).toBe(true);
  });
});
