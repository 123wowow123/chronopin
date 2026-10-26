import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HoldingsSection } from './HoldingsSection';
import { createTranslator } from '@/lib/i18n/translate';
import en from '@/lib/i18n/messages/en';
import catalog from '@/server/data/personHoldings.json';
import { readHoldings } from '@/server/holdingsInput';
import primary from '@/server/data/personHoldingsPrimary.json';
import reported from '@/server/data/personHoldingsReported.json';

const t = createTranslator(en, 'en');
const render = (portfolios = readHoldings(catalog.profiles[0])) => renderToStaticMarkup(<HoldingsSection portfolios={portfolios} today="2026-10-25" t={t} />);
describe('holdings section', () => {
  it('shows Burry’s six reported personal holdings in the personal section with source limits', () => {
    const html = renderToStaticMarkup(<HoldingsSection portfolios={readHoldings(reported.profiles[0])} today="2026-10-25" t={t} view="personal" />);
    for (const name of ['BYD', 'JD.com', 'Tencent', 'Meituan', 'Haidilao', 'Haier']) expect(html).toContain(name);
    expect(html).toContain('press-reported');
    expect(html).toContain('Not disclosed');
    expect(html).not.toContain('No verified personal portfolio snapshot');
  });
  it('keeps fund and strategy positions out of the personal section, with unique section targets', () => {
    const portfolios = readHoldings(primary.profiles.find(p => p.name === 'Michael Burry')!);
    const personal = renderToStaticMarkup(<HoldingsSection portfolios={portfolios} today="2026-10-25" t={t} view="personal" />);
    expect(personal).toContain('Personal holdings &amp; P&amp;L');
    expect(personal).toContain('No verified personal portfolio snapshot');
    expect(personal).not.toContain('Scion Asset Management');
    const related = renderToStaticMarkup(<HoldingsSection portfolios={portfolios} today="2026-10-25" t={t} view="related" />);
    expect(related).toContain('id="related-holdings"');
    expect(related).toContain('Scion Asset Management');
    expect(related).not.toContain('id="holdings"');
  });
  it('renders the section for people without published positions, without implying no investments', () => {
    const html = render([]);
    expect(html).toContain('id="holdings"');
    expect(html).toContain('unknown, not zero');
  });
  it('keeps strategy returns separate from personal P&L and shows partial coverage and dates', () => {
    const p = readHoldings(catalog.profiles[0]);
    const html = render(p);
    expect(html).toContain(p[0].holdings[0].symbol);
    expect(html).toContain('Tracked strategy');
    expect(html).toContain('Published portfolio return');
    expect(html).toContain('Only part of the portfolio is public');
    expect(html).toContain('Not disclosed');
    expect(html).toContain(p[0].sourceUrl);
    expect(html).not.toContain('NaN');
  });
  it('renders sourced unrealized gains, a real zero result and a stale snapshot', () => {
    const p = readHoldings(catalog.profiles[0]);
    p[0].asOf = '2026-09-30';
    Object.assign(p[0].holdings[0], { costBasis: 1000, marketValue: 1250, valuationDate: '2026-10-23', costSourceUrl: 'https://example.org/cost', valueSourceUrl: 'https://example.org/value' });
    expect(render(p)).toContain('$250.00');
    expect(render(p)).toContain('+25%');
    expect(render(p)).toContain('Older snapshot');
    p[0].holdings[0].marketValue = 1000;
    expect(render(p)).toContain('$0.00');
  });
  it('labels SEC security identifiers and shows dated company cost-based gains', () => {
    const p = readHoldings(primary.profiles.find(p => p.name === 'Warren Buffett')!);
    const html = render(p);
    expect(html).toContain('CUSIP ');
    expect(html).toContain('$55,707,000,000.00');
    expect(html).toContain('2025 year-end');
    expect(html).toContain('not Warren Buffett’s personal portfolio');
  });
  it('shows the filed family owner and value range without displaying a guessed profit', () => {
    const p = readHoldings(primary.profiles.find(p => p.name === 'Nancy Pelosi')!);
    const html = render(p);
    expect(html).toContain('Spouse');
    expect(html).toContain('$5,000,001.00 – $25,000,000.00');
    expect(html).toContain('Not disclosed');
    expect(html).not.toContain('text-success');
  });
});
