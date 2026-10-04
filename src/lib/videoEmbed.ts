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

// The other players a pin can carry beside YouTube's: a second copy of the
// video from a source that plays where YouTube does not (age-restricted or
// blocked there). Each is rebuilt from its id, like YouTube's, never from
// stored markup.
export type VideoProvider = 'youtube' | 'vimeo' | 'dailymotion' | 'twitch';

export function videoSource(url: string | null | undefined): { provider: VideoProvider; id: string } | undefined {
  if (!url) return undefined;
  const link = url.replace(/^\/\//, 'https://');
  const youtube = youtubeVideoId(link);
  if (youtube) return { provider: 'youtube', id: youtube };
  const vimeo = link.match(/^https?:\/\/(?:www\.|player\.)?vimeo\.com\/(?:video\/|(?:channels\/[\w-]+|groups\/[\w-]+\/videos)\/)?(\d{5,})(?:[/?#]|$)/i);
  if (vimeo) return { provider: 'vimeo', id: vimeo[1] };
  const dailymotion = link.match(/^https?:\/\/(?:www\.)?(?:dailymotion\.com\/(?:embed\/)?video\/|dai\.ly\/)([a-z0-9]+)(?:[/?#_]|$)/i);
  if (dailymotion) return { provider: 'dailymotion', id: dailymotion[1] };
  // A Twitch clip: its slug is the id (VODs and live channels are not kept).
  const twitch =
    link.match(/^https?:\/\/clips\.twitch\.tv\/embed\?(?:[^#]*&)?clip=([\w-]+)/i) ??
    link.match(/^https?:\/\/clips\.twitch\.tv\/(?!embed)([\w-]+)/i) ??
    link.match(/^https?:\/\/(?:www\.|m\.)?twitch\.tv\/\w+\/clip\/([\w-]+)/i);
  if (twitch) return { provider: 'twitch', id: twitch[1] };
  return undefined;
}

// The address a provider's player is embedded from (YouTube's, with the
// iframe API switched on, is built by embedHtml's playerSrc instead).
export function embedUrl(provider: Exclude<VideoProvider, 'youtube'>, id: string): string {
  if (provider === 'twitch') return `https://clips.twitch.tv/embed?clip=${encodeURIComponent(id)}`;
  return provider === 'vimeo'
    ? `https://player.vimeo.com/video/${encodeURIComponent(id)}`
    : `https://www.dailymotion.com/embed/video/${encodeURIComponent(id)}`;
}
