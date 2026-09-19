import { describe, expect, it } from 'vitest';
import { cleanTitle, creationOrder, entryToPin, entryUrl, pageEntries, parseDay, type PageHeading } from './pageEntries';

const h = (level: number, text: string, body = '', anchor = ''): PageHeading => ({ level, text, anchor, body, images: [] });
const PAGE = 'https://help.openai.com/en/articles/9624314-model-release-notes';

describe('parseDay', () => {
  it.each([
    ['Introducing GPT-5.6 Sol in ChatGPT (July 9, 2026)', '2026-07-09'],
    ['Introducing GPT-5-codex (Sep 15, 2025)', '2025-09-15'],
    ['Introducing GPT-4.5 (February, 27, 2025)', '2025-02-27'],
    ['Released 9 July 2026', '2026-07-09'],
    ['v2.4.0 - 2026-03-03', '2026-03-03'],
    ['Sept 3rd, 2024', '2024-09-03'],
  ])('%s', (text, day) => {
    expect(parseDay(text)).toBe(day);
  });

  it('needs a whole, real date', () => {
    expect(parseDay('GPT-5')).toBeNull();
    expect(parseDay('Coming July 2026')).toBeNull();
    expect(parseDay('February 30, 2026')).toBeNull();
  });
});

describe('cleanTitle', () => {
  it('drops the date and keeps the rest', () => {
    expect(cleanTitle('Update to GPT-4o (April 29, 2025)')).toBe('Update to GPT-4o');
    expect(cleanTitle('v2.4.0 - March 3, 2026')).toBe('v2.4.0');
    expect(cleanTitle('March 3, 2026: Faster sync')).toBe('Faster sync');
    expect(cleanTitle('Beta (limited preview)')).toBe('Beta (limited preview)');
    expect(cleanTitle('March 3, 2026')).toBe('');
  });
});

describe('entryUrl', () => {
  it('links the anchor, else the heading text', () => {
    expect(entryUrl(`${PAGE}#old`, h(2, 'x', '', 'h_b823d984ad'))).toBe(`${PAGE}#h_b823d984ad`);
    expect(entryUrl(PAGE, h(2, 'GPT-5 Codex'))).toBe(`${PAGE}#:~:text=GPT%2D5%20Codex`);
  });
});

describe('pageEntries', () => {
  // The shape of OpenAI's Model Release Notes, newest first.
  const headings = [
    h(1, 'Model Release Notes', 'Updates to ChatGPT models.'),
    h(2, 'Updates to GPT-4o (March 27, 2025)', 'GPT-4o is better at STEM.', 'a'),
    h(3, 'Smarter problem-solving', 'Better at coding.'),
    h(2, 'GPT-5', 'GPT-5 is rolling out to all users.', 'b'),
    h(2, 'Introducing GPT-4.5 (February, 27, 2025)', 'A research preview.', 'c'),
    h(2, 'Updates to GPT-4o in ChatGPT (January 29, 2025)', 'Knowledge to June 2024.', 'd'),
    h(3, 'Introducing GPT-4o with scheduled tasks (January 14, 2025)', 'Tasks beta.', 'e'),
    h(3, 'Introducing GPT-4o mini (July 18, 2024)', 'Our most cost-efficient small model.', 'f'),
    h(2, 'Need more help?', 'Contact us.'),
  ];

  it('reads one entry per dated heading, plus undated ones at their level', () => {
    const entries = pageEntries(PAGE, headings);
    expect(entries.map((e) => [e.title, e.startDate])).toEqual([
      ['Updates to GPT-4o', '2025-03-27'],
      ['GPT-5', null],
      ['Introducing GPT-4.5', '2025-02-27'],
      ['Updates to GPT-4o in ChatGPT', '2025-01-29'],
      ['Introducing GPT-4o with scheduled tasks', '2025-01-14'],
      ['Introducing GPT-4o mini', '2024-07-18'],
    ]);
    // A sub-heading is part of its entry; the footer is not an entry.
    expect(entries[0].text).toContain('Smarter problem-solving\nBetter at coding.');
    expect(entries[5].text).toBe('Our most cost-efficient small model.');
    expect(entries[1].url).toBe(`${PAGE}#b`);
  });

  it('takes a date from the line under a heading', () => {
    const changelog = [h(2, 'v3', 'March 3, 2026\nFaster sync.'), h(2, 'v2', 'Feb 2, 2026\nDark mode.'), h(2, 'v1', 'Jan 1, 2026\nFirst release.')];
    expect(pageEntries(PAGE, changelog).map((e) => e.startDate)).toEqual(['2026-03-03', '2026-02-02', '2026-01-01']);
  });

  it('is nothing for an article with a date or two', () => {
    expect(pageEntries(PAGE, [h(1, 'Launch (May 1, 2026)'), h(2, 'Background (April 2, 2026)'), h(2, 'What next')])).toEqual([]);
  });
});

describe('creationOrder', () => {
  it('posts oldest first, same-day entries in the order they happened', () => {
    const entries = [
      { id: 'new', startDate: '2026-05-14' },
      { id: 'b', startDate: '2025-05-14' },
      { id: 'a', startDate: '2025-05-14' },
      { id: 'old', startDate: '2024-07-18' },
    ];
    expect(creationOrder(entries).map((e) => e.id)).toEqual(['old', 'a', 'b', 'new']);
  });
});

describe('entryToPin', () => {
  const entry = {
    url: `${PAGE}#f`,
    heading: 'Introducing GPT-4o mini (July 18, 2024)',
    text: 'Our most cost-efficient small model. It replaces GPT-3.5 <Turbo>.\nAvailable to all users.',
    images: [{ originalUrl: 'https://x/y.png', width: 800, height: 400 }],
    title: 'GPT-4o mini Released',
    startDate: '2024-07-18',
    pageDay: '2024-07-18',
  };

  it('is an all-day pin citing the entry, filed like the drafted pin', () => {
    const pin = entryToPin(entry, { company: 'OpenAI', categories: ['AI Models'] }, 'Model Release Notes | OpenAI Help Center');
    expect(pin).toMatchObject({
      title: 'GPT-4o mini Released',
      description: 'Our most cost-efficient small model.',
      longFormSummary: '<ul><li>It replaces GPT-3.5 &lt;Turbo&gt;.</li><li>Available to all users.</li></ul>',
      sourceUrl: `${PAGE}#f`,
      utcStartDateTime: '2024-07-18T00:00:00.000Z',
      allDay: true,
      dateConfidence: 'confirmed',
      company: 'OpenAI',
      categories: ['AI Models'],
      media: [{ type: 1, originalUrl: 'https://x/y.png', originalWidth: 800, originalHeight: 400 }],
    });
    expect(pin.references[0]).toMatchObject({ url: `${PAGE}#f`, confidence: 90, startDate: '2024-07-18', title: 'Model Release Notes | OpenAI Help Center: Introducing GPT-4o mini (July 18, 2024)' });
    expect(pin).not.toHaveProperty('parentId');
  });

  it('leaves a day the author typed unconfirmed', () => {
    const pin = entryToPin({ ...entry, pageDay: null, startDate: '2025-08-07' }, {}, '');
    expect(pin.dateConfidence).toBeUndefined();
    expect(pin.references[0].startDate).toBeUndefined();
    expect(pin.utcStartDateTime).toBe('2025-08-07T00:00:00.000Z');
  });
});
