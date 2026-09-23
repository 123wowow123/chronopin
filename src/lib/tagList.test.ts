import { describe, expect, it } from 'vitest';
import { DEFAULT_TAG_LIST, parseTagList } from './tagList';

describe('parseTagList', () => {
  it('is off by default: the Tags row opens the big cloud', () => {
    expect(DEFAULT_TAG_LIST).toEqual({ enabled: false });
  });

  it('takes true or false and nothing else', () => {
    expect(parseTagList({ enabled: true })).toEqual({ setting: { enabled: true } });
    expect(parseTagList({ enabled: false })).toEqual({ setting: { enabled: false } });
    for (const value of [{ enabled: 'yes' }, {}, null, [true], 'on']) {
      expect(parseTagList(value)).toHaveProperty('problem');
    }
  });
});
