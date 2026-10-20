import { describe, expect, it } from 'vitest';
import { parseSearchQuery } from '../util/searchQuery';
import { withoutRedundantText } from './search';

describe('withoutRedundantText', () => {
  it('drops text a company: value already says', () => {
    expect(withoutRedundantText(parseSearchQuery('nvidia company:NVIDIA')).text).toBe('');
    expect(withoutRedundantText(parseSearchQuery('electronic company:"Electronic Arts"')).text).toBe('');
  });
  it('keeps text that adds words', () => {
    expect(withoutRedundantText(parseSearchQuery('nvidia earnings company:NVIDIA')).text).toBe('nvidia earnings');
  });
  it('keeps text with no label', () => {
    expect(withoutRedundantText(parseSearchQuery('nvidia')).text).toBe('nvidia');
  });
});
