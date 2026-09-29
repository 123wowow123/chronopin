import { describe, expect, it } from 'vitest';
import { addedReferences, changedDay, mergeChanges, pinChanges } from './pinUpdates';

describe('pinChanges', () => {
  const before = {
    title: "LAX's SkyLink Reaches Its December 8 Deadline",
    description: 'Must carry passengers by 8 December.',
    longFormSummary: '<ul><li>Longstop 8 December [S]</li></ul>',
    utcStartDateTime: new Date('2026-12-08T00:00:00Z'),
    utcEndDateTime: null,
    allDay: true,
    address: 'Center Way, Los Angeles',
    price: 1200000000,
  };

  it('lists only the fields that changed, dates as instants', () => {
    const after = { ...before, title: "LAX's SkyLink Could Open on January 6", utcStartDateTime: '2027-01-06T00:00:00.000Z', price: '1200000000' };
    expect(pinChanges(before, after)).toEqual([
      { field: 'title', before: before.title, after: after.title },
      { field: 'start', before: '2026-12-08T00:00:00.000Z', after: '2027-01-06T00:00:00.000Z', allDay: true },
    ]);
  });

  it('treats blank and missing as the same', () => {
    expect(pinChanges({ ...before, address: '' }, { ...before, address: null })).toEqual([]);
    expect(pinChanges({ ...before, description: ' x ' }, { ...before, description: 'x' })).toEqual([]);
  });
});

describe('mergeChanges', () => {
  it('keeps the first before and the last after, dropping a field that came back', () => {
    const merged = mergeChanges(
      [
        { field: 'start', before: 'a', after: 'b', allDay: true },
        { field: 'title', before: 'x', after: 'y' },
      ],
      [
        { field: 'title', before: 'y', after: 'x' },
        { field: 'longFormSummary', before: 'old', after: 'new' },
      ],
    );
    expect(merged).toEqual([
      { field: 'start', before: 'a', after: 'b', allDay: true },
      { field: 'longFormSummary', before: 'old', after: 'new' },
    ]);
  });
});

describe('addedReferences', () => {
  it('finds the pages the edit added, whatever their scheme or trailing slash', () => {
    const had = [{ url: 'https://www.example.com/a' }];
    expect(addedReferences(had, [{ url: 'http://example.com/a/' }, { url: 'https://example.com/b' }]).map((r) => r.url)).toEqual(['https://example.com/b']);
  });
});

describe('changedDay', () => {
  it("shows an all-day pin's exclusive end as its last day", () => {
    expect(changedDay('2026-12-09T00:00:00.000Z', true, 'end')).toBe('2026-12-08T00:00:00.000Z');
    expect(changedDay('2026-12-09T00:00:00.000Z', true, 'start')).toBe('2026-12-09T00:00:00.000Z');
  });
});
