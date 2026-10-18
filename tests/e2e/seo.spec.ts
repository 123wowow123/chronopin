import { expect, test } from '@playwright/test';

// What a crawler sees, without running any JavaScript.
test.describe('server-rendered HTML for search engines', () => {
  test('home page has the timeline, site JSON-LD and crawlable paging links', async ({ request }) => {
    const res = await request.get('/', { headers: { 'User-Agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)' } });
    expect(res.status()).toBe(200);
    const html = await res.text();
    const has = (pattern: RegExp) => expect(pattern.test(html), String(pattern)).toBe(true);
    has(/<title>Chronopin: /);
    has(/<link rel="canonical" href="https:\/\/www\.chronopin\.com\/?"/);
    has(/"@type":"WebSite"/);
    has(/href="\/pin\/\d+\/[a-z0-9-]+"/);
    has(/rel="(prev|next)"/);
  });

  test('a pin page carries its title, description, canonical, share image and structured data', async ({ request }) => {
    const sitemap = await (await request.get('/sitemap.xml')).text();
    const url = sitemap.match(/<loc>https:\/\/www\.chronopin\.com(\/pin\/\d+\/[^<]+)<\/loc>/)![1];
    const res = await request.get(url, { headers: { 'User-Agent': 'Googlebot/2.1' } });
    expect(res.status()).toBe(200);
    const html = await res.text();

    const title = html.match(/<title>([^<]+) · Chronopin<\/title>/)?.[1];
    expect(title).toBeTruthy();
    expect(html).toContain(`<link rel="canonical" href="https://www.chronopin.com${url}"`);
    expect(html).toMatch(/<meta name="description" content="[^"]{10,}"/);
    expect(html).toMatch(/<meta property="og:image" content="[^"]+"/);
    expect(html).toMatch(/<h1[^>]*>/);

    const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    const graph = blocks.flat();
    expect(graph.find((node) => node['@type'] === 'Article')?.headline).toBeTruthy();
    expect(graph.find((node) => node['@type'] === 'BreadcrumbList')).toBeTruthy();
  });

  test('old and wrong pin URLs redirect permanently; missing pins are 404', async ({ request }) => {
    const sitemap = await (await request.get('/sitemap.xml')).text();
    const [, path, id] = sitemap.match(/<loc>https:\/\/www\.chronopin\.com(\/pin\/(\d+)\/[^<]+)<\/loc>/)!;

    const bare = await request.get(`/pin/${id}`, { maxRedirects: 0 });
    expect(bare.status()).toBe(308);
    expect(bare.headers().location).toBe(path);

    const wrong = await request.get(`/pin/${id}/not-the-title`, { maxRedirects: 0 });
    expect(wrong.status()).toBe(308);

    const missing = await request.get('/pin/99999999/nothing');
    expect(missing.status()).toBe(404);
  });

  test('robots.txt and sitemap.xml', async ({ request }) => {
    const robots = await (await request.get('/robots.txt')).text();
    expect(robots).toContain('Sitemap: https://www.chronopin.com/sitemap.xml');
    expect(robots).toContain('Disallow: /api/');
    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.status()).toBe(200);
    expect((await sitemap.text()).match(/<url>/g)!.length).toBeGreaterThan(10);
  });

  test('search and account pages are not indexed', async ({ request }) => {
    for (const path of ['/search?q=company:Apple', '/login', '/signup']) {
      const html = await (await request.get(path)).text();
      expect(html, path).toMatch(/<meta name="robots" content="noindex/);
    }
  });
});
