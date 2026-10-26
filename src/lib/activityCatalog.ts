// Validation and pin identity for the bundled seasonal-activity catalog.
import { ACTIVITY_CATEGORIES, SEASONS, activityCity, type ActivityCatalogItem } from './activities';

const ISO = /^\d{4}-\d{2}-\d{2}$/;

// Problems with one catalog item, or an empty list when it can be seeded.
export function activityProblems(item: ActivityCatalogItem): string[] {
  const problems: string[] = [];
  if (!activityCity(item.citySlug)) problems.push(`unknown city ${item.citySlug}`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(item.slug)) problems.push('slug must be kebab-case');
  if (!item.name?.trim() || !item.venue?.trim() || !item.description?.trim()) problems.push('name, venue and description are required');
  if (!/^https:\/\//.test(item.sourceUrl)) problems.push('sourceUrl must be https');
  if (!Number.isFinite(item.latitude) || !Number.isFinite(item.longitude) || Math.abs(item.latitude) > 90 || Math.abs(item.longitude) > 180) problems.push('bad coordinates');
  if (!item.seasons?.length || item.seasons.some((s) => !SEASONS.includes(s))) problems.push('seasons must be winter/spring/summer/fall');
  for (const m of [item.startMonth, item.endMonth]) if (!Number.isInteger(m) || m < 1 || m > 12) problems.push('months must be 1-12');
  if (!ACTIVITY_CATEGORIES.includes(item.category)) problems.push(`unknown category ${item.category}`);
  if (item.tripDays && (!item.tripDays.length || item.tripDays.some((days) => days !== 1 && days !== 2) || new Set(item.tripDays).size !== item.tripDays.length)) problems.push('tripDays must contain unique 1/2 day suggestions');
  if (item.tripDays?.includes(1) && !item.tripPlan?.day?.trim()) problems.push('day trips need a planning note');
  if (item.tripDays?.includes(2) && !item.tripPlan?.overnight?.trim()) problems.push('2-day trips need an overnight planning note');
  if (item.startDate && !ISO.test(item.startDate)) problems.push('startDate must be YYYY-MM-DD');
  if (item.endDate && !ISO.test(item.endDate)) problems.push('endDate must be YYYY-MM-DD');
  if (!!item.startDate !== !!item.endDate) problems.push('startDate and endDate go together');
  if (item.startDate && item.endDate && item.endDate < item.startDate) problems.push('endDate before startDate');
  if (!['confirmed', 'estimated'].includes(item.dateConfidence)) problems.push('dateConfidence must be confirmed or estimated');
  return problems;
}

// Pins are keyed by sourceUrl. Items that share one source page get a per-activity fragment so each keeps its own pin.
export function activitySourceUrls(items: readonly ActivityCatalogItem[]): Map<string, string> {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.sourceUrl, (counts.get(item.sourceUrl) ?? 0) + 1);
  return new Map(items.map((item) => [`${item.citySlug}/${item.slug}`, (counts.get(item.sourceUrl) ?? 0) > 1 ? `${item.sourceUrl.replace(/#.*$/, '')}#${item.slug}` : item.sourceUrl]));
}
