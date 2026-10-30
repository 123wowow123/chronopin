import { beforeEach, describe, expect, it } from 'vitest';
import { BURST, PER_SECOND, SHARED_BURST, SHARED_PER_SECOND, GOOGLE_PER_MINUTE, SHED_RETRY_AFTER, botRetryAfter, shedding, pinRetryAfter, PIN_BURST } from './botLimit';
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

import { ipRetryAfter, IP_BURST, LIGHT_BURST, PREFETCH_COST } from './botLimit';
describe('ipRetryAfter', () => {
  it('lets a burst through, then asks the address to wait', () => {
    const now = 1_000_000;
    for (let i = 0; i < IP_BURST; i++) expect(ipRetryAfter('ip:203.0.113.9', false, now)).toBeNull();
    expect(ipRetryAfter('ip:203.0.113.9', false, now)).toBeGreaterThan(0);
    expect(ipRetryAfter('ip:203.0.113.10', false, now)).toBeNull();
    expect(ipRetryAfter('ip:', false, now)).toBeNull();
  });
  it('gives the heavy user plan a looser but real limit', () => {
    const now = 2_000_000;
    for (let i = 0; i < LIGHT_BURST; i++) expect(ipRetryAfter('u:7', true, now)).toBeNull();
    expect(ipRetryAfter('u:7', true, now)).toBeGreaterThan(0);
  });
  it('charges a prefetch a quarter of a request', () => {
    const now = 3_000_000;
    for (let i = 0; i < IP_BURST * 4; i++) expect(ipRetryAfter('ip:198.51.100.1', false, now, PREFETCH_COST)).toBeNull();
    expect(ipRetryAfter('ip:198.51.100.1', false, now, PREFETCH_COST)).toBeGreaterThan(0);
  });
});

describe('pinRetryAfter', () => {
  beforeEach(() => {
    delete (globalThis as unknown as { __chronopinPinLimits?: unknown }).__chronopinPinLimits;
  });
  it('lets a client open a burst of pins, then one every 1.3 seconds', () => {
    for (let i = 0; i < PIN_BURST; i++) expect(pinRetryAfter('a', 1_000)).toBeNull();
    expect(pinRetryAfter('a', 1_000)).toBe(2);
    expect(pinRetryAfter('a', 3_000)).toBeNull();
    expect(pinRetryAfter('a', 3_000)).not.toBeNull();
  });
  it('keeps clients apart and ignores an empty id', () => {
    for (let i = 0; i < PIN_BURST; i++) pinRetryAfter('a', 1_000);
    expect(pinRetryAfter('b', 1_000)).toBeNull();
    expect(pinRetryAfter('', 1_000)).toBeNull();
  });
  it('charges a prefetch a quarter', () => {
    for (let i = 0; i < PIN_BURST * 4; i++) expect(pinRetryAfter('p', 1_000, 0.25)).toBeNull();
    expect(pinRetryAfter('p', 1_000, 0.25)).not.toBeNull();
  });
});

import { searchRetryAfter, SEARCH_BURST } from './botLimit';
describe('searchRetryAfter', () => {
  beforeEach(() => {
    delete (globalThis as unknown as { __chronopinSearchLimits?: unknown }).__chronopinSearchLimits;
  });
  it('lets a client run a burst of searches, then one every 2 seconds', () => {
    for (let i = 0; i < SEARCH_BURST; i++) expect(searchRetryAfter('a', 1_000)).toBeNull();
    expect(searchRetryAfter('a', 1_000)).toBe(2);
    expect(searchRetryAfter('a', 3_000)).toBeNull();
    expect(searchRetryAfter('a', 3_000)).not.toBeNull();
  });
  it('is separate from the pin budget and from other clients', () => {
    for (let i = 0; i < SEARCH_BURST; i++) searchRetryAfter('a', 1_000);
    expect(pinRetryAfter('a', 1_000)).toBeNull();
    expect(searchRetryAfter('b', 1_000)).toBeNull();
  });
});

import { bareSearchRetryAfter, BARE_SEARCH_BURST, BARE_SEARCH_PER_SECOND } from './botLimit';
describe('searches with no Referer', () => {
  beforeEach(() => {
    delete (globalThis as unknown as { __chronopinBareSearch?: unknown }).__chronopinBareSearch;
  });
  it('never limits them while the server is healthy', () => {
    const now = 20_000_000;
    for (let i = 0; i < BARE_SEARCH_BURST * 5; i++) expect(bareSearchRetryAfter(now, false)).toBeNull();
  });
  it('shares one bucket while shedding, then refills', () => {
    const now = 21_000_000;
    for (let i = 0; i < BARE_SEARCH_BURST; i++) expect(bareSearchRetryAfter(now, true)).toBeNull();
    expect(bareSearchRetryAfter(now, true)).toBeGreaterThan(0);
    expect(bareSearchRetryAfter(now + 2_000 / BARE_SEARCH_PER_SECOND, true)).toBeNull();
    expect(bareSearchRetryAfter(now, false)).toBeNull();
  });
});

import { localeMismatch, mismatchRetryAfter, MISMATCH_BURST } from './botLimit';
describe('locale mismatch cohort', () => {
  it('flags a Chinese browser on another language, not on Chinese or English paths', () => {
    expect(localeMismatch('zh-CN,zh;q=0.9', 'it')).toBe(true);
    expect(localeMismatch('zh', 'hi')).toBe(true);
    expect(localeMismatch('zh-CN,zh;q=0.9', 'zh')).toBe(false);
    expect(localeMismatch('zh-CN', 'zh-TW')).toBe(false);
    expect(localeMismatch('zh-CN', null)).toBe(false);
    expect(localeMismatch('en-US,en;q=0.9', 'it')).toBe(false);
    expect(localeMismatch(null, 'it')).toBe(false);
  });
  it('limits the cohort only while shedding', () => {
    const now = 9_000_000;
    for (let i = 0; i < MISMATCH_BURST * 3; i++) expect(mismatchRetryAfter(now, false)).toBeNull();
    for (let i = 0; i < MISMATCH_BURST; i++) expect(mismatchRetryAfter(now, true)).toBeNull();
    expect(mismatchRetryAfter(now, true)).toBeGreaterThan(0);
    expect(mismatchRetryAfter(now, false)).toBeNull();
  });
});

import { chinaRetryAfter, isChineseAddress, CHINA_VISITORS_PER_MINUTE } from './botLimit';

describe('Chinese address limit', () => {
  beforeEach(() => {
    delete (globalThis as unknown as { __chronopinChina?: unknown }).__chronopinChina;
  });
  it('recognises Chinese and other addresses', async () => {
    expect(await isChineseAddress('114.114.114.114')).toBe(true);
    expect(await isChineseAddress('8.8.8.8')).toBe(false);
    expect(await isChineseAddress('2400:3200::1')).toBe(true);
    expect(await isChineseAddress('2001:4860:4860::8888')).toBe(false);
  });
  it('admits 60 addresses a minute, keeps those, refuses new ones, then resets', () => {
    for (let i = 0; i < CHINA_VISITORS_PER_MINUTE; i++) expect(chinaRetryAfter(`1.0.0.${i}`, 1_000)).toBeNull();
    expect(chinaRetryAfter('1.0.0.0', 2_000)).toBeNull();
    expect(chinaRetryAfter('1.0.1.0', 2_000)).toBe(59);
    expect(chinaRetryAfter('1.0.1.0', 61_000)).toBeNull();
  });
});
