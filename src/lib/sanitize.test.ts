import { describe, expect, it } from 'vitest';
import { citeTag } from './citations';
import type { Evidence } from './referenceConfidence';
import { safeCitedHtml } from './sanitize';

const source: Evidence = { url: 'https://src.example/story', isSource: true, confidence: 90, utcCreatedDateTime: '2026-09-01T00:00:00Z' };
const older: Evidence = { url: 'https://old.example/a?x=1&y=2', confidence: 70, publishedDate: '2026-08-01' };
const newer: Evidence = { url: 'https://new.example/b', confidence: 80, publishedDate: '2026-09-05' };

describe('safeCitedHtml', () => {
  it('numbers citations by where their links sit among the references', () => {
    const html = `<ul><li>Opens Sept 18${citeTag(source.url)}${citeTag(older.url)}</li><li>Delayed ${citeTag('https://www.new.example/b/')}</li></ul>`;
    expect(safeCitedHtml(html, [source, older, newer])).toBe(
      '<ul><li>Opens Sept 18<sup class="ml-px not-italic"><a href="#ref-1" aria-label="Reference 1" class="font-medium no-underline">[1]</a>' +
        '<a href="#ref-3" aria-label="Reference 3" class="font-medium no-underline">[3]</a></sup></li>' +
        '<li>Delayed<sup class="ml-px not-italic"><a href="#ref-2" aria-label="Reference 2" class="font-medium no-underline">[2]</a></sup></li></ul>',
    );
  });

  it('drops citations of links no longer referenced, and anything unsafe', () => {
    const html = `<ul><li onclick="x()">Point${citeTag('https://gone.example/')}9<script>alert(1)</script></li></ul>`;
    expect(safeCitedHtml(html, [source])).toBe('<ul><li>Point9</li></ul>');
  });

  it('leaves summaries without citations as they were', () => {
    expect(safeCitedHtml('<ul><li>Point [1]</li></ul>', [source])).toBe('<ul><li>Point [1]</li></ul>');
  });
});
