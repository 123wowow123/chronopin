import { describe, expect, it } from 'vitest';
import { teslaReferralCode, affiliateUrl, amazonAssociateTag, awinPublisherId, ebayCampaignId, isAmazonStoreUrl, isAwinUrl, isEbayUrl, isPurchaseLinkShown } from './affiliate';

describe('affiliateUrl', () => {
  it('tags an amazon.com listing', () => {
    expect(affiliateUrl('https://www.amazon.com/Dell-UltraSharp-32-8K-Monitor/dp/B0727ZQ21F')).toBe(
      `https://www.amazon.com/Dell-UltraSharp-32-8K-Monitor/dp/B0727ZQ21F?tag=${amazonAssociateTag}`,
    );
    expect(affiliateUrl('https://amazon.com/dp/B00OQUSY08')).toBe(`https://amazon.com/dp/B00OQUSY08?tag=${amazonAssociateTag}`);
  });

  it('keeps the query and replaces another tag', () => {
    const url = new URL(affiliateUrl('https://www.amazon.com/dp/B0727ZQ21F?th=1&tag=someone-20'));
    expect(url.searchParams.get('th')).toBe('1');
    expect(url.searchParams.getAll('tag')).toEqual([amazonAssociateTag]);
  });

  it('leaves other stores, Amazon non-store hosts and junk alone', () => {
    for (const url of ['https://www.gamestop.com/x', 'https://aws.amazon.com/bedrock/', 'https://press.aboutamazon.com/news', 'https://www.amazon.co.uk/dp/B0727ZQ21F', 'not a url']) {
      expect(affiliateUrl(url)).toBe(url);
    }
  });
});

describe('Prime Video links', () => {
  it('moves a primevideo.com title page onto amazon.com, tagged', () => {
    const tagged = `https://www.amazon.com/gp/video/detail/0FCJEHY4FXTDVCLZ5NR9A0N42N?tag=${amazonAssociateTag}`;
    expect(affiliateUrl('https://www.primevideo.com/detail/0FCJEHY4FXTDVCLZ5NR9A0N42N')).toBe(tagged);
    expect(affiliateUrl('https://www.primevideo.com/region/na/detail/0FCJEHY4FXTDVCLZ5NR9A0N42N/ref=atv_dp')).toBe(tagged);
    expect(affiliateUrl('https://www.primevideo.com/-/es/detail/Frieren/0FCJEHY4FXTDVCLZ5NR9A0N42N')).toBe(tagged);
    expect(affiliateUrl('https://www.amazon.com/gp/video/detail/B0B8TR8Y2K')).toBe(`https://www.amazon.com/gp/video/detail/B0B8TR8Y2K?tag=${amazonAssociateTag}`);
  });

  it('leaves Prime Video pages that are not a title alone', () => {
    expect(affiliateUrl('https://www.primevideo.com/storefront')).toBe('https://www.primevideo.com/storefront');
  });

  it('counts a Prime Video title as a tagged link', () => {
    expect(isAmazonStoreUrl('https://www.primevideo.com/detail/0FCJEHY4FXTDVCLZ5NR9A0N42N')).toBe(true);
    expect(isAmazonStoreUrl('https://www.primevideo.com/storefront')).toBe(false);
  });
});

describe('isAmazonStoreUrl', () => {
  it('knows the store from the rest', () => {
    expect(isAmazonStoreUrl('https://www.amazon.com/dp/B0727ZQ21F')).toBe(true);
    expect(isAmazonStoreUrl('https://aws.amazon.com/')).toBe(false);
    expect(isAmazonStoreUrl(undefined)).toBe(false);
  });
});

describe('isPurchaseLinkShown', () => {
  it('drops Best Buy and keeps the rest', () => {
    expect(isPurchaseLinkShown('https://www.bestbuy.com/site/x/123.p')).toBe(false);
    expect(isPurchaseLinkShown('https://bestbuy.com/site/x/123.p')).toBe(false);
    expect(isPurchaseLinkShown('https://www.amazon.com/dp/B0727ZQ21F')).toBe(true);
    expect(isPurchaseLinkShown('https://click.linksynergy.com/deeplink?id=x&murl=https%3A%2F%2Fwww.gamestop.com%2F')).toBe(true);
    expect(isPurchaseLinkShown('')).toBe(false);
  });
});

