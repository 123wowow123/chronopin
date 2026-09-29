import { describe, expect, it } from 'vitest';
import type { WikiPage } from '../model/source';
import { composeInput, renderWiki, splitText } from './wiki';

const page = (id: number, title: string, children: WikiPage[] = []): WikiPage => ({
  id,
  sourceId: 1,
  parentId: null,
  position: 0,
  type: 'Topic',
  title,
  tags: [],
  summary: `${title} summary`,
  body: `${title} body`,
  children,
});

describe('splitText', () => {
  it('keeps short text whole', () => {
    expect(splitText('one part', 100)).toEqual(['one part']);
  });

  it('cuts at a paragraph break near the end of each part', () => {
    const para = 'x'.repeat(85);
    const parts = splitText(`${para}\n\n${para}\n\n${para}`, 100);
    expect(parts).toEqual([para, para, para]);
  });

  it('stops at maxParts, the last part cut to size', () => {
    const parts = splitText('y'.repeat(1000), 100, 3);
    expect(parts).toHaveLength(3);
    expect(parts.every((p) => p.length <= 100)).toBe(true);
  });
});

describe('renderWiki', () => {
  const wiki = page(1, 'Keynote', [page(2, 'Phone', [page(3, 'Camera')])]);

  it('renders every page in full', () => {
    expect(renderWiki(wiki, true)).toBe(
      '### Keynote\nKeynote summary\n\nKeynote body\n\n#### Phone\nPhone summary\n\nPhone body\n\n##### Camera\nCamera summary\n\nCamera body',
    );
  });

  it('cuts sub-pages to their summaries when short of room', () => {
    expect(renderWiki(wiki, false)).toBe('### Keynote\nKeynote summary\n\nKeynote body\n\n- Phone: Phone summary\n\n- Camera: Camera summary');
  });
});

describe('composeInput', () => {
  it('labels each link and gives an all-day pin its UTC days', () => {
    const input = composeInput(
      { title: 'Bridge opens', description: null, utcStartDateTime: '2026-09-18T00:00:00Z', utcEndDateTime: '2026-09-19T00:00:00Z', allDay: true },
      [
        { label: 'S', url: 'https://a.example/x', kind: 'web', wiki: page(1, 'A') },
        { label: '1', url: 'https://youtu.be/abc', kind: 'youtube', wiki: page(2, 'B') },
      ],
    );
    expect(input).toContain('Pin: Bridge opens\nStarts: 2026-09-18, ends: 2026-09-19');
    expect(input).toContain('## [S] web page: https://a.example/x');
    expect(input).toContain('## [1] YouTube video: https://youtu.be/abc');
  });

  it('writes a timed pin as a UTC instant', () => {
    const input = composeInput({ title: 'Launch', utcStartDateTime: new Date('2026-09-18T16:30:00Z') }, []);
    expect(input).toContain('Starts: 2026-09-18T16:30Z');
  });
});
