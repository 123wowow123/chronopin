import { describe, expect, it } from 'vitest';
import { affiliateUrl, amazonAssociateTag, isAmazonStoreUrl, isPurchaseLinkShown } from './affiliate';

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
