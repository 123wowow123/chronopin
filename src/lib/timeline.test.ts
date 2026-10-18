import { describe, expect, it } from 'vitest';
import { pinTense } from './timeline';

const now = '2026-09-15T12:00:00Z';
const today = '2026-09-15';

describe('pinTense', () => {
  it('reads a timed pin by its instants', () => {
    expect(pinTense({ utcStartDateTime: '2026-09-15T11:00:00Z' }, now, today)).toBe('past');
    expect(pinTense({ utcStartDateTime: '2026-09-15T13:00:00Z' }, now, today)).toBe('future');
    expect(pinTense({ utcStartDateTime: '2026-09-15T11:00:00Z', utcEndDateTime: '2026-09-15T13:00:00Z' }, now, today)).toBe('ongoing');
    expect(pinTense({ utcStartDateTime: '2026-09-01T00:00:00Z', utcEndDateTime: '2026-09-15T12:00:00Z' }, now, today)).toBe('past');
  });

  it('reads an all-day pin by its dates against the viewer’s today', () => {
    expect(pinTense({ utcStartDateTime: '2026-09-15T00:00:00Z', allDay: true }, now, today)).toBe('ongoing');
    expect(pinTense({ utcStartDateTime: '2026-09-14T00:00:00Z', allDay: true }, now, today)).toBe('past');
    expect(pinTense({ utcStartDateTime: '2026-09-16T00:00:00Z', allDay: true }, now, today)).toBe('future');
    // The end is exclusive: a run ending the 15th finished on the 14th.
    expect(pinTense({ utcStartDateTime: '2026-09-10T00:00:00Z', utcEndDateTime: '2026-09-15T00:00:00Z', allDay: true }, now, today)).toBe('past');
    expect(pinTense({ utcStartDateTime: '2026-09-10T00:00:00Z', utcEndDateTime: '2026-09-16T00:00:00Z', allDay: true }, now, today)).toBe('ongoing');
    // Late on the 15th in UTC is already the 16th for a viewer in Tokyo.
    expect(pinTense({ utcStartDateTime: '2026-09-15T00:00:00Z', allDay: true }, '2026-09-15T20:00:00Z', '2026-09-16')).toBe('past');
  });
});
