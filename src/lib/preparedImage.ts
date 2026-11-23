import { thumbUrlPrefix } from './appConfig';

// Restaurant and landing photos are served as WebP renditions made ahead of
// time and stored beside the original in the `thumb` container, so browsers
// fetch them straight from Azure instead of through the VM's /_next/image
// resizer (2026-11-22: a city guide asks for ~200 photos at once, and every
// first request was resized on the VM). `npm run images:prepared` makes them.
export const PREPARED_WIDTHS = [240, 640, 1280] as const;
export const PREPARED_PREFIXES = ['restaurant-dishes/', 'restaurant-images/', 'restaurant-galleries/', 'landing-galleries/'] as const;
// Pin thumbnails (Medium.thumbName) sit at the container root: covered too (2026-11-22).
export const PREPARED_ROOT = 'root';
const PROD_PREFIX = 'https://chronopin.blob.core.windows.net/thumb/';

export function isPreparableName(name: string): boolean {
  return (!name.includes('/') || PREPARED_PREFIXES.some((prefix) => name.startsWith(prefix))) && /\.(webp|jpe?g|png|avif)$/i.test(name);
}

// r/v1/<width>/<original name>[.webp]: the original name keeps renditions of
// a.jpg and a.png apart; a .webp original keeps its own name.
export function preparedName(name: string, width: number): string {
  return `r/v1/${width}/${name}${/\.webp$/i.test(name) ? '' : '.webp'}`;
}

// The srcSet for a stored photo, or null for anything that has no renditions
// (another host, a folder the script does not cover, a GIF).
export function preparedSources(src: string, widths: readonly number[] = PREPARED_WIDTHS): { src: string; srcSet: string } | null {
  const base = [thumbUrlPrefix, PROD_PREFIX].find((prefix) => src.startsWith(prefix));
  if (!base) return null;
  const name = decodeURIComponent(src.slice(base.length).split(/[?#]/)[0]);
  if (!isPreparableName(name)) return null;
  const url = (width: number) => base + preparedName(name, width).split('/').map(encodeURIComponent).join('/');
  const middle = widths.find((width) => width >= 640) ?? widths[widths.length - 1];
  return { src: url(middle), srcSet: widths.map((width) => `${url(width)} ${width}w`).join(', ') };
}
