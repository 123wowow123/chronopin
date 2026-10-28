'use strict';

// Rebuilds src/server/data/onThisDay.json, the "1904: first New York subway
// line opened" history tag under each date on the timeline.
//
//   npm run on-this-day:build
//
// Wikipedia's "On this day" feed (selected events, then all events) for every
// day of a leap year, so Feb 29 is included. The file is keyed by month and
// day: { "10-27": { year, text, url } }. The tag is only a few lines of 110px,
// so each date keeps the first selected event whose text is short enough, else
// the first event of the full list that is, else the first selected event cut
// at a word. Takes about 3 minutes; requests are spaced a half second apart.

const fs = require('fs');
const path = require('path');

const OUT_FILE = path.join(__dirname, '../../src/server/data/onThisDay.json');
const DELAY_MS = 500;
const MAX_CHARS = 70;
const USER_AGENT = 'chronopin on-this-day build (https://github.com/123wowow123/chronopin)';
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function feed(kind, month, day) {
  const url = `https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/${kind}/${month}/${day}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (res.ok) return (await res.json())[kind] ?? [];
    await sleep(2000 * (attempt + 1));
  }
  throw new Error(`${url} failed`);
}

const clean = (text) => text.replace(/\s*\((pictured|depicted)[^)]*\)/g, '').replace(/\s+/g, ' ').trim();

function cut(text) {
  if (text.length <= MAX_CHARS) return text;
  const head = text.slice(0, MAX_CHARS).replace(/\s+\S*$/, '').replace(/[,;:\s]+$/, '');
  return `${head}…`;
}

function pick(selected, all) {
  const entries = (list) => list.filter((e) => e.pages?.[0]?.content_urls?.desktop?.page).map((e) => ({ year: e.year, text: clean(e.text), url: e.pages[0].content_urls.desktop.page, pageCount: e.pages.length }));
  const chosen = entries(selected);
  const short = chosen.find((e) => e.text.length <= MAX_CHARS) ?? entries(all).filter((e) => e.text.length <= MAX_CHARS).sort((a, b) => b.pageCount - a.pageCount)[0];
  if (short) return short;
  const first = chosen[0] ?? entries(all)[0];
  return first && { ...first, text: cut(first.text) };
}

(async () => {
  const out = {};
  for (let m = 1; m <= 12; m++) {
    for (let d = 1; d <= DAYS_IN_MONTH[m - 1]; d++) {
      const key = `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const selected = await feed('selected', m, d);
      await sleep(DELAY_MS);
      const all = selected.some((e) => clean(e.text).length <= MAX_CHARS) ? [] : await feed('events', m, d);
      if (all.length) await sleep(DELAY_MS);
      const found = pick(selected, all);
      if (found) out[key] = { year: found.year, text: found.text, url: found.url };
      else console.warn(`${key}: nothing found`);
    }
    console.log(`month ${m} done`);
  }
  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 1) + '\n');
  console.log(`${Object.keys(out).length} dates written`);
})();
