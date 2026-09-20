import { describe, expect, it } from 'vitest';
import { looksLikePdf, parsePdfInfo } from './pdfText';
import { sourceKind } from '@/lib/sourceKind';

describe('parsePdfInfo', () => {
  // pdfinfo pads every field, and prints an absent one as a bare label. A
  // greedy \s+ walked over the newline into the next line, so Mitsubishi
  // Estate's untitled Torch Tower release came back titled "Author:".
  const untitled = ['Title:          ', 'Author:         ', 'Creator:        Word', 'Pages:           8'].join('\n');

  it('leaves an empty title empty rather than taking the next line', () => {
    expect(parsePdfInfo(untitled)).toEqual({ title: undefined, pages: 8 });
  });

  it('reads a real title and page count', () => {
    const info = ['Title:          Project 11 Fact Sheet', 'Author:         Port Houston', 'Pages:          3'].join('\n');
    expect(parsePdfInfo(info)).toEqual({ title: 'Project 11 Fact Sheet', pages: 3 });
  });

  it('ignores a producer that wrote the filename in as the title', () => {
    expect(parsePdfInfo('Title:          release-final.docx\nPages:          2').title).toBeUndefined();
  });
});

describe('sourceKind', () => {
  it('calls a .pdf path a pdf, whatever the host', () => {
    expect(sourceKind('https://www.govinfo.gov/content/pkg/FR-2024-01-02/pdf/2023-28829.pdf')).toBe('pdf');
    expect(sourceKind('https://example.gov/docket/filing.PDF?download=1')).toBe('pdf');
  });
  it('leaves the other kinds alone', () => {
    expect(sourceKind('https://example.com/article-about-a-pdf')).toBe('web');
    expect(sourceKind('https://www.youtube.com/watch?v=abc')).toBe('youtube');
    expect(sourceKind('https://x.com/user/status/1')).toBe('tweet');
    // An episode page that happens to sit under a .pdf-free podcast host.
    expect(sourceKind('https://podcasts.apple.com/us/podcast/x/id1')).toBe('podcast');
  });
});

describe('looksLikePdf', () => {
  it('recognises a PDF by its magic bytes, not its content type', () => {
    expect(looksLikePdf(Buffer.from('%PDF-1.7\n1 0 obj'))).toBe(true);
    // Some producers put a byte-order mark or junk in front of the header.
    expect(looksLikePdf(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('%PDF-1.4')]))).toBe(true);
  });
  it('rejects a block page served as application/pdf', () => {
    expect(looksLikePdf(Buffer.from('<html><body>Just a moment...</body></html>'))).toBe(false);
    expect(looksLikePdf(Buffer.alloc(0))).toBe(false);
  });
  it('does not mistake a PDF mentioned deep in a page for one', () => {
    expect(looksLikePdf(Buffer.from('x'.repeat(2000) + '%PDF'))).toBe(false);
  });
});
