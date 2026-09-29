import { describe, expect, it } from 'vitest';
import { appleIds, findItem, matchVideo, ogTitle, parseTranscript, pickTranscriptLink, relativeAge, sameShow, transcriptLinks, wordOverlap } from './podcast';

describe('appleIds', () => {
  it('reads show and episode ids', () => {
    expect(appleIds('https://podcasts.apple.com/us/podcast/rocket-man/id1459657136?i=1000758485042&uo=4')).toEqual({ showId: 1459657136, episodeId: 1000758485042 });
    expect(appleIds('https://podcasts.apple.com/us/podcast/the-daily/id1200361736')).toEqual({ showId: 1200361736, episodeId: undefined });
    expect(appleIds('https://open.spotify.com/episode/abc')).toBeUndefined();
  });
});

describe('ogTitle', () => {
  it('reads og:title whichever attribute comes first', () => {
    expect(ogTitle(`<meta name="og:title" content="Why China built the world&#39;s tallest bridge">`)).toBe("Why China built the world's tallest bridge");
    expect(ogTitle(`<meta content='Episode 4' property='og:title'>`)).toBe('Episode 4');
    expect(ogTitle('<title>x</title>')).toBeUndefined();
  });
});

describe('the feed', () => {
  const feed = `<rss><channel>
    <item><title>Older</title><guid isPermaLink="false">g-1</guid></item>
    <item><title><![CDATA[The Home Depot]]></title><guid>g-2</guid>
      <podcast:transcript url="https://x.fm/t.txt" type="text/plain"/>
      <podcast:transcript url="https://x.fm/t.vtt?a=1&amp;b=2" type="text/vtt" language="en"/>
      <podcast:transcript url="https://x.fm/t.es.vtt" type="text/vtt" language="es"/>
    </item></channel></rss>`;

  it('finds an item by guid, else by title', () => {
    expect(findItem(feed, { guid: 'g-2' })).toContain('The Home Depot');
    expect(findItem(feed, { guid: 'nope', title: 'The Home Depot' })).toContain('g-2');
    expect(findItem(feed, { title: 'The Home Depot - Acquired' })).toContain('g-2');
    expect(findItem(feed, { title: 'Missing' })).toBeUndefined();
  });

  it('prefers a timed transcript in the asked-for language', () => {
    const links = transcriptLinks(findItem(feed, { guid: 'g-2' })!);
    expect(links).toHaveLength(3);
    expect(pickTranscriptLink(links)?.url).toBe('https://x.fm/t.vtt?a=1&b=2');
    expect(pickTranscriptLink(links, 'es')?.url).toBe('https://x.fm/t.es.vtt');
  });
});

describe('parseTranscript', () => {
  it('reads WebVTT with voice tags', () => {
    const vtt = 'WEBVTT\n\n00:00:01.000 --> 00:00:04.500\n<v Ben Gilbert>Welcome to Acquired.\n\n00:01:02.000 --> 00:01:03.000\nDavid: Thanks &amp; hi.';
    expect(parseTranscript(vtt, 'text/vtt')).toEqual([
      { start: 1, duration: 3.5, speaker: 'Ben Gilbert', text: 'Welcome to Acquired.' },
      { start: 62, duration: 1, speaker: 'David', text: 'Thanks & hi.' },
    ]);
  });

  it('reads SRT', () => {
    const srt = '1\n00:00:00,000 --> 00:00:02,000\nHello there.\n\n2\n00:00:02,000 --> 00:00:03,500\nGeneral Kenobi.';
    expect(parseTranscript(srt, 'application/x-subrip').map((s) => [s.start, s.text])).toEqual([
      [0, 'Hello there.'],
      [2, 'General Kenobi.'],
    ]);
  });

  it('joins a speaker\'s word-by-word JSON segments', () => {
    const json = JSON.stringify({
      segments: [
        { speaker: 'A', startTime: 0, endTime: 0.4, body: 'The' },
        { speaker: 'A', startTime: 0.4, endTime: 0.9, body: 'bridge' },
        { speaker: 'A', startTime: 0.9, endTime: 1.5, body: 'opened.' },
        { speaker: 'B', startTime: 2, endTime: 2.5, body: 'Wow.' },
      ],
    });
    expect(parseTranscript(json, 'application/json')).toEqual([
      { speaker: 'A', start: 0, duration: 1.5, text: 'The bridge opened.' },
      { speaker: 'B', start: 2, duration: 0.5, text: 'Wow.' },
    ]);
  });

  it('reads plain text and HTML with speaker names', () => {
    expect(parseTranscript('Host: Hi.\n\nGuest (00:01:02): Hello.', 'text/plain')).toEqual([
      { speaker: 'Host', text: 'Hi.' },
      { speaker: 'Guest', text: 'Hello.' },
    ]);
    expect(parseTranscript('<html><body><p>One.</p><p>Two.</p></body></html>', 'text/html')).toEqual([{ text: 'One.' }, { text: 'Two.' }]);
  });
});

describe('matching the YouTube upload', () => {
  const now = Date.parse('2026-09-19T02:00:00Z');
  const episode = { title: 'A.I. Safety Goes Mainstream + a ‘Hard Fork’ Exit AMA', show: 'Hard Fork', durationSeconds: 5047, releaseDate: '2026-09-18T11:00:00Z' };

  it('knows a show by its channel', () => {
    expect(sameShow('Hard Fork', 'Hard Fork and 2 more')).toBe(true);
    expect(sameShow('Lex Fridman Podcast', 'Lex Fridman')).toBe(true);
    expect(sameShow('The Daily', 'The New York Times')).toBe(false);
  });

  it('reads relative upload times', () => {
    expect(relativeAge('15 hours ago')).toEqual({ days: 15 / 24, slack: 1 });
    expect(relativeAge('Streamed 3 weeks ago')).toEqual({ days: 21, slack: 7 });
    expect(relativeAge('yesterday')).toBeUndefined();
  });

  it('takes the whole episode under another title over a clip that shares the title', () => {
    const whole = matchVideo(episode, { videoId: 'a', title: 'The A.I. Industry Is Asking to Be Slowed Down', channel: 'Hard Fork', lengthSeconds: 4788, ageDays: 15 / 24, ageSlackDays: 1 }, now);
    const clip = matchVideo(episode, { videoId: 'b', title: 'A ‘Hard Fork’ Exit AMA', channel: 'Hard Fork', lengthSeconds: 3100, ageDays: 1, ageSlackDays: 1 }, now);
    expect(whole?.matchedBy).toBe('channel, length and upload day');
    expect(clip?.matchedBy).toBe('channel and title');
    expect(whole!.score).toBeGreaterThan(clip!.score);
  });

  it('rejects other channels and short clips', () => {
    expect(matchVideo(episode, { videoId: 'c', title: 'Agents, Guardrails, and Power', channel: 'Podkey', lengthSeconds: 515 }, now)).toBeUndefined();
    expect(matchVideo(episode, { videoId: 'd', title: episode.title, channel: 'Hard Fork', lengthSeconds: 600 }, now)).toBeUndefined();
  });

  it('measures title overlap on significant words', () => {
    expect(wordOverlap('The Grand Egyptian Museum', 'grand egyptian museum opens')).toBe(1);
    expect(wordOverlap('Grand Egyptian Museum', 'Grand opening')).toBeCloseTo(1 / 3);
  });
});
