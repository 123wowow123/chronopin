import { blobUrl } from './appConfig';
import type { MediumJson } from './types';
import type { RestaurantCardPhoto } from './restaurantPhotos';
import { videoPlayerHtml, tweetHtml } from './embedHtml';
import { youtubeVideoId } from './videoEmbed';

export function landingMediaSlides(media: MediumJson[], name: string): (RestaurantCardPhoto & { medium: MediumJson })[] {
  return media.filter((medium) => (medium.weight ?? 1) >= 1).flatMap((medium) => {
    const image = String(medium.type) === '1';
    if (!image && !videoPlayerHtml(medium) && !tweetHtml(medium)) return [];
    const youtube = !image && String(medium.type) === '3' ? youtubeVideoId(medium.originalUrl) : undefined;
    const preview = !medium.thumbName && youtube ? { ...medium, thumbName: `https://i.ytimg.com/vi/${youtube}/hqdefault.jpg` } : medium;
    const src = blobUrl(preview.thumbName) ?? medium.originalUrl;
    if (!src) return [];
    return [{ src, originalUrl: medium.originalUrl, alt: name, credit: medium.authorName ?? '', sourceUrl: medium.authorUrl, medium: preview }];
  });
}
