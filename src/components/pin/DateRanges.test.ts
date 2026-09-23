import { describe, expect, it } from 'vitest';
import { formatDayRange } from './DateRanges';

describe('formatDayRange', () => {
  // Node's ICU puts thin spaces around the dash where the browser's has plain
  // ones; a server-rendered range that differs from the client's breaks hydration.
  it('uses plain spaces, whatever ICU the runtime ships', () => {
    const range = formatDayRange('2026-03-13', '2026-03-14');
    expect(range).toBe('Mar 13 – 14, 2026');
    expect(range).not.toMatch(/[  ]/);
  });
});
