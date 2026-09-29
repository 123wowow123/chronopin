import { describe, expect, it } from 'vitest';
import { botStats } from './botStats';
import { identifyBot } from './bots';

describe('identifyBot', () => {
  it('names the well-known crawlers by kind', () => {
    expect(identifyBot('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toEqual({ name: 'Googlebot', kind: 'search' });
    expect(identifyBot('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) Chrome/116.0.1938.76 Safari/537.36')).toEqual({
      name: 'Bingbot',
      kind: 'search',
    });
    expect(identifyBot('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)')).toEqual({ name: 'GPTBot', kind: 'ai' });
    expect(identifyBot('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)')).toEqual({ name: 'ClaudeBot', kind: 'ai' });
    expect(identifyBot('facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)')).toEqual({ name: 'Facebook', kind: 'social' });
    expect(identifyBot('Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)')).toEqual({ name: 'AhrefsBot', kind: 'other' });
  });

  it('takes the specific name before the family it shares a word with', () => {
    expect(identifyBot('Mozilla/5.0 (compatible; Google-Extended)')?.name).toBe('Google-Extended');
    expect(identifyBot('Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15 (Applebot-Extended/0.1)')?.name).toBe(
      'Applebot-Extended',
    );
  });

  it('counts scripts, headless browsers and a missing user agent as other', () => {
    expect(identifyBot('curl/8.7.1')).toEqual({ name: 'curl', kind: 'other' });
    expect(identifyBot('python-requests/2.32.3')).toEqual({ name: 'Python', kind: 'other' });
    expect(identifyBot('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/128.0.0.0 Safari/537.36')?.name).toBe('HeadlessChrome');
    expect(identifyBot('')).toEqual({ name: 'No user agent', kind: 'other' });
    expect(identifyBot(null)).toEqual({ name: 'No user agent', kind: 'other' });
  });

  it('names an unknown bot from its own user agent', () => {
    expect(identifyBot('Mozilla/5.0 (compatible; FooCrawlerBot/3.1; +https://foo.example)')).toEqual({ name: 'FooCrawlerBot', kind: 'other' });
    expect(identifyBot('acme-spider (+https://acme.example/spider)')).toEqual({ name: 'acme-spider', kind: 'other' });
  });

  it('leaves browsers alone', () => {
    expect(identifyBot('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36')).toBeNull();
    expect(identifyBot('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1')).toBeNull();
    expect(identifyBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0')).toBeNull();
  });
});

describe('botStats', () => {
  it('sums each kind into the range and leaves older days out', () => {
    const now = new Date('2026-09-23T12:00:00Z');
    const stats = botStats(
      [
        { day: '2026-01-01', search: 50, ai: 0, social: 0, other: 0 },
        { day: '2026-09-22', search: 3, ai: 2, social: 1, other: 0 },
        { day: '2026-09-23', search: 1, ai: 4, social: 0, other: 2 },
      ],
      '30d',
      now,
    );
    expect(stats.unit).toBe('day');
    expect(stats.byKind).toEqual({ search: 4, ai: 6, social: 1, other: 2 });
    expect(stats.requests).toBe(13);
    expect(stats.buckets.at(-1)).toEqual({ start: '2026-09-23T00:00:00.000Z', search: 1, ai: 4, social: 0, other: 2 });
  });
});
