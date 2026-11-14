import { describe, expect, it } from 'vitest';
import { electionSearchYear } from './elections';

describe('electionSearchYear', () => {
  it('opens the newest year for the bare word', () => {
    expect(electionSearchYear('election', [2024, 2026])).toBe(2026);
    expect(electionSearchYear('Elections results', [2026])).toBe(2026);
  });
  it('honours a year in the text, and none that is not held', () => {
    expect(electionSearchYear('2024 election', [2024, 2026])).toBe(2024);
    expect(electionSearchYear('election 2020', [2024, 2026])).toBeNull();
  });
  it('ignores text without the word', () => {
    expect(electionSearchYear('electric cars', [2026])).toBeNull();
    expect(electionSearchYear('', [2026])).toBeNull();
  });
});
