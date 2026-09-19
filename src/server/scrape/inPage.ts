// Runs inside the scraped page (puppeteer's page.evaluate). It collects what
// the page's markup can give that reading its text cannot: images with real
// dimensions, and embedded YouTube/Twitter media. Title, description, price
// and dates come from the LLM pass in ../extract instead.
//
// Kept as a plain JavaScript string rather than a function: the TypeScript
// toolchains (tsx, Next.js) may inject helpers into a function body that do
// not exist in the page, and page.evaluate would then throw there.

import type { PageHeading } from '@/lib/pageEntries';

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

// The page's headings in order, each with the text (and pictures) under it
// up to the next heading of any level, for reading a release-notes or
// changelog page as one pin per entry (src/lib/pageEntries.ts). Also a
// string, for the same reason as IN_PAGE_SCRAPE.
export type InPageHeadings = { title: string; headings: PageHeading[] };

export const IN_PAGE_HEADINGS = `(() => {
  const MAX_HEADINGS = 400;
  const MAX_BODY = 4000;
  const visible = (el) => el.getClientRects().length > 0;
  const hs = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].filter(visible).slice(0, MAX_HEADINGS);
  const anchorOf = (h) => {
    if (h.id) return h.id;
    const inner = h.querySelector('[id], a[name]');
    if (inner) return inner.id || inner.getAttribute('name');
    const before = h.previousElementSibling;
    if (before && !before.textContent.trim() && (before.id || before.getAttribute('name'))) return before.id || before.getAttribute('name');
    const section = h.closest('section[id], article[id]');
    return section && section.querySelector('h1, h2, h3, h4, h5, h6') === h ? section.id : '';
  };
  // innerText needs layout, so the copied section is read off-screen.
  const box = document.createElement('div');
  box.style.cssText = 'position:absolute;left:-99999px;top:0;width:800px';
  document.documentElement.appendChild(box);
  const headings = hs.map((h, i) => {
    const range = document.createRange();
    range.setStartAfter(h);
    if (hs[i + 1]) range.setEndBefore(hs[i + 1]);
    else range.setEndAfter(document.body.lastChild || document.body);
    const copy = range.cloneContents();
    const time = h.querySelector('time[datetime]') || copy.querySelector('time[datetime]');
    box.replaceChildren(copy);
    const images = [...document.images]
      .filter((img) => range.intersectsNode(img) && img.naturalWidth > 150 && img.naturalHeight > 150 && /^https?:/.test(img.currentSrc || img.src))
      .map((img) => ({ originalUrl: img.currentSrc || img.src, width: img.naturalWidth, height: img.naturalHeight }));
    return {
      level: Number(h.tagName[1]),
      text: h.innerText.trim(),
      anchor: anchorOf(h) || '',
      body: box.innerText.trim().slice(0, MAX_BODY),
      time: time ? time.getAttribute('datetime') : undefined,
      images,
    };
  });
  box.remove();
  return { title: document.title, headings };
})()`;
