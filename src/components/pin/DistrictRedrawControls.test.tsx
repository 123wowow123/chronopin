import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createTranslator } from '@/lib/i18n/translate';
import en from '@/lib/i18n/messages/en';
import type { DistrictRedraw } from '@/lib/siteShape';
vi.mock('@/lib/client/i18n', () => ({ useT: () => createTranslator(en, 'en') }));
import { DistrictRedrawControls } from './DistrictRedrawControls';

const plan = { label: 'Earlier 2022 plan', vintage: '2022 map, November 2026 ballot', status: 'inEffect' as const, source: 'Election office', sourceUrl: 'https://example.com/2022', features: [] };
const redraw: DistrictRedraw = { id: 'missouri', name: 'Missouri', before: plan, after: { ...plan, label: 'Later 2025 plan', vintage: 'On hold pending referendum', status: 'blocked', sourceUrl: 'https://example.com/2025' } };
const render = (selected: string, view: 'compare' | 'before' | 'after') => renderToStaticMarkup(createElement(DistrictRedrawControls, { redraws: [redraw], selected, view, onSelect: () => {}, onView: () => {} }));
it('keeps the default map distinct from selecting a historical comparison', () => {
  const html = render('', 'compare');
  expect(html).toContain('All mapped districts');
  expect(html).not.toContain('aria-pressed');
});
describe('selected comparison', () => {
  it('displays dates, status, both source links and accessible pressed state', () => {
    const html = render('missouri', 'compare');
    for (const text of ['Earlier plan', 'Later plan', 'Compare plans', 'Blocked', 'In effect', 'On hold pending referendum', 'https://example.com/2022', 'https://example.com/2025']) expect(html).toContain(text);
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html).toContain('aria-pressed="true"');
  });
});
