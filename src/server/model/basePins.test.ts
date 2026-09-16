import { describe, expect, it } from 'vitest';
import BasePins from './basePins';
import type BasePin from './basePin';

// A page's previous/next cursors are built from these two, as (start, id).
function page(pins: { id: number; utcStartDateTime: string | Date }[]) {
  const list = new BasePins();
  list.pins = pins as unknown as BasePin[];
  return list;
}

describe('minMaxDateTimePin', () => {
  it('has no ends when the page is empty', () => {
    expect(page([]).minMaxDateTimePin()).toBeNull();
  });

  it('reads the ends off a page in ascending order', () => {
    const range = page([
      { id: 4, utcStartDateTime: '2026-09-07T00:00:00.000Z' },
      { id: 9, utcStartDateTime: '2026-09-08T00:00:00.000Z' },
    ]).minMaxDateTimePin()!;
    expect([range.min.id, range.max.id]).toEqual([4, 9]);
  });

  it('reads them off a page in descending order too', () => {
    const range = page([
      { id: 9, utcStartDateTime: '2026-09-08T00:00:00.000Z' },
      { id: 4, utcStartDateTime: '2026-09-07T00:00:00.000Z' },
    ]).minMaxDateTimePin()!;
    expect([range.min.id, range.max.id]).toEqual([4, 9]);
  });

  // A whole page of all-day pins shares one instant - they all start at
  // midnight UTC - and comparing starts alone reported the ends the wrong way
  // round, so the next page walked back over pins it had just shown.
  it('breaks a tie on the same instant by id', () => {
    const range = page([
      { id: 11, utcStartDateTime: '2026-09-08T00:00:00.000Z' },
      { id: 47, utcStartDateTime: '2026-09-08T00:00:00.000Z' },
    ]).minMaxDateTimePin()!;
    expect([range.min.id, range.max.id]).toEqual([11, 47]);
  });

  // The same instant arrives as a Date on some paths, and two Dates for one
  // moment are never ===, which would drop the tie-break.
  it('breaks the tie when the starts are Date objects', () => {
    const range = page([
      { id: 11, utcStartDateTime: new Date('2026-09-08T00:00:00.000Z') },
      { id: 47, utcStartDateTime: new Date('2026-09-08T00:00:00.000Z') },
    ]).minMaxDateTimePin()!;
    expect([range.min.id, range.max.id]).toEqual([11, 47]);
  });

  it('treats a single pin as both ends', () => {
    const range = page([{ id: 3, utcStartDateTime: '2026-09-08T00:00:00.000Z' }]).minMaxDateTimePin()!;
    expect([range.min.id, range.max.id]).toEqual([3, 3]);
  });
});
