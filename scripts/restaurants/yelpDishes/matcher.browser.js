// Paste into javascript_tool on a yelp.com tab (claude-in-chrome). Pace is deliberate: Yelp 403s fast bursts.
// 1. window.P = { "<venueId>": ["<yelp-slug>", ["<menu item>", ...]], ... }   (drop drink items first)
// 2. paste this file; poll window.PR2 ({done, stop, err}); calls over 45 s time out so the loop runs un-awaited.
// 3. dump: document.body.innerHTML='<pre id=o></pre>'; o.textContent = Object.entries(R).filter(([k,v])=>Object.keys(v.m).length)
//      .map(([k,v])=>k+'|'+v.slug+'|'+Object.entries(v.m).map(([i,[p,c]])=>i+'='+p+'~~'+c).join(';;')).join('\n')
//    then read it with get_page_text. Review the captions: drop any that name a different or several dishes, then
//    remove the '~~caption' parts and save as the dump file for download.py / apply.py.
const SW = new Set('the and with a of de la el en y al in on for pc add plus gf v our house served du des le'.split(' '));
window.toks = s => (s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9 ]/g, ' ')
  .split(/\s+/).filter(w => w && !SW.has(w) && !/^\d+$/.test(w)).map(w => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w)));
window.R = {}; window.PR2 = { done: 0, stop: false, cur: '' };
window.sl = ms => new Promise(r => setTimeout(r, ms));
window.getPh = async slug => {
  const seen = {};
  for (let s = 0; s <= 180; s += 30) {
    if (window.PR2.stop) break;
    let r; try { r = await fetch('/biz_photos/' + slug + '?tab=food&start=' + s); } catch (e) { continue; }
    if (r.status !== 200) { window.PR2.stop = true; window.PR2.err = slug + ' ' + r.status; break; } // bot check: ask the user to clear it
    const d = new DOMParser().parseFromString(await r.text(), 'text/html'); let n = 0;
    for (const i of d.querySelectorAll('img')) {
      const src = i.src || '';
      if (!src.includes('/bphoto/') || !i.alt.includes(' - ')) continue;
      const id = src.split('/bphoto/')[1].split('/')[0];
      if (!seen[id]) { seen[id] = i.alt.split(' - ')[1]; n++; } // alt = "<biz> - <caption> - tags - category Near Me - city"
    }
    await window.sl(2200 + Math.random() * 1500);
    if (n < 5) break;
  }
  return seen;
};
// every significant token of the item in the caption; a photo claimed by two items is dropped
window.match = (items, ph) => {
  const res = {};
  for (const it of items) {
    const t = [...new Set(window.toks(it))]; if (!t.length) continue; let best = null;
    for (const [id, cap] of Object.entries(ph)) {
      const ct = window.toks(cap), hit = t.filter(w => ct.includes(w)).length;
      if (hit === t.length && (t.length >= 2 || ct.length <= t.length + 2)) { const extra = ct.length - t.length; if (!best || extra < best.extra) best = { id, cap, extra }; }
    }
    if (best) res[it] = [best.id, best.cap];
  }
  const cnt = {}; for (const v of Object.values(res)) cnt[v[0]] = (cnt[v[0]] || 0) + 1;
  for (const k of Object.keys(res)) if (cnt[res[k][0]] > 1) delete res[k];
  return res;
};
(async () => {
  for (const [vid, [slug, items]] of Object.entries(window.P)) {
    if (window.PR2.stop) break; window.PR2.cur = vid;
    const ph = await window.getPh(slug); window.R[vid] = { slug, n: Object.keys(ph).length, m: window.match(items, ph) }; window.PR2.done++;
  }
})();
