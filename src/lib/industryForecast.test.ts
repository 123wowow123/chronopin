import { describe, expect, it } from 'vitest';
import { forecastProblem, formatForecastValue, matchesPinForecast, matchesTags } from './industryForecast';
import forecasts from '../../scripts/industry/forecasts.json';

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
  it('keeps AI forecasts off an ECB policy pin while retaining economic forecasts', () => {
    const names = ['Economy', 'Finance', 'European Central Bank', 'Eurozone', 'Interest Rates', 'Kalshi', 'Prediction Market'];
    const slugs = forecasts.filter((f) => matchesPinForecast(f, names)).map((f) => f.slug);
    expect(slugs).toContain('imf-global-growth');
    expect(slugs).not.toContain('us-ai-investment-gdp');
    expect(slugs).not.toContain('us-ai-investment-usd');
    expect(slugs).not.toContain('hyperscaler-capex');
    expect(slugs).not.toContain('us-ai-adoption-finance');
    expect(slugs).not.toContain('ai-labour-footprint');
  });
  it('requires AI on the pin for every AI chart, including sector adoption charts', () => {
    const aiCharts = forecasts.filter((f) => f.industry === 'AI' || f.tags.includes('AI') || /\bAI\b/.test(f.title));
    expect(aiCharts.length).toBeGreaterThan(10);
    for (const forecast of aiCharts) {
      const sectorNames = forecast.tags.filter((tag) => tag !== 'AI');
      expect(matchesPinForecast(forecast, sectorNames), forecast.slug).toBe(false);
      expect(matchesPinForecast(forecast, [...sectorNames, ' ai ']), forecast.slug).toBe(true);
      expect(matchesPinForecast(forecast, [...sectorNames, 'AI Models']), forecast.slug).toBe(true);
    }
  });
  it('preserves broad matching for searches and unrelated-topic filtering for pins', () => {
    expect(matchesTags(['AI', 'Economy'], ['Economy'])).toBe(true);
    expect(matchesPinForecast(row, ['Food'])).toBe(false);
    expect(matchesPinForecast(row, ['AI Models'])).toBe(true);
  });
  it('requires every forecast’s primary industry instead of a related category', () => {
    for (const forecast of forecasts) {
      const related = forecast.tags.filter((tag) => tag !== forecast.industry);
      expect(matchesPinForecast(forecast, related), forecast.slug).toBe(false);
      expect(matchesPinForecast(forecast, [forecast.industry, 'AI']), forecast.slug).toBe(true);
    }
  });
  it('does not turn broad categories into unrelated specialist panels', () => {
    const slugs = (names: string[]) => forecasts.filter((f) => matchesPinForecast(f, names)).map((f) => f.slug);
    expect(slugs(['Finance', 'Economy'])).toEqual(['imf-global-growth']);
    expect(slugs(['Computing'])).toEqual(['gartner-worldwide-it-spending']);
    expect(slugs(['Business'])).toEqual(['wto-merchandise-trade']);
    expect(slugs(['Space'])).not.toContain('nasa-sunspot-median');
    expect(slugs(['Food'])).not.toContain('us-ai-adoption-hospitality');
    expect(slugs(['Travel'])).not.toContain('wef-sports-economy');
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
