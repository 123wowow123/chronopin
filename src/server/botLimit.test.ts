import { beforeEach, describe, expect, it } from 'vitest';
import { BURST, PER_SECOND, SHARED_BURST, SHARED_PER_SECOND, GOOGLE_PER_MINUTE, SHED_RETRY_AFTER, botRetryAfter, shedding } from './botLimit';
import { identifyBot } from '@/lib/bots';

describe('botRetryAfter', () => {
  beforeEach(() => {
    delete (globalThis as unknown as { __chronopinCrawlerLimits?: unknown }).__chronopinCrawlerLimits;
    delete (globalThis as unknown as { __chronopinShed?: unknown }).__chronopinShed;
  });

  it('holds Google\'s crawlers to 10 requests a minute while the server is slow, and not before', () => {
    const google = { name: 'Googlebot', kind: 'search' as const };
    const image = { name: 'Googlebot-Image', kind: 'search' as const };
    // Not slow: no limit at all.
    expect(shedding(10_000, () => ({ loopMs: 0, loadPerCore: 0.1 }))).toBe(false);
    for (let i = 0; i < GOOGLE_PER_MINUTE * 5; i++) expect(botRetryAfter(google, 10_001)).toBeNull();
    // Slow: ten between all Google crawlers, then they are told to wait.
    expect(shedding(20_000, () => ({ loopMs: 3_000, loadPerCore: 0.1 }))).toBe(true);
    for (let i = 0; i < GOOGLE_PER_MINUTE / 2; i++) expect(botRetryAfter(google, 20_001)).toBeNull();
    for (let i = 0; i < GOOGLE_PER_MINUTE / 2; i++) expect(botRetryAfter(image, 20_001)).toBeNull();
    expect(botRetryAfter(google, 20_001)).toBe(6);
    expect(botRetryAfter(image, 20_001)).toBe(6);
    // One request every six seconds thereafter.
    expect(botRetryAfter(google, 26_001)).toBeNull();
    expect(botRetryAfter(google, 26_001)).not.toBeNull();
  });

  it('turns AI crawlers and scrapers away while the server is slow, but not Google outright', () => {
    expect(shedding(10_000, () => ({ loopMs: 2_000, loadPerCore: 0.2 }))).toBe(true);
    expect(botRetryAfter({ name: 'GPTBot', kind: 'ai' }, 10_001)).toBe(SHED_RETRY_AFTER);
    expect(botRetryAfter({ name: 'AhrefsBot', kind: 'other' }, 10_001)).toBe(SHED_RETRY_AFTER);
    expect(botRetryAfter({ name: 'Google-Extended', kind: 'ai' }, 10_001)).toBeNull();
    expect(botRetryAfter({ name: 'Googlebot', kind: 'search' }, 10_001)).toBeNull();
    expect(botRetryAfter(null, 10_001)).toBeNull();
  });

  it('keeps shedding until the load is clearly down', () => {
    expect(shedding(10_000, () => ({ loopMs: 0, loadPerCore: 2.5 }))).toBe(true);
    expect(shedding(20_000, () => ({ loopMs: 0, loadPerCore: 1.7 }))).toBe(true);
    expect(shedding(30_000, () => ({ loopMs: 0, loadPerCore: 1.0 }))).toBe(false);
    expect(shedding(40_000, () => ({ loopMs: 0, loadPerCore: 1.7 }))).toBe(false);
  });

  it('shares ShapBot\'s budget across user-agent casing and versions', () => {
    const t0 = 4_000_000;
    const bot = identifyBot('Mozilla/5.0 (compatible; ShapBot/1.0)');
    expect(bot).toEqual({ name: 'ShapBot', kind: 'other' });
    for (let i = 0; i < BURST; i++) expect(botRetryAfter(bot, t0)).toBeNull();
    expect(botRetryAfter(identifyBot('shapbot/2.0'), t0)).toBe(Math.ceil(1 / PER_SECOND));
    expect(botRetryAfter(bot, t0 + 1000 / PER_SECOND)).toBeNull();
    expect(botRetryAfter(bot, t0 + 1000 / PER_SECOND)).not.toBeNull();
  });

  it('never limits browsers, other search engines or link previews', () => {
    for (let i = 0; i < BURST * 3; i++) {
      expect(botRetryAfter(null, 0)).toBeNull();
      expect(botRetryAfter({ name: 'Googlebot', kind: 'search' }, 0)).toBeNull();
      expect(botRetryAfter({ name: 'Facebook', kind: 'social' }, 0)).toBeNull();
    }
  });

  it.each(['ExaSearchBot/1.0', 'ExaBot/1.0 (+https://exa.ai/bot)', 'keenablebot/1.0', 'Keenable-User/1.0', 'aionbot/1.0', 'Applebot/0.1'])(
    'limits the newly covered crawler %s', (ua) => {
      const bot = identifyBot(ua);
      expect(bot).not.toBeNull();
      for (let i = 0; i < BURST; i++) expect(botRetryAfter(bot, 0)).toBeNull();
      expect(botRetryAfter(bot, 0)).toBe(2);
    },
  );

  it('bounds the combined load and refills the shared budget', () => {
    for (let i = 0; i < SHARED_BURST; i++) {
      expect(botRetryAfter({ name: `Crawler-${i}`, kind: 'ai' }, 0)).toBeNull();
    }
    const newcomer = { name: 'AnotherCrawler', kind: 'ai' } as const;
    expect(botRetryAfter(newcomer, 0)).toBe(Math.ceil(1 / SHARED_PER_SECOND));
    expect(botRetryAfter(null, 0)).toBeNull();
    expect(botRetryAfter({ name: 'Googlebot', kind: 'search' }, 0)).toBeNull();
    expect(botRetryAfter(newcomer, 1000 / SHARED_PER_SECOND)).toBeNull();
    expect(botRetryAfter(newcomer, 1000 / SHARED_PER_SECOND)).toBe(1);
  });

  it('does not spend shared tokens when the individual bot is limited', () => {
    const noisy = { name: 'NoisyCrawler', kind: 'ai' } as const;
    for (let i = 0; i < BURST; i++) expect(botRetryAfter(noisy, 0)).toBeNull();
    for (let i = 0; i < BURST * 3; i++) expect(botRetryAfter(noisy, 0)).toBe(2);
    for (let i = 0; i < SHARED_BURST - BURST; i++) {
      expect(botRetryAfter({ name: `OtherCrawler-${i}`, kind: 'ai' }, 0)).toBeNull();
    }
    expect(botRetryAfter({ name: 'LastCrawler', kind: 'ai' }, 0)).toBe(1);
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
