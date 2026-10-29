import { describe, expect, it } from 'vitest';
import { hasGamePerf } from './pinGamePerf';

const none = { gameplay: null, story: null, visuals: null, audio: null, content: null, polish: null, acclaim: null };

describe('hasGamePerf', () => {
  it('hides a radar with fewer than 3 scored axes', () => {
    expect(hasGamePerf({ ...none, gameplay: 4, acclaim: 3.5 })).toBe(false);
  });
  it('shows one with 3 or more', () => {
    expect(hasGamePerf({ ...none, gameplay: 4, story: 3, acclaim: 3.5 })).toBe(true);
  });
  it('rejects an invalid score', () => {
    expect(hasGamePerf({ ...none, gameplay: 4, story: 3, acclaim: 3.3 })).toBe(false);
  });
});
