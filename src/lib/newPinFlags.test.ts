import { describe, expect, it } from 'vitest';
import { newPinFlags } from './newPinFlags';

const long = 'x'.repeat(1000);
const refs = [{ url: 'https://a.test' }, { url: 'https://b.test' }] as never;

describe('newPinFlags', () => {
  it('is empty for a full pin with no rubric kind', () => {
    expect(newPinFlags({ description: long, sourceUrl: 'https://s.test', references: refs, categories: ['Elections'] })).toEqual([]);
  });

  it('flags a thin pin and a food pin without its rubric', () => {
    const flags = newPinFlags({ description: 'short', sourceUrl: 'https://s.test', categories: ['Food'] });
    expect(flags).toHaveLength(3);
    expect(flags[2]).toMatch(/taste or dining rubric/);
  });

  it('asks a restaurant guide pin for a dining rubric', () => {
    const tags = [{ name: 'Restaurant', kind: 'topic', source: 'user' }] as never;
    expect(newPinFlags({ description: long, sourceUrl: 'https://s.test', references: refs, categories: ['Food'], tags })[0]).toMatch(/dining rubric/);
  });
});
