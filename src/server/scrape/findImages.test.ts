import { describe, expect, it } from 'vitest';
import { discourseImages, distinctiveWords, forumQuery, inWindow, topicMatches } from './findImages';

// One lightbox as community.openai.com writes it.
const LIGHTBOX =
  '<a class="lightbox" href="https://us1.discourse-cdn.com/openai1/original/4X/f/0/8/f088bf.jpeg" data-download-href="/uploads/short-url/yjRz.jpeg?dl=1" title="image">' +
  '<img src="https://us1.discourse-cdn.com/openai1/optimized/4X/f/0/8/f088bf_2_690x388.jpeg" alt="image" width="690" height="388" srcset="x_2_1035x582.jpeg 1.5x">' +
  '<div class="meta"><svg><use href="#far-image"></use></svg><span class="filename">image</span><span class="informations">1533×863 217 KB</span></div></a>';

describe('discourseImages', () => {
  it('takes each lightbox original at its full size', () => {
    const cooked = `<p>Today OpenAI is previewing GPT-5.6 Sol.</p>${LIGHTBOX}<p>More</p>${LIGHTBOX}`;
    expect(discourseImages(cooked, 'https://community.openai.com')).toEqual([
      { originalUrl: 'https://us1.discourse-cdn.com/openai1/original/4X/f/0/8/f088bf.jpeg', width: 1533, height: 863 },
    ]);
  });

  it('skips small pictures and plain inline images', () => {
    const small = LIGHTBOX.replace('1533×863', '120×90');
    expect(discourseImages(`${small}<img src="https://x/emoji.png" width="20" height="20">`, 'https://community.openai.com')).toEqual([]);
  });
});

describe('forum matching', () => {
  it('searches on what the title names', () => {
    expect(forumQuery('GPT-5.6 Sol Rolls Out in ChatGPT')).toBe('GPT-5.6 Sol');
    expect(forumQuery('GPT-5.4 Thinking Comes to ChatGPT')).toBe('GPT-5.4 Thinking');
  });

  it('keeps the words beyond the model', () => {
    expect(distinctiveWords('GPT-5.6 Sol Rolls Out in ChatGPT')).toEqual(['sol']);
    expect(distinctiveWords('GPT-4o with Canvas Enters Beta')).toEqual(['canvas']);
    expect(distinctiveWords('GPT-5 Released')).toEqual([]);
  });

  it.each([
    ['GPT-5.6 Sol Rolls Out in ChatGPT', 'Introducing GPT-5.6 series: Sol, Terra and Luna. Coming July 9 10am PT', true],
    ['GPT-5.4 Thinking Comes to ChatGPT', 'GPT-5.4 Pro and Thinking are here!', true],
    ['GPT-5.4 mini Comes to ChatGPT', 'GPT-5.4 Pro and Thinking are here!', false],
    ['GPT-5.4 mini Comes to ChatGPT', 'Introducing GPT-5.4 mini and nano — our most capable small models yet', true],
    ['GPT-4o with Canvas Enters Beta', 'Latest `gpt-4o` snapshot is cheaper and supports Structured Outputs', false],
    ['GPT-5 Released', 'Introducing GPT-5.3-Codex', false],
    ['GPT-4.1 Comes to ChatGPT', "This week's launches: o3, o4-mini, GPT-4.1, and Codex CLI", true],
  ])('%s <- %s', (pin, topic, expected) => {
    expect(topicMatches(pin, topic)).toBe(expected);
  });

  it('takes announcements from up to a month before to just after', () => {
    expect(inWindow('2026-06-26T17:42:18Z', '2026-07-09T00:00:00Z')).toBe(true);
    expect(inWindow('2026-07-11T09:00:00Z', '2026-07-09T00:00:00Z')).toBe(true);
    expect(inWindow('2026-05-01T00:00:00Z', '2026-07-09T00:00:00Z')).toBe(false);
    expect(inWindow('2026-07-20T00:00:00Z', '2026-07-09T00:00:00Z')).toBe(false);
  });
});
