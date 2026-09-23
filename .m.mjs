import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1400, height: 900 }, colorScheme: 'dark' });
await p.goto('http://localhost:3000/search?q=' + encodeURIComponent('tag:Audio'), { waitUntil: 'networkidle' });
const f = p.getByRole('button', { name: /^Filters/ }).filter({ visible: true }).first();
if ((await f.getAttribute('aria-expanded')) === 'false') await f.click();
await p.waitForTimeout(300);
await p.getByRole('button', { name: /^Tags:/ }).filter({ visible: true }).first().click();
await p.waitForTimeout(2500);
await p.evaluate(() => {
  window.__log = [];
  const t0 = performance.now();
  const sample = () => {
    const dialogs = [...document.querySelectorAll('[role=dialog]')].filter((d) => d.offsetParent || d.getClientRects().length);
    const loading = [...document.querySelectorAll('[role=status]')].some((e) => /Loading tags/.test(e.textContent) && e.getClientRects().length);
    const words = document.querySelectorAll('[role=dialog] svg text, [role=dialog] button[data-tag], [role=dialog] [data-word]').length;
    const s = `${dialogs.length}d ${loading ? 'LOADING' : ''} attr:${document.documentElement.hasAttribute('data-tag-cloud')} ${location.search.slice(0, 40)}`;
    if (window.__log.at(-1)?.s !== s) window.__log.push({ t: Math.round(performance.now() - t0), s });
    if (performance.now() - t0 < 3000) requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);
});
const word = p.getByRole('dialog').getByRole('button', { name: /^Movie/ }).first();
console.log('word found:', await word.count());
await word.click();
await p.waitForTimeout(3200);
console.log((await p.evaluate(() => window.__log)).map((l) => `${l.t}ms ${l.s}`).join('\n'));
await b.close();
