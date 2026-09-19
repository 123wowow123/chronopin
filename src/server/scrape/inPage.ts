// Runs inside the scraped page (puppeteer's page.evaluate). It collects what
// the page's markup can give that reading its text cannot: images with real
// dimensions, and embedded YouTube/Twitter media. Title, description, price
// and dates come from the LLM pass in ../extract instead.
//
// Kept as a plain JavaScript string rather than a function: the TypeScript
// toolchains (tsx, Next.js) may inject helpers into a function body that do
// not exist in the page, and page.evaluate would then throw there.

export type InPageResult = {
  media?: { originalUrl: string; width: number; height: number }[];
  youtube?: string[];
  twitter?: string[];
};

export const IN_PAGE_SCRAPE = `(async () => {
  const unique = (values) => values.filter((v, i, all) => v && all.indexOf(v) === i);

  const imageSize = (url) => new Promise((resolve) => {
    const img = new Image();
    const fallback = { originalUrl: url, width: 0, height: 0 };
    const timer = setTimeout(() => resolve(fallback), 7000);
    img.onload = () => {
      clearTimeout(timer);
      resolve({ originalUrl: url, width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(fallback);
    };
    img.src = url;
  });

  const images = async () => {
    const urls = [];
    document.querySelectorAll('meta[name="og:image"], meta[property="og:image"], meta[name="twitter:image"], meta[property="twitter:image"]').forEach((m) => {
      const content = (m.getAttribute('content') || '').trim();
      if (content) urls.push(new URL(content, location.href).href);
    });
    const selectors = [
      "[id*='article'] img, [id*='Article'] img, [class*='article'] img, [class*='Article'] img",
      "[id*='content'] img, [id*='Content'] img, [class*='content'] img, [class*='Content'] img",
    ];
    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((img) => urls.push(img.src));
    });
    // A page with few pictures in its content areas: take the rest of its
    // body images (the size filter drops icons and tracking pixels).
    if (unique(urls).length < 3) {
      document.querySelectorAll('main img, article img, figure img, img').forEach((img) => {
        urls.push(img.currentSrc || img.src);
      });
    }
    const list = unique(urls.filter((u) => /^https?:/.test(u))).slice(0, 25);
    return list.length ? Promise.all(list.map(imageSize)) : undefined;
  };

  const youtube = () => {
    // Lazy players only create their iframe once clicked.
    document.querySelectorAll('.youtube').forEach((el) => {
      el.dispatchEvent(new MouseEvent('click', { view: window, bubbles: true, cancelable: false }));
    });
    const found = [];
    const walk = (node) => {
      if (node.src && node.contentWindow && String(node.src).includes('www.youtube.com')) {
        found.push(node.src);
      }
      if (node.shadowRoot) walk(node.shadowRoot);
      for (let child = node.firstChild; child; child = child.nextSibling) walk(child);
    };
    walk(document.body);
    const list = unique(found);
    return list.length ? list : undefined;
  };

  const twitter = () => {
    const found = [];
    document.querySelectorAll('iframe[data-tweet-id]').forEach((f) => found.push(f.dataset.tweetId));
    document.querySelectorAll('a[href*="twitter.com"]').forEach((a) => found.push(a.href));
    const list = unique(found);
    return list.length ? list : undefined;
  };

  return { media: await images(), youtube: youtube(), twitter: twitter() };
})()`;
