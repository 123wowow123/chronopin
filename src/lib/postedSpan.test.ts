import { describe, expect, it } from 'vitest';
import { spanFromParam, spanToParam } from './postedSpan';

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
