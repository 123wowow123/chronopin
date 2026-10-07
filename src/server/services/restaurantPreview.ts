import type { PinJson } from '@/lib/types';
import { restaurantPriceRange } from '../restaurantPrice';

// Read-only local previews of the restaurant batch published after the local
// database snapshot. Production always uses its stored pins.
export async function restaurantPreviewPin(id: number): Promise<PinJson | null> {
  return (await restaurantPreviewPins([id]))[0] ?? null;
}

export async function restaurantPreviewPins(ids?: number[]): Promise<PinJson[]> {
  if (process.env.NODE_ENV !== 'development' || ids?.length === 0) return [];
  const [{ default: openings }, { default: top }] = await Promise.all([
    import('@/server/data/sanDiegoRestaurants.preview.json'),
    import('@/server/data/sanDiegoTopRestaurants.preview.json'),
  ]);
  const snapshot = [...openings, ...top];
  const requested = ids ? new Set(ids) : null;
  return snapshot.filter((pin) => !requested || requested.has(pin.id)).map((pin) => ({
    ...pin,
    restaurantPriceRange: restaurantPriceRange(pin.sourceUrl),
    media: pin.media.map((medium) => ({ ...medium, thumbName: `https://chronopin.blob.core.windows.net/thumb/${medium.thumbName}` })),
  })) as unknown as PinJson[];
}
