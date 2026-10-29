import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createTranslator } from '@/lib/i18n/translate';
import en from '@/lib/i18n/messages/en';
import type { TradeRow } from '@/lib/trades';

vi.mock('@/components/ui/Link', () => ({ default: (props: React.ComponentProps<'a'>) => <a {...props} /> }));
import { LatestTrades } from './LatestTrades';

const t = createTranslator(en, 'en');
const trade = (id: number, changes: Partial<TradeRow> = {}): TradeRow => ({
  id, chamber: 'house', filingId: 'filing', owner: 'joint', asset: `Bond ${id}`, ticker: null,
  assetType: null, txType: 'purchase', txDate: '2026-10-14', notifiedDate: null,
  filedDate: '2026-10-28', amountLow: 250001, amountHigh: 500000,
  sourceUrl: 'https://example.com/filing', ...changes,
});

describe('latest personal trade blocks', () => {
  it('shows all transactions on the five newest active dates, including assets without tickers', () => {
    const trades = [trade(1, { txDate: '2026-09-01' }), trade(2), trade(3), trade(4), trade(5), trade(6, { txType: 'partial' }),
      trade(7, { txDate: '2026-10-01' }), trade(8, { txDate: '2026-09-24' }),
      trade(9, { txDate: '2026-09-18' }), trade(10, { txDate: '2026-09-14' }), trade(11, { txDate: '2026-09-14' })];
    const html = renderToStaticMarkup(<LatestTrades trades={trades} t={t} />);
    expect(html.match(/<li /g)).toHaveLength(10);
    expect(html.match(/<section /g)).toHaveLength(5);
    expect(html).not.toContain('>Bond 1<');
    expect(html).toContain('Bond 6');
    expect(html).toContain('Bond 10');
    expect(html).toContain('Bond 11');
    expect(html).toContain('dateTime="2026-10-14"');
    expect(html).toContain('Wednesday, Oct 14, 2026');
    expect(html).not.toContain('dateTime="2026-10-28"');
    expect(html).toContain('Buys 4');
    expect(html).toContain('Sells 1');
    expect(html).toContain('$250,001 – $500,000');
    expect(html).toContain('https://example.com/filing');
    expect(trades[0].id).toBe(1);
  });

  it('keeps purchases in the buy column and full and partial sales in the sale column', () => {
    const html = renderToStaticMarkup(<LatestTrades trades={[
      trade(1, { asset: 'Purchased asset' }),
      trade(2, { asset: 'Sold asset', txType: 'sale' }),
      trade(3, { asset: 'Partially sold asset', txType: 'partial' }),
    ]} t={t} />);
    const buys = html.split('aria-label="Buys"')[1].split('aria-label="Sells"')[0];
    const sells = html.split('aria-label="Sells"')[1];
    expect(buys).toContain('Purchased asset');
    expect(buys).not.toContain('Sold asset');
    expect(buys).not.toContain('Partially sold asset');
    expect(sells).toContain('Sold asset');
    expect(sells).toContain('Partially sold asset');
    expect(sells).not.toContain('Purchased asset');
  });

  it('links tickers and preserves conflict warnings and unknown amounts', () => {
    const html = renderToStaticMarkup(<LatestTrades trades={[trade(1, {
      ticker: 'MSFT', asset: 'Microsoft', txType: 'exchange', amountLow: null, amountHigh: null,
      conflicts: [{ committee: 'Financial Services', sector: 'Technology' }],
    })]} t={t} />);
    expect(html).toContain('/search?q=%24MSFT');
    expect(html).toContain('Microsoft');
    expect(html).toContain('Exchange');
    expect(html).toContain('Possible conflict of interest');
    expect(html).toContain('Not disclosed');
    expect(renderToStaticMarkup(<LatestTrades trades={[]} t={t} />)).toBe('');
  });
});
