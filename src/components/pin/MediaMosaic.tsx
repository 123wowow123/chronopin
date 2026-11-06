import { pinPath } from '@/lib/seo';
import type { PinJson } from '@/lib/types';
import { LandingMediaGallery } from './LandingMediaGallery';

type Tile = { key: string; pin: PinJson; label?: string; thumbName?: string; originalUrl?: string; video: boolean };

// A pin's best picture (its image, else a video's still), or null.
export function pinPicture(pin: PinJson): { key: string; thumbName?: string; originalUrl?: string; video: boolean } | null {
  const media = (pin.media ?? []).filter((m) => (m.thumbName || (String(m.type) === '1' && m.originalUrl)) && (m.weight ?? 1) >= 1);
  const m = media.find((x) => String(x.type) === '1') ?? media[0];
  return m ? { key: m.thumbName ?? m.originalUrl!, thumbName: m.thumbName, originalUrl: m.originalUrl, video: String(m.type) !== '1' } : null;
}

// One picture per pin, no picture twice.
function tiles(pins: PinJson[], max: number, labels?: Record<number, string>): Tile[] {
  const seen = new Set<string>();
  const out: Tile[] = [];
  for (const pin of pins) {
    const pic = pinPicture(pin);
    if (!pic || seen.has(pic.key)) continue;
    seen.add(pic.key);
    out.push({ ...pic, pin, label: labels?.[pin.id] });
    if (out.length >= max) break;
  }
  return out;
}

// A picture wall for a company or product page: the pictures of the pins under
// it, the first large, each linking to its pin. Pictures are the pins' own
// media, already stored and credited there.
export function MediaMosaic({ pins, labels, dateOf, max = 13, className }: { pins: PinJson[]; labels?: Record<number, string>; dateOf?: (pin: PinJson) => string; max?: number; className?: string }) {
  const found = tiles(pins, max, labels);
  // Five or more: the first is large (four cells of the four-column grid), and a
  // count of 1, 5, 9, 13 ... leaves no gap in the last row. Two to four: equal tiles.
  const big = found.length >= 5;
  const list = big ? found.slice(0, found.length - ((found.length - 1) % 4)) : found;
  if (list.length < 2) return null;
  const cols = big ? 'sm:grid-cols-4 sm:auto-rows-[9rem] lg:auto-rows-[11rem]' : list.length === 2 ? 'sm:grid-cols-2' : list.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-4';
  return (
    <ul className={`grid grid-cols-2 gap-2 ${cols} ${className ?? ''}`}>
      {list.map((tile, i) => (
        <li key={tile.key} className={`group relative overflow-hidden rounded-xl bg-panel ${big && i === 0 ? 'col-span-2 row-span-2 aspect-[4/3] sm:aspect-auto' : big ? 'aspect-[4/3] sm:aspect-auto' : 'aspect-[4/3]'}`}>
          <LandingMediaGallery name={tile.pin.title} href={pinPath(tile.pin)} media={tile.pin.media} className="!h-full !aspect-auto" >
            {tile.label ? <span className="pointer-events-none absolute start-2 top-2 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-white shadow">{tile.label}</span> : null}
            <span className="pointer-events-none absolute inset-x-0 bottom-10 bg-gradient-to-t from-black/80 to-transparent p-2.5 pt-10 text-white">
              {dateOf ? <span className="block text-[11px] font-medium text-white/80">{dateOf(tile.pin)}</span> : null}
              <span className="line-clamp-2 text-xs font-medium sm:text-sm">{tile.pin.title}</span>
            </span>
          </LandingMediaGallery>
        </li>
      ))}
    </ul>
  );
}
