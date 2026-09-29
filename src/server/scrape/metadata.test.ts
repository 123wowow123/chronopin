import { describe, expect, it } from 'vitest';
import { isoDay, metadataFields, stripSiteName } from './metadata';

describe('stripSiteName', () => {
  it('drops the site from either end of a title', () => {
    expect(stripSiteName('Bridge Opens | Example News', 'Example News')).toBe('Bridge Opens');
    expect(stripSiteName('Example News - Bridge Opens', 'Example News')).toBe('Bridge Opens');
  });
  it('drops a site the host names when there is no og:site_name', () => {
    expect(stripSiteName('Gordie Howe International Bridge - Wikipedia', undefined, 'en.wikipedia.org')).toBe('Gordie Howe International Bridge');
  });
  it('leaves a title alone when the suffix is not the site', () => {
    expect(stripSiteName('Bridge Opens | Detroit', 'Example News')).toBe('Bridge Opens | Detroit');
  });
});

describe('isoDay', () => {
  it('reads a bare date as an all-day UTC day and a datetime as timed', () => {
    expect(isoDay('2026-09-18')).toEqual({ iso: '2026-09-18T00:00:00.000Z', allDay: true });
    expect(isoDay('2026-09-18T16:00:00Z')).toEqual({ iso: '2026-09-18T16:00:00.000Z', allDay: false });
    expect(isoDay('soon')).toBeUndefined();
  });
});

describe('metadataFields', () => {
  it('takes the title, description and tags from the meta tags', () => {
    const f = metadataFields({ ogTitle: 'Bridge Opens | Example', siteName: 'Example', description: '<b>A</b> new span.', keywords: ['bridge', 'Bridge', 'Detroit'] });
    expect(f.title).toBe('Bridge Opens');
    expect(f.description).toBe('A new span.');
    expect(f.tags).toEqual(['bridge', 'Detroit']);
    expect(f.startDateTime).toBeUndefined();
  });
  it('dates an Event by its own start, scheduled, with its place', () => {
    const f = metadataFields({
      jsonLd: [{ '@type': 'Event', name: 'Grand Opening', startDate: '2026-10-01T10:00:00Z', location: { name: 'City Hall', address: { addressLocality: 'Detroit', addressRegion: 'MI' } } }],
    });
    expect(f.title).toBe('Grand Opening');
    expect(f.startDateTime).toBe('2026-10-01T10:00:00.000Z');
    expect(f.dateConfidence).toBe('scheduled');
    expect(f.placeLabel).toBe('City Hall, Detroit, MI');
  });
  it('falls back to the publish date, marked unknown', () => {
    const f = metadataFields({ title: 'A page', published: '2026-09-17T08:00:00Z' });
    expect(f.dateConfidence).toBe('unknown');
    expect(f.dateConfidenceReasoning).toMatch(/publish date/);
  });
  it('prefers og:title to an article headline that is really a description', () => {
    const f = metadataFields({ ogTitle: 'Gordie Howe International Bridge', jsonLd: [{ '@type': 'Article', headline: 'crossing of the Detroit River' }] });
    expect(f.title).toBe('Gordie Howe International Bridge');
  });
  it('reads a product offer price', () => {
    const f = metadataFields({ jsonLd: [{ '@type': 'Product', offers: { price: '499.00', priceCurrency: 'USD' } }] });
    expect(f.price).toBe(499);
    expect(f.priceCurrency).toBe('USD');
  });
  it('says nothing when there is no metadata', () => {
    expect(metadataFields(undefined)).toEqual({});
  });
});
