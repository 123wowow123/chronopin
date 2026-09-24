import { describe, expect, it } from 'vitest';
import { cleanStreamingUrl, streamingMerchants, streamingService, watchOrder } from './streaming';

describe('streamingService', () => {
  it('knows a service by its host, subdomains included', () => {
    expect(streamingService('https://www.netflix.com/title/81726714')?.label).toBe('Netflix');
    expect(streamingService('https://crunchyroll.com/series/GG5H5XQX4')?.label).toBe('Crunchyroll');
    expect(streamingService('https://play.hbomax.com/show/93ba22b1')?.label).toBe('HBO Max');
    expect(streamingService('https://play.max.com/show/93ba22b1')?.label).toBe('HBO Max');
  });

  it('counts only the video pages of amazon.com as Prime Video', () => {
    expect(streamingService('https://www.amazon.com/gp/video/detail/B0B8TR8Y2K')?.label).toBe('Prime Video');
    expect(streamingService('https://www.primevideo.com/detail/0FCJ')?.label).toBe('Prime Video');
    expect(streamingService('https://www.amazon.com/dp/B0CHX1W1XY')).toBeUndefined();
  });

  it('is nothing for other sites, look-alike hosts and junk', () => {
    expect(streamingService('https://www.youtube.com/playlist?list=x')).toBeUndefined();
    expect(streamingService('https://notnetflix.com/title/1')).toBeUndefined();
    expect(streamingService('not a url')).toBeUndefined();
    expect(streamingService(undefined)).toBeUndefined();
  });
});

describe('streamingMerchants', () => {
  it('keeps the first link per service, in order, and drops the rest', () => {
    expect(
      streamingMerchants([
        'https://www.crunchyroll.com/series/GG5H5XQX4/frieren',
        'https://www.bilibili.tv/en/media/2090295',
        'https://www.netflix.com/title/81726714',
        'https://www.crunchyroll.com/series/GG5H5XQX4',
        'http://www.hulu.com/one-piece',
      ]),
    ).toEqual([
      { label: 'Crunchyroll', url: 'https://www.crunchyroll.com/series/GG5H5XQX4/frieren' },
      { label: 'Netflix', url: 'https://www.netflix.com/title/81726714' },
      { label: 'Hulu', url: 'https://www.hulu.com/one-piece' },
    ]);
  });
});

describe('watchOrder', () => {
  it('puts Prime Video first and keeps the rest in order', () => {
    const links = ['https://www.crunchyroll.com/series/x', 'https://www.netflix.com/title/1', 'https://www.primevideo.com/detail/0FCJ', 'https://www.hulu.com/series/y'].map((url) => ({ url }));
    expect(watchOrder(links).map((l) => streamingService(l.url)?.label)).toEqual(['Prime Video', 'Crunchyroll', 'Netflix', 'Hulu']);
  });
});

describe('cleanStreamingUrl', () => {
  it('upgrades http, moves off retired hosts and drops tags and tracking', () => {
    expect(cleanStreamingUrl('http://www.hulu.com/one-piece')).toBe('https://www.hulu.com/one-piece');
    expect(cleanStreamingUrl('https://beta.crunchyroll.com/series/GXJHM3P19')).toBe('https://www.crunchyroll.com/series/GXJHM3P19');
    expect(cleanStreamingUrl('https://www.amazon.com/gp/video/detail/B01MY6K92X/ref=atv_dp_season_select_s2?tag=techblast0f-20')).toBe('https://www.amazon.com/gp/video/detail/B01MY6K92X');
    expect(cleanStreamingUrl('https://www.primevideo.com/detail/0FKEGV62JLIH656ZBUCR2BBFUJ/ref=atv_dp_share_cu_r')).toBe('https://www.primevideo.com/detail/0FKEGV62JLIH656ZBUCR2BBFUJ');
    expect(cleanStreamingUrl('https://www.netflix.com/title/80107103')).toBe('https://www.netflix.com/title/80107103');
  });
});
