// Reader reviews (0209) and the menu-item tags on reader photos.

export const REVIEW_COMMENT_MAX = 1000;
export const PHOTO_TAG_MAX = 12;
export const PHOTO_TAG_ITEM_MAX = 120;
// Smallest tagged region, as a fraction of the picture's side.
export const PHOTO_TAG_MIN_SIZE = 0.02;

// A named menu item and the region of the photo it is in, as fractions (0-1).
export type PhotoTag = { item: string; x: number; y: number; w: number; h: number };

export type ReviewSummary = { average: number | null; count: number };

export type PinReviewJson = {
  id: number;
  pinId: number;
  userId: number;
  userName: string;
  pictureUrl: string | null;
  stars: number;
  comment: string | null;
  mine: boolean;
  utcCreatedDateTime: string;
  utcUpdatedDateTime: string;
};

export function validStars(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5;
}

export function problemWithComment(comment: unknown): string | null {
  if (comment == null || comment === '') return null;
  if (typeof comment !== 'string') return 'comment must be text';
  if (comment.trim().length > REVIEW_COMMENT_MAX) return `comment can be up to ${REVIEW_COMMENT_MAX} characters`;
  return null;
}

// Clean tags from untrusted input: at most PHOTO_TAG_MAX, each with a name and a
// region inside the picture. Resolves a message when one is unusable.
export function parsePhotoTags(input: unknown): { tags: PhotoTag[] } | { problem: string } {
  if (input == null || input === '') return { tags: [] };
  let raw = input;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return { problem: 'tags must be JSON' };
    }
  }
  if (!Array.isArray(raw)) return { problem: 'tags must be a list' };
  if (raw.length > PHOTO_TAG_MAX) return { problem: `at most ${PHOTO_TAG_MAX} tags` };
  const tags: PhotoTag[] = [];
  for (const entry of raw) {
    const { item, x, y, w, h } = (entry ?? {}) as Record<string, unknown>;
    const name = typeof item === 'string' ? item.trim() : '';
    if (!name || name.length > PHOTO_TAG_ITEM_MAX) return { problem: 'each tag needs a menu item name' };
    const nums = [x, y, w, h];
    if (!nums.every((n) => typeof n === 'number' && Number.isFinite(n))) return { problem: 'each tag needs a region' };
    const [rx, ry, rw, rh] = nums as number[];
    if (rx < 0 || ry < 0 || rw < PHOTO_TAG_MIN_SIZE || rh < PHOTO_TAG_MIN_SIZE || rx + rw > 1.0001 || ry + rh > 1.0001) {
      return { problem: 'a tagged region must lie inside the photo' };
    }
    const round = (n: number) => Math.round(n * 10000) / 10000;
    tags.push({ item: name, x: round(rx), y: round(ry), w: round(rw), h: round(rh) });
  }
  return { tags };
}

// Categories whose landing pages (Restaurants, Travel, Activities, Products,
// Cars, Music) list pins readers can review.
const REVIEWABLE_CATEGORIES = ['Food', 'Travel', 'Retail', 'Electronics', 'Automotive', 'Music', 'Audio', 'Fashion', 'Gaming', 'Tabletop'];
export function isReviewable(categories: readonly string[] | null | undefined): boolean {
  return !!categories?.some((c) => REVIEWABLE_CATEGORIES.includes(c));
}