describe('eBay Partner Network links', () => {
  it('adds our campaign to an ebay.com search or listing', () => {
    for (const url of ['https://www.ebay.com/sch/i.html?_nkw=tamiya+mini+4wd', 'https://www.ebay.com/itm/1234567890', 'https://ebay.com/itm/1234567890', 'https://m.ebay.com/itm/1234567890']) {
      const tagged = new URL(affiliateUrl(url));
      expect(tagged.searchParams.get('campid')).toBe(ebayCampaignId);
      expect(tagged.searchParams.get('mkcid')).toBe('1');
      expect(tagged.searchParams.get('mkrid')).toBe('711-53200-19255-0');
      expect(tagged.searchParams.get('siteid')).toBe('0');
      expect(tagged.searchParams.get('toolid')).toBe('10001');
      expect(tagged.searchParams.get('mkevt')).toBe('1');
    }
  });

  it('keeps the query and replaces someone else\'s campaign', () => {
    const url = new URL(affiliateUrl('https://www.ebay.com/itm/1234567890?var=99&campid=1111111111&customid=x'));
    expect(url.searchParams.get('var')).toBe('99');
    expect(url.searchParams.getAll('campid')).toEqual([ebayCampaignId]);
  });

  it('leaves other eBay sites, other stores and junk alone', () => {
    for (const url of ['https://www.ebay.co.uk/itm/1', 'https://signin.ebay.com/', 'https://www.mercari.com/search/?keyword=x', 'not a url']) {
      expect(affiliateUrl(url)).toBe(url);
    }
  });

  it('knows an eBay link from the rest', () => {
    expect(isEbayUrl('https://www.ebay.com/sch/i.html?_nkw=x')).toBe(true);
    expect(isEbayUrl('https://www.amazon.com/dp/B0727ZQ21F')).toBe(false);
    expect(isEbayUrl(undefined)).toBe(false);
  });
});

describe('Awin links', () => {
  it('sends a TideWe page through our Awin tracking link', () => {
    const tracked = new URL(affiliateUrl('https://www.tidewe.com/collections/hunting-jackets'));
    expect(tracked.hostname).toBe('www.awin1.com');
    expect(tracked.searchParams.get('awinmid')).toBe('78182');
    expect(tracked.searchParams.get('awinaffid')).toBe('3115479');
    expect(tracked.searchParams.get('ued')).toBe('https://www.tidewe.com/collections/hunting-jackets');
    expect(isAwinUrl(tracked.toString())).toBe(true);
  });

  it('sends a World Businesses for Sale page through our Awin tracking link', () => {
    const tracked = new URL(affiliateUrl('https://worldbusinessesforsale.com/collections/franchises'));
    expect(tracked.searchParams.get('awinmid')).toBe('116725');
    expect(tracked.searchParams.get('awinaffid')).toBe('3115479');
    expect(isAwinUrl(tracked.toString())).toBe(true);
  });

  it('sends a brkox page through our Awin tracking link', () => {
    const tracked = new URL(affiliateUrl('https://brkox.com/collections/lego-light-kits'));
    expect(tracked.origin + tracked.pathname).toBe('https://www.awin1.com/cread.php');
    expect(tracked.searchParams.get('awinmid')).toBe('129093');
    expect(tracked.searchParams.get('awinaffid')).toBe(awinPublisherId);
    expect(tracked.searchParams.get('ued')).toBe('https://brkox.com/collections/lego-light-kits');
  });

  it('recognises its own tracked links only', () => {
    expect(isAwinUrl(affiliateUrl('https://www.brkox.com/'))).toBe(true);
    expect(isAwinUrl('https://www.awin1.com/cread.php?awinmid=1&awinaffid=999&ued=https%3A%2F%2Fx.com')).toBe(false);
    expect(isAwinUrl('https://brkox.com/')).toBe(false);
    expect(isAwinUrl(null)).toBe(false);
  });

  it('leaves other hosts alone', () => {
    expect(affiliateUrl('https://example.com/brkox.com')).toBe('https://example.com/brkox.com');
  });
});

describe('Tesla referral links', () => {
  it('shows a tesla.com model or order page as the referral page', () => {
    const referral = `https://ts.la/${teslaReferralCode}`;
    expect(affiliateUrl('https://www.tesla.com/modely')).toBe(referral);
    expect(affiliateUrl('https://tesla.com/roadster?utm_source=x')).toBe(referral);
  });

  it('leaves support pages and other countries alone', () => {
    expect(affiliateUrl('https://www.tesla.com/support/charging')).toBe('https://www.tesla.com/support/charging');
    expect(affiliateUrl('https://www.tesla.cn/modely')).toBe('https://www.tesla.cn/modely');
    expect(affiliateUrl('https://www.tesla.com/de_de/modely')).toBe('https://www.tesla.com/de_de/modely');
  });
});
