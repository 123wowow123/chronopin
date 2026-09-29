// A video medium's player. The scraper stores the embed YouTube's API hands
// out, but a video added by its watch URL alone (a curator's or a job's
// update) has no stored html - and a video without html used to drop out of
// the pin's media. Its player is built from the video id instead, in the same
// shape as YouTube's own embedHtml.

import getVideoId from 'get-video-id';

export function youtubeVideoId(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const { id, service } = getVideoId(url.replace(/^\/\//, 'https://'));
  return id && service === 'youtube' ? id : undefined;
}

export function youtubeEmbedHtml(url: string | null | undefined): string | undefined {
  const id = youtubeVideoId(url);
  return id
    ? `<iframe width="480" height="270" src="https://www.youtube.com/embed/${encodeURIComponent(id)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`
    : undefined;
}

// The html a medium draws with: its stored embed, or for a YouTube video
// without one, a player built from its URL.
export function mediumEmbedHtml(medium: { type?: unknown; html?: string | null; originalUrl?: string | null }): string | undefined {
  if (medium.html) return medium.html;
  return String(medium.type) === '3' ? youtubeEmbedHtml(medium.originalUrl) : undefined;
}
