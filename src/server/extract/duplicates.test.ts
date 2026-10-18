import { describe, expect, it } from 'vitest';
import { type EvidencePin, sharedLinks } from './duplicates';

const pin = (sourceUrl: string | null, urls: string[]): EvidencePin => ({
  id: 1,
  title: 't',
  description: null,
  utcStartDateTime: '2026-09-08T00:00:00Z',
  utcEndDateTime: null,
  allDay: true,
  address: null,
  company: null,
  categories: [],
  sourceUrl,
  references: urls.map((url) => ({ url, title: null, confidence: 80, publishedDate: null, startDate: null, endDate: null, reasoning: null })),
});

describe('sharedLinks', () => {
  it('matches source and reference links across pins, ignoring scheme, www and a trailing slash', () => {
    const a = pin('https://en.wikipedia.org/wiki/Western_Sydney_Airport', ['https://www.pm.gov.au/media/opening/', 'https://example.com/only-a']);
    const b = pin('https://youtube.com/watch?v=x', ['http://pm.gov.au/media/opening', 'https://www.en.wikipedia.org/wiki/Western_Sydney_Airport']);
    expect(sharedLinks(a, b)).toEqual(['https://en.wikipedia.org/wiki/Western_Sydney_Airport', 'https://www.pm.gov.au/media/opening/']);
  });

  it('lists a link once however often it repeats, and nothing when no link is shared', () => {
    const a = pin('https://apple.com/shop/buy-iphone/iphone-18-pro', ['https://www.apple.com/shop/buy-iphone/iphone-18-pro']);
    expect(sharedLinks(a, pin(null, ['https://apple.com/shop/buy-iphone/iphone-18-pro/']))).toEqual(['https://apple.com/shop/buy-iphone/iphone-18-pro']);
    expect(sharedLinks(a, pin(null, []))).toEqual([]);
  });
});
