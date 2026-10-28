import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createTranslator } from '@/lib/i18n/translate';
import en from '@/lib/i18n/messages/en';
import type { PinFactoryJson } from '@/lib/pinFactory';
import { factoryBuildoutMetrics, hasFactoryBuildout, hasFactoryRubric } from '@/lib/pinFactory';
vi.mock('./TasteRadar', () => ({ TasteRadar: () => <div data-testid="radar" /> }));
import { PinFactory } from './PinFactory';
import { PinFactoryBuildout } from './PinFactoryBuildout';
const entries = JSON.parse(readFileSync('scripts/factories/capability.json', 'utf8')) as { key: string; profile: PinFactoryJson }[];
const profile = () => structuredClone(entries[0].profile);
const t = createTranslator(en, 'en');
const render = (p: PinFactoryJson) => renderToStaticMarkup(createElement(PinFactoryBuildout, { factory: p, t }));

describe('factual factory buildout display', () => {
  it('shows every researched project independently of radar eligibility', () => {
    for (const e of entries) {
      expect(hasFactoryBuildout(e.profile)).toBe(true);
      expect(render(e.profile)).toContain('Factory buildout');
    }
    const bayer = profile();
    expect(hasFactoryRubric(bayer)).toBe(false);
    expect(renderToStaticMarkup(createElement(PinFactory, { factory: bayer, t }))).toBe('');
    expect(render(bayer)).toContain('Factory buildout');
  });
  it('requires three distinct populated categories and does not count multiple dates twice', () => {
    const p = profile();
    expect(hasFactoryBuildout(null)).toBe(false);
    p.metrics = p.metrics.slice(0, 2);
    expect(render(p)).toBe('');
    p.metrics.push({ ...p.metrics[0], label: 'Another investment figure' });
    expect(hasFactoryBuildout(p)).toBe(false);
    p.metrics.push({ ...profile().metrics.find(m => m.key === 'timeline')! });
    expect(hasFactoryBuildout(p)).toBe(true);
    expect(factoryBuildoutMetrics(p)).toHaveLength(3);
  });
  it('ignores blank values and handles profiles saved before metric keys existed', () => {
    const p = profile();
    for (const m of p.metrics) delete m.key;
    // Products are a new field: the other three still resolve through legacy labels.
    expect(hasFactoryBuildout(p)).toBe(true);
    p.metrics[0].value = '  ';
    expect(hasFactoryBuildout(p)).toBe(false);
  });
  it('renders sourced target precision and highlights only the reported stage', () => {
    const html = render(profile());
    expect(html.match(/aria-current="step"/g)).toHaveLength(1);
    expect(html).toContain('2031');
    expect(html).toContain('2034');
    expect(html).toContain('Planned');
    expect(html).toContain('Demonstrated');
    expect(html).toContain('Project timeline');
    expect(html).toContain('https://www.bayer.com/');
    expect(html).not.toContain('data-testid="radar"');
  });
});
