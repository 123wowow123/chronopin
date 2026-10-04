import { describe, expect, it } from 'vitest';
import { tweetHtml, videoPlayerHtml, youtubePlayerHtml } from './embedHtml';

const ALLOW = 'frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>';

describe('youtubePlayerHtml', () => {
  it('rebuilds a stored player with the iframe API on, keeping its size and title', () => {
    expect(
      youtubePlayerHtml({
        html: '<iframe width="800" height="450" src="//www.youtube.com/embed/Ah7lTT-NKMw?feature=oembed" frameborder="0" allowfullscreen title="Mob Psycho 100 III &amp; more"></iframe>',
      }),
    ).toBe(`<iframe width="800" height="450" src="https://www.youtube.com/embed/Ah7lTT-NKMw?feature=oembed&amp;enablejsapi=1" title="Mob Psycho 100 III &amp; more" ${ALLOW}`);
  });

  it('names an untitled player and builds one from a watch URL', () => {
    expect(youtubePlayerHtml({ html: null, originalUrl: 'https://www.youtube.com/watch?v=rzi-S1aQ7ds' }, 'YouTube video: "x"')).toBe(
      `<iframe width="480" height="270" src="https://www.youtube.com/embed/rzi-S1aQ7ds?enablejsapi=1" title="YouTube video: &quot;x&quot;" ${ALLOW}`,
    );
  });

  it('keeps nothing of a player from another host', () => {
    expect(youtubePlayerHtml({ html: '<iframe src="https://evil.example/embed/x" onload="alert(1)"></iframe>' })).toBeUndefined();
    expect(youtubePlayerHtml({ html: '<iframe src="https://evil.example/x"></iframe>', originalUrl: 'https://youtu.be/rzi-S1aQ7ds' })).toContain(
      'src="https://www.youtube.com/embed/rzi-S1aQ7ds?enablejsapi=1"',
    );
    expect(youtubePlayerHtml({ html: '<iframe width="1&quot; onload=&quot;x" src="https://www.youtube.com/embed/abc"></iframe>' })).toContain('width="480"');
  });
});

describe('tweetHtml', () => {
  it('rebuilds the blockquote from its text, byline and link', () => {
    const html =
      '<blockquote class="twitter-tweet"><p lang="en" dir="ltr">Here&#39;s a <a href="https://t.co/x">pic.twitter.com/x</a><script>alert(1)</script></p>&mdash; Jay Cal (@Jay__Cale) <a href="https://twitter.com/Jay__Cale/status/1655653917651247104?ref_src=twsrc%5Etfw">May 8, 2023</a></blockquote>\n<script async src="https://platform.twitter.com/widgets.js"></script>';
    expect(tweetHtml({ html, originalUrl: 'https://twitter.com/Jay__Cale/status/1655653917651247104' })).toBe(
      '<blockquote class="twitter-tweet"><p>Here&#39;s a pic.twitter.com/xalert(1)</p>— Jay Cal (@Jay__Cale) <a href="https://twitter.com/Jay__Cale/status/1655653917651247104">May 8, 2023</a></blockquote>',
    );
  });

  it('needs a link to the tweet', () => {
    expect(tweetHtml({ html: '<blockquote><p>hi</p></blockquote>', originalUrl: 'javascript:alert(1)' })).toBeUndefined();
  });
});

describe('videoPlayerHtml', () => {
  it('builds a Dailymotion or Vimeo player from the id alone, never from stored markup', () => {
    const dm = videoPlayerHtml({ originalUrl: 'https://www.dailymotion.com/embed/video/x8q8o78', html: '<iframe src="https://evil.example/x"></iframe>' }, 'Video: GTA');
    expect(dm).toContain('src="https://www.dailymotion.com/embed/video/x8q8o78"');
    expect(dm).toContain('title="Video: GTA"');
    expect(dm).not.toContain('evil.example');
    expect(videoPlayerHtml({ originalUrl: 'https://player.vimeo.com/video/22439234' })).toContain('src="https://player.vimeo.com/video/22439234"');
  });
  it('builds a Twitch clip player that names the site as its parent, with autoplay off', () => {
    const html = videoPlayerHtml({ originalUrl: 'https://clips.twitch.tv/embed?clip=Slug-1' }, 'Video: GTA');
    expect(html).toContain('src="https://clips.twitch.tv/embed?clip=Slug-1&amp;autoplay=false&amp;parent=');
    expect(html).toContain('parent=localhost');
  });
  it('leaves YouTube to its own player and rejects other hosts', () => {
    expect(videoPlayerHtml({ originalUrl: 'https://www.youtube.com/embed/rzi-S1aQ7ds' })).toContain('enablejsapi=1');
    expect(videoPlayerHtml({ originalUrl: 'https://example.com/embed/video/x8q8o78' })).toBeUndefined();
  });
});
