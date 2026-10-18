import { describe, expect, it } from 'vitest';
import type { CardPin, NewPin } from '@/lib/types';
import { withLivePin } from './NewPins';

const listed: NewPin = {
  id: 7,
  title: 'Launch',
  category: 'Space',
  utcStartDateTime: '2026-10-01T00:00:00.000Z',
  allDay: true,
  utcCreatedDateTime: '2026-09-24T10:00:00.000Z',
  hasMarket: false,
};

const broadcast = {
  id: 7,
  title: 'Launch',
  categories: ['Space'],
  utcStartDateTime: '2026-10-01T00:00:00.000Z',
  allDay: true,
  media: [{ type: 1, thumbName: 'abc.jpeg', originalUrl: 'https://example.com/a.jpg' }],
} as unknown as CardPin;

describe('withLivePin', () => {
  it('takes the picture from a save whose row was listed before its media were written', () => {
    const [row] = withLivePin([listed], 'pin:save', broadcast, false);
    expect(row.thumbName).toBe('abc.jpeg');
    expect(row.utcCreatedDateTime).toBe(listed.utcCreatedDateTime);
  });

  it('puts a new save at the top', () => {
    const other = { ...listed, id: 3 };
    expect(withLivePin([other], 'pin:save', broadcast, false).map((p) => p.id)).toEqual([7, 3]);
  });

  it('leaves the list alone for a like', () => {
    const list = [listed];
    expect(withLivePin(list, 'pin:like', broadcast, false)).toBe(list);
  });
});
