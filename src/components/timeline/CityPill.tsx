import { Icon } from '@/components/ui/Icon';
import { CategoryPill } from './CategoryPill';

// A trending or new pin's city (src/lib/city.ts), as a pill like its category
// one, behind a map marker. The row is a link to the pin, so this is plain
// text, not a place: search.
export function CityPill({ city }: { city: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-0.5 rounded-full bg-raised px-1.5 text-[11px] leading-4 font-medium text-muted ring-1 ring-tint/15 ring-inset">
      <Icon name="pin" className="size-2.5 shrink-0" />
      <span className="truncate">{city}</span>
    </span>
  );
}

// A trending or new pin's category and city pills, on a line of their own:
// beside the views or the age, the side column left each a letter or two.
export function PlacePills({ category, city }: { category: string | null; city?: string | null }) {
  if (!category && !city) return null;
  return (
    <span className="mt-0.5 flex min-w-0 items-center gap-1 overflow-hidden">
      {category ? <CategoryPill category={category} /> : null}
      {city ? <CityPill city={city} /> : null}
    </span>
  );
}
