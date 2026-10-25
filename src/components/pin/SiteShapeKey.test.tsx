import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { boundaryShape, mergeBoundary } from '@/lib/boundaryShape';
import { createTranslator } from '@/lib/i18n/translate';
import en from '@/lib/i18n/messages/en';
vi.mock('@/components/ui/Anchor', () => ({ default: (props: React.ComponentProps<'a'>) => createElement('a', props) }));
import { SiteShapeKey } from './SiteShapeKey';

const data = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] }, properties: {} };
describe('boundary map key', () => {
  it('shows both kinds, their snapshot dates/vintages and each source in a mixed layer', () => {
    const fire = boundaryShape(data, { kind: 'wildfire', name: 'Example fire', observedAt: '2025-01', source: 'Fire agency', sourceUrl: 'https://example.com/fire' });
    const district = boundaryShape(data, { kind: 'district', name: 'District 1', vintage: '2021 plan / 2025 election', source: 'Election office', sourceUrl: 'https://example.com/district' });
    const html = renderToStaticMarkup(createElement(SiteShapeKey, { shape: mergeBoundary(fire, district), t: createTranslator(en, 'en') }));
    for (const label of ['Wildfire perimeter', 'Election district boundary', 'Example fire', 'District 1', '2021 plan / 2025 election', 'https://example.com/fire', 'https://example.com/district']) expect(html).toContain(label);
    expect(html).toContain('<time dateTime="2025-01">2025-01</time>');
    expect(html).not.toContain('pin.siteKey');
  });
});
