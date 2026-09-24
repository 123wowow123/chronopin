import { describe, expect, it } from 'vitest';
import { BURST, PER_SECOND, botRetryAfter } from './botLimit';

describe('botRetryAfter', () => {
  it('never limits browsers, search engines or link previews', () => {
    for (let i = 0; i < BURST * 3; i++) {
      expect(botRetryAfter(null, 0)).toBeNull();
      expect(botRetryAfter({ name: 'Googlebot', kind: 'search' }, 0)).toBeNull();
      expect(botRetryAfter({ name: 'Facebook', kind: 'social' }, 0)).toBeNull();
    }
  });

  it('lets an AI crawler burst, then holds it to a steady pace', () => {
    const bot = { name: 'TestAiBot-pace', kind: 'ai' } as const;
    const t0 = 1_000_000;
    for (let i = 0; i < BURST; i++) expect(botRetryAfter(bot, t0)).toBeNull();
    expect(botRetryAfter(bot, t0)).toBe(Math.ceil(1 / PER_SECOND));
    expect(botRetryAfter(bot, t0 + 1000 / PER_SECOND)).toBeNull();
    expect(botRetryAfter(bot, t0 + 1000 / PER_SECOND)).not.toBeNull();
  });

  it('gives each AI crawler its own budget', () => {
    const t0 = 2_000_000;
    for (let i = 0; i < BURST; i++) botRetryAfter({ name: 'TestAiBot-a', kind: 'ai' }, t0);
    expect(botRetryAfter({ name: 'TestAiBot-a', kind: 'ai' }, t0)).not.toBeNull();
    expect(botRetryAfter({ name: 'TestAiBot-b', kind: 'ai' }, t0)).toBeNull();
  });
});
