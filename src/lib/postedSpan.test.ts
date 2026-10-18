import { describe, expect, it } from 'vitest';
import { eventSpanSummary, spanFromParam, spanToParam } from './postedSpan';

describe('eventSpanSummary', () => {
  it('folds equal sides into one and names unbounded sides', () => {
    expect(eventSpanSummary('1y', '1y')).toBe('±1 year');
    expect(eventSpanSummary(null, null)).toBe('All');
    expect(eventSpanSummary('1w', null)).toBe('−1 week +All');
    expect(eventSpanSummary('0d', '3y')).toBe('−0 days +3 years');
  });
});

describe('span URL parameters', () => {
  it('reads a missing or invalid value as the default and "all" as unbounded', () => {
    expect(spanFromParam(null, '1y')).toBe('1y');
    expect(spanFromParam('banana', '1y')).toBe('1y');
    expect(spanFromParam('all', '1y')).toBeNull();
    expect(spanFromParam('3mo', '1y')).toBe('3mo');
    expect(spanFromParam('0d', null)).toBe('0d');
  });

  it('leaves the default out and writes unbounded as "all"', () => {
    expect(spanToParam('1y', '1y')).toBeNull();
    expect(spanToParam(null, null)).toBeNull();
    expect(spanToParam(null, '1y')).toBe('all');
    expect(spanToParam('1w', null)).toBe('1w');
  });
});
