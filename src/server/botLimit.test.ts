import { describe, expect, it } from 'vitest';
import { BURST, PER_SECOND, botRetryAfter } from './botLimit';
import { identifyBot } from '@/lib/bots';

describe('botRetryAfter', () => {
  it('shares ShapBot\'s budget across user-agent casing and versions', () => {
    const t0 = 4_000_000;
    const bot = identifyBot('Mozilla/5.0 (compatible; ShapBot/1.0)');
    expect(bot).toEqual({ name: 'ShapBot', kind: 'other' });
    for (let i = 0; i < BURST; i++) expect(botRetryAfter(bot, t0)).toBeNull();
    expect(botRetryAfter(identifyBot('shapbot/2.0'), t0)).toBe(Math.ceil(1 / PER_SECOND));
    expect(botRetryAfter(bot, t0 + 1000 / PER_SECOND)).toBeNull();
    expect(botRetryAfter(bot, t0 + 1000 / PER_SECOND)).not.toBeNull();
  });

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

  it('holds SEO scrapers to the pace but not curl or monitors', () => {
    const t0 = 3_000_000;
    for (let i = 0; i < BURST; i++) {
      botRetryAfter({ name: 'SemrushBot', kind: 'other' }, t0);
      expect(botRetryAfter({ name: 'curl', kind: 'other' }, t0)).toBeNull();
    }
    expect(botRetryAfter({ name: 'SemrushBot', kind: 'other' }, t0)).not.toBeNull();
    expect(botRetryAfter({ name: 'curl', kind: 'other' }, t0)).toBeNull();
  });

  it('gives each AI crawler its own budget', () => {
    const t0 = 2_000_000;
    for (let i = 0; i < BURST; i++) botRetryAfter({ name: 'TestAiBot-a', kind: 'ai' }, t0);
    expect(botRetryAfter({ name: 'TestAiBot-a', kind: 'ai' }, t0)).not.toBeNull();
    expect(botRetryAfter({ name: 'TestAiBot-b', kind: 'ai' }, t0)).toBeNull();
  });
});
