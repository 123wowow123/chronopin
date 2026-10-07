import { describe, expect, it } from 'vitest';
import { openingDateLabel, openingGroup } from './restaurants';
import { blobUrl, smallThumbName } from './appConfig';

describe('regional restaurant opening status', () => {
  it('preserves public restaurant images in pin cards and detail galleries', () => {
    const image = '/restaurant-images/new-york/top/le-bernardin.webp';
    expect(blobUrl(image)).toBe(image);
    expect(smallThumbName(image)).toBe(image);
    expect(smallThumbName('https://example.com/photo.webp')).toBe('https://example.com/photo.webp');
    expect(smallThumbName('photo.webp')).toBe('s/photo.webp');
  });
  it('includes the 90th day but excludes older confirmed openings', () => {
    expect(openingGroup({ day: '2026-07-08', confirmed: true }, '2026-10-06')).toBe('new');
    expect(openingGroup({ day: '2026-07-07', confirmed: true }, '2026-10-06')).toBeNull();
  });
  it('does not turn a passed announcement into a confirmed opening', () => {
    expect(openingGroup({ day: '2026-09-30', confirmed: false }, '2026-10-06')).toBe('upcoming');
    expect(openingGroup({ day: '2026-10-06', confirmed: false }, '2026-10-06')).toBe('upcoming');
    expect(openingGroup({ day: '2026-06-30', confirmed: false }, '2026-10-06')).toBeNull();
  });
  it('compares calendar days, including opening today and future-year dates', () => {
    expect(openingGroup({ day: '2026-10-06', confirmed: true }, '2026-10-06')).toBe('new');
    expect(openingGroup({ day: '2027-01-31', confirmed: false }, '2026-10-06')).toBe('upcoming');
  });
  it('keeps estimated months and seasons distinct from confirmed exact dates', () => {
    expect(openingDateLabel('2026-10-31', true)).toBe('Oct 2026');
    expect(openingDateLabel('2026-12-31', true, 'Opening early winter 2026')).toBe('Early winter 2026');
    expect(openingDateLabel('2026-12-20', true, 'Official site says fall 2026')).toBe('Fall 2026');
    expect(openingDateLabel('2026-12-31', true, 'Late 2026 target')).toBe('Late 2026');
    expect(openingDateLabel('2027-03-31', true, 'Early 2027 target')).toBe('Early 2027');
    expect(openingDateLabel('2026-08-28', false)).toBe('Aug 28, 2026');
  });
});
