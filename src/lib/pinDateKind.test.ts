import { describe, expect, it } from 'vitest';
import { pinDateKind } from './pinDateKind';

describe('pinDateKind', () => {
  it('words a build as construction whatever else it has', () => {
    expect(pinDateKind([{ name: 'In Progress' }], true, ['Semiconductors'])).toBe('construction');
  });
  it('words a chip timeline as hardware and any other timeline as a program', () => {
    expect(pinDateKind([], true, ['Semiconductors', 'AI'])).toBe('hardware');
    expect(pinDateKind([], true, ['Space'])).toBe('program');
  });
  it('leaves pins without a timeline alone', () => {
    expect(pinDateKind([], false, ['Semiconductors'])).toBeUndefined();
  });
  it('calls the single date of a finished build its completion', () => {
    expect(pinDateKind([{ name: 'Completed' }], false, [], false)).toBe('completed');
    expect(pinDateKind([{ name: 'Completed' }], false, [], true)).toBe('construction');
  });
});
