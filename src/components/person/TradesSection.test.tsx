import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
vi.mock('./TradeWatchButton', () => ({ TradeWatchButton: () => null }));
vi.mock('./TradesTable', () => ({ TradesTable: () => null }));
vi.mock('./MonthlyTradePanels', () => ({ MonthlyTradePanels: () => null }));
import { TradesSection } from './TradesSection';
import { createTranslator } from '@/lib/i18n/translate';
import en from '@/lib/i18n/messages/en';
const t = createTranslator(en, 'en');
describe('personal trade coverage', () => {
  it('keeps a visible section for someone without a verified execution ledger', () => {
    const html = renderToStaticMarkup(<TradesSection personId={1} name="No disclosed ledger" trades={[]} t={t} />);
    expect(html).toContain('id="trades"');
    expect(html).toContain('Personal trades &amp; P&amp;L');
    expect(html).toContain('unknown, not zero');
    expect(html).not.toContain('No stock trades disclosed.');
  });
  it('shows Burry’s sourced personal disclosures without turning previews into fictional trades or gains', () => {
    const html = renderToStaticMarkup(<TradesSection personId={1310} name="Michael Burry" trades={[]} t={t} />);
    expect(html).toContain('https://michaeljburry.substack.com/p/fannie-mae-freddie-mac-hong-kong');
    expect(html).toContain('does not specify the direction');
    expect(html).toContain('Realized P&amp;L');
    expect(html).toContain('Not disclosed');
    expect(html).toContain('Oct 11, 2026');
    expect(html).not.toContain('Traded: Oct 11');
    expect(html).not.toContain('Stock Act');
  });
  it('extends verified personal disclosures to insiders without presenting grants or gifts as profits', () => {
    for (const name of ['Elon Musk', 'Peter Thiel', 'Warren Buffett', 'Bill Ackman']) {
      const html = renderToStaticMarkup(<TradesSection personId={1} name={name} trades={[]} t={t} />);
      expect(html).toContain('www.sec.gov/Archives/edgar/data/');
      expect(html).toContain('Not disclosed');
      expect(html).toContain('Acquisition lot costs and realized P&amp;L are not established');
    }
    const gifts = renderToStaticMarkup(<TradesSection personId={1} name="Warren Buffett" trades={[]} t={t} />);
    expect(gifts).toContain('A gift is not a sale');
    const musk = renderToStaticMarkup(<TradesSection personId={1} name="Elon Musk" trades={[]} t={t} />);
    expect(musk).toContain('not an open-market sale');
  });
});
