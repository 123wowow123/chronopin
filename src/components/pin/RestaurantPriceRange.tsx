export function RestaurantPriceRange({ range }: { range: string | undefined }) {
  if (!range || !/^\${1,4}$/.test(range)) return null;
  return <span className="whitespace-nowrap font-medium tracking-wide text-success" aria-label={`Restaurant price range ${range.length} of 4`} title="Restaurant price range">{range}</span>;
}
