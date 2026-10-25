import { describe, expect, it } from 'vitest';
import { forecastProblem, formatForecastValue, matchesTags } from './industryForecast';

const row = {
  slug: 'worldwide-ai-spending',
  industry: 'AI',
  title: 'Worldwide AI spending',
  tags: ['AI'],
  prefix: '$',
  suffix: 'T',
  projection: { label: 'Gartner', points: [{ x: '2026', value: 2.67 }] },
  earlier: [{ label: 'Gartner, Jan 2026', publishedDate: '2026-01-15', points: [{ x: '2026', value: 2.53 }] }],
  sources: [{ label: 'Gartner', url: 'https://www.gartner.com/x', date: '2026-09-16', quote: 'Total AI Spending 2,670,460' }],
  note: null,
};

describe('industry forecast', () => {
  it('matches tags in any case', () => {
    expect(matchesTags(['AI', 'Software'], ['software'])).toBe(true);
    expect(matchesTags(['AI'], ['Food', null])).toBe(false);
  });
  it('formats values with their unit', () => {
    expect(formatForecastValue({ prefix: '$', suffix: 'T' }, 2.6704)).toBe('$2.67T');
    expect(formatForecastValue({ prefix: '', suffix: '%' }, 55.8599)).toBe('55.86%');
  });
  it('accepts a cited projection with an earlier edition', () => {
    expect(forecastProblem(row)).toMatchObject({ slug: 'worldwide-ai-spending', earlier: [{ publishedDate: '2026-01-15' }] });
  });
  it('refuses what it cannot cite', () => {
    expect(forecastProblem({ ...row, sources: [{ ...row.sources[0], url: 'http://x.test/' }] })).toMatch(/HTTPS/);
    expect(forecastProblem({ ...row, sources: [{ ...row.sources[0], quote: null }] })).toMatch(/quote/);
    expect(forecastProblem({ ...row, projection: null })).toMatch(/earlier editions need/);
    expect(forecastProblem({ ...row, earlier: [{ ...row.earlier[0], publishedDate: null }] })).toMatch(/publishedDate/);
  });
});
