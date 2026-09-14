'use strict';

// Rebuilds server/api/specialtyDay/specialtyDays.json, the "National Peanut
// Day" names shown under the TODAY marker on the timeline.
//
//   npm run specialty-days:build
//
// Names come from checkiday.com's page for each day of a leap year (so Feb 29
// is included). Only days "Observed annually on <that date>" are kept: a
// floating one ("the second Sunday in September") would sit on the wrong date
// in any other year, and the file is keyed by month and day alone.
//
// Each day's names are ordered for display, since the marker shows only the
// first: US food days that Wikipedia's "List of food days" also puts on that
// date, then other "National ..." days, then the rest, with days scoped to
// another country (a parenthesised country name) last. Takes about 7 minutes;
// requests are spaced a second apart.

const fs = require('fs');
const path = require('path');

const OUT_FILE = path.join(__dirname, '../../server/api/specialtyDay/specialtyDays.json');
const YEAR = 2028;
const DELAY_MS = 1000;
const USER_AGENT = 'chronopin specialty-days build (https://github.com/123wowow123/chronopin)';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function decode(text) {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&#0*39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (m, code) => String.fromCharCode(+code))
    .replace(/\s+/g, ' ')
    .trim();
}

const normalize = name => name.toLowerCase().replace(/[^a-z0-9]/g, '');

function monthDayKey(month, day) {
  return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function fetchText(url) {
  return fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    .then(res => {
      if (!res.ok) {
        throw new Error(`${url} answered ${res.status}`);
      }
      return res.text();
    });
}

// Wikipedia's United States food-day tables, as { 'MM-DD': Set(normalized) }.
// Only rows dated "<Month> <day>" are read; "First Saturday of February" and
// the like are skipped for the same reason floating checkiday days are.
function wikipediaFoodDays() {
  const url = 'https://en.wikipedia.org/w/index.php?title=List_of_food_days&action=raw';
  return fetchText(url).then(wiki => {
    const start = wiki.indexOf('==United States==');
    const end = wiki.slice(start + 1).search(/\n==[^=]/) + start + 1;
    const section = wiki.slice(start, end);
    const dateRe = new RegExp(`^(${MONTHS.join('|')}) (\\d{1,2})$`);
    const clean = cell => cell
      .replace(/<ref[^>]*\/>/g, '')
      .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
      .replace(/\{\{[^}]*\}\}/g, '')
      .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1')
      .replace(/'{2,}/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const days = {};
    let current = null;
    let rowsLeft = 0;

    section.split(/\n\|-[^\n]*/).forEach(row => {
      const cells = [];
      for (const line of row.trim().split('\n')) {
        if (line.startsWith('|}')) {
          break; // end of a month's table; what follows is the next heading
        }
        if (line.startsWith('!') || line.startsWith('{|')) {
          return;
        }
        if (line.startsWith('|')) {
          cells.push(...line.slice(1).split('||'));
        } else if (cells.length) {
          cells[cells.length - 1] += ' ' + line;
        }
      }
      if (!cells.length) {
        return;
      }

      let first = cells[0];
      const rowspan = first.match(/^\s*rowspan="(\d+)"\s*\|(.*)$/);
      if (rowspan) {
        rowsLeft = +rowspan[1];
        first = rowspan[2];
      }

      let event;
      const date = clean(first).match(dateRe);
      if (date) {
        current = monthDayKey(MONTHS.indexOf(date[1]) + 1, +date[2]);
        event = cells[1];
        rowsLeft--;
      } else if (rowsLeft > 0 && current) {
        event = cells[0];
        rowsLeft--;
      } else {
        current = null;
        return;
      }

      const name = event && clean(event);
      if (name) {
        (days[current] = days[current] || new Set()).add(normalize(name));
      }
    });
    return days;
  });
}

// The fixed-date names on checkiday's page for one day.
function checkidayNames(date) {
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const url = `https://www.checkiday.com/${month}/${day}/${YEAR}`;
  const fixed = new RegExp(`Observed annually on ${MONTHS[month - 1]} ${day}(st|nd|rd|th)\\b`);
  const card = /<h2 class="mdl-card__title-text"><a href="[^"]+">([^<]+)<\/a><\/h2><\/div><div class="mdl-card__supporting-text"[^>]*>([\s\S]*?)<\/div>/g;

  return fetchText(url).then(page => {
    const names = [];
    let match;
    while ((match = card.exec(page))) {
      const name = decode(match[1]);
      if (fixed.test(decode(match[2])) && !names.includes(name)) {
        names.push(name);
      }
    }
    return names;
  });
}

function rank(name, foodDays) {
  if (/\([^)]*\)\s*$/.test(name)) {
    return 3;
  }
  if (foodDays && foodDays.has(normalize(name))) {
    return 0;
  }
  return /^National /.test(name) ? 1 : 2;
}

async function build() {
  const foodDays = await wikipediaFoodDays();
  console.log(`Wikipedia: food days on ${Object.keys(foodDays).length} dates`);

  const days = {};
  const date = new Date(Date.UTC(YEAR, 0, 1));
  while (date.getUTCFullYear() === YEAR) {
    const key = monthDayKey(date.getUTCMonth() + 1, date.getUTCDate());
    const names = await checkidayNames(date);
    const food = foodDays[key];
    days[key] = names
      .map((name, index) => ({ name, index, rank: rank(name, food) }))
      .sort((a, b) => a.rank - b.rank || a.index - b.index)
      .map(entry => entry.name);
    console.log(`${key}: ${days[key].length ? days[key][0] : '(none)'} (${days[key].length})`);

    date.setUTCDate(date.getUTCDate() + 1);
    await sleep(DELAY_MS);
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(days, null, 1) + '\n');
  const empty = Object.keys(days).filter(key => !days[key].length);
  console.log(`Wrote ${OUT_FILE}; ${empty.length} dates with no names${empty.length ? ': ' + empty.join(', ') : ''}`);
}

build().catch(err => {
  console.log('Specialty days build err:', err);
  process.exitCode = 1;
});
