import { describe, expect, it } from 'vitest';
import type { PinJson } from './types';
import { parseWidgetOptions, renderMissingWidget, renderWidget, widgetLoaderScript, widgetSnippets, widgetSrc } from './widget';

const pin = (id: number, title: string, start = '2027-03-01T00:00:00.000Z'): PinJson => ({ id, title, utcStartDateTime: start, allDay: true }) as PinJson;
const params = (q: string) => new URLSearchParams(q);

describe('parseWidgetOptions', () => {
  it('defaults, and ignores unknown values', () => {
    expect(parseWidgetOptions(params(''))).toEqual({ view: 'countdown', theme: 'auto', lang: 'en' });
    expect(parseWidgetOptions(params('view=bogus&theme=neon&lang=xx'))).toEqual({ view: 'countdown', theme: 'auto', lang: 'en' });
  });
  it('reads valid values', () => {
    expect(parseWidgetOptions(params('view=thread&theme=dark&lang=ja'))).toEqual({ view: 'thread', theme: 'dark', lang: 'ja' });
  });
});

describe('snippets', () => {
  it('keep a plain backlink in the script snippet', () => {
    const { script, iframe } = widgetSnippets(42, { view: 'thread', theme: 'dark' });
    expect(script).toContain('data-pin="42"');
    expect(script).toContain('data-view="thread"');
    expect(script).toContain('<a href=');
    expect(iframe).toContain('/embed/pin/42?view=thread&theme=dark');
  });
  it('omit default options', () => {
    expect(widgetSrc(7)).toMatch(/\/embed\/pin\/7$/);
  });
});

describe('renderWidget', () => {
  it('escapes titles and links back to the pin with a source tag', () => {
    const html = renderWidget(pin(5, '<script>alert(1)</script> & more'), [], parseWidgetOptions(params('')));
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('/pin/5/');
    expect(html).toContain('utm_source=embed');
    expect(html).toContain('id="cd"');
  });
  it('lists a thread with the current pin marked, and falls back to the countdown for a lone pin', () => {
    const thread = [pin(1, 'One'), pin(2, 'Two'), pin(3, 'Three')];
    const html = renderWidget(thread[1], thread, parseWidgetOptions(params('view=thread')));
    expect(html).toContain('<li class="on"><a href="');
    expect(html).toContain('Three');
    expect(renderWidget(thread[0], [thread[0]], parseWidgetOptions(params('view=thread')))).toContain('id="cd"');
  });
  it('caps a long thread and keeps the current pin', () => {
    const thread = Array.from({ length: 12 }, (_, i) => pin(i + 1, `Pin ${i + 1}`));
    const html = renderWidget(thread[10], thread, parseWidgetOptions(params('view=thread')));
    expect(html).toContain('Pin 11');
    expect(html).toContain('+4 more');
  });
  it('draws a missing pin', () => {
    expect(renderMissingWidget(9, parseWidgetOptions(params('')))).toContain('not available');
  });
});

describe('loader script', () => {
  it('is valid JavaScript', () => {
    expect(() => new Function(widgetLoaderScript())).not.toThrow();
  });
});
