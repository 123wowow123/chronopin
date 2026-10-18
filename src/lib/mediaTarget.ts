// How many media a scraped pin should have. A pin reads best with a few, so a
// scrape looks further afield until it has TARGET_MEDIA of any kind (a page's
// video counts), and at least MIN_IMAGES of them pictures, so a video-only
// page still gets a still. At least MIN_VIDEOS are videos, added after the
// pictures (a video is only ever added on top, never in place of a picture).
export const TARGET_MEDIA = 3;
export const MIN_IMAGES = 1;
export const MIN_VIDEOS = 1;

// How many more pictures reach the target, given the media and the pictures a
// pin has: enough to make TARGET_MEDIA, and never fewer than MIN_IMAGES in all.
// Zero when the pin already has both.
export const picturesNeeded = (media: number, images: number) => Math.max(TARGET_MEDIA - media, MIN_IMAGES - images, 0);


// How many videos the scrape should still look for: none once the pin has MIN_VIDEOS.
export const videosNeeded = (videos: number) => Math.max(MIN_VIDEOS - videos, 0);
