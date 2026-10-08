import type { Metadata } from 'next';
import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import { RestaurantGuide } from '@/components/restaurants/RestaurantGuide';
import { GUIDE_PAGE_SIZE, GUIDE_VIEWS, guideKey, type GuideItem, type GuidePage, type GuideQuery } from '@/lib/restaurantGuide';
import { RESTAURANT_REGIONS } from '@/lib/restaurants';
import { absoluteUrl } from '@/lib/seo';
import { restaurantGuideRegionSlugs } from '@/server/services/restaurants';
import { guidePage, guideSummary } from '@/server/services/restaurantGuidePage';

type Props = { params: Promise<{ region: string }>; searchParams: Promise<{ view?: string; page?: string }> };

const pageNumber = (value?: string) => { const n = Math.floor(Number(value)); return n >= 2 && n <= 1000 ? n : 1; };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { region: slug } = await params;
  const query = await searchParams;
  const region = RESTAURANT_REGIONS.find((item) => item.slug === slug);
  if (!region) return { robots: { index: false } };
  const view = GUIDE_VIEWS.find((item) => item === query.view);
  const page = pageNumber(query.page);
  const title = `New & Upcoming Restaurants in ${region.name}${page > 1 ? ` · Page ${page}` : ''}`;
  // Each list page is its own indexable URL, so the later restaurants are reachable by links.
  const path = `/restaurants/${region.slug}${view ? `?view=${view}${page > 1 ? `&page=${page}` : ''}` : ''}`;
  const description = `Discover recently opened and upcoming restaurants in ${region.name}. Explore neighborhoods, opening dates, photos, and sourced details on Chronopin.`;
  return { title, description, alternates: { canonical: absoluteUrl(path) }, openGraph: { title, description, type: 'website', url: absoluteUrl(path) } };
}

export default function RestaurantRegionPage({ params, searchParams }: Props) {
  return <GuideContent params={params} searchParams={searchParams} />;
}

async function GuideContent({ params, searchParams }: Props) {
  await connection();
  const { region: slug } = await params;
  const region = RESTAURANT_REGIONS.find((item) => item.slug === slug);
  if (!region) notFound();
  const query = await searchParams;
  const now = new Date();
  const [summary, availableRegionSlugs] = await Promise.all([guideSummary(region.slug, now), restaurantGuideRegionSlugs()]);
  if (!summary) notFound();
  // Only the first page of the view the guide opens on; the rest is fetched as the reader scrolls.
  const requested = GUIDE_VIEWS.find((item) => item === query.view && summary.counts[item] > 0);
  const view = requested ?? GUIDE_VIEWS.find((item) => summary.counts[item] > 0) ?? 'upcoming';
  // The specials list changes by the minute, so it is not paged by URL.
  const page = view === 'discounts' ? 1 : Math.min(pageNumber(query.page), Math.max(1, Math.ceil(summary.counts[view] / GUIDE_PAGE_SIZE)));
  const sort = view === 'upcoming' ? 'opening-date' : 'rating';
  const queries: GuideQuery[] = view === 'discounts'
    ? (['available', 'next'] as const).map((section) => ({ region: region.slug, view, section, neighborhood: 'all', sort }))
    : [{ region: region.slug, view, neighborhood: 'all', sort }];
  const initialPages = Object.fromEntries((await Promise.all(queries.map(async (request) => [guideKey(request), await guidePage(request, (page - 1) * GUIDE_PAGE_SIZE, now)] as const))).filter((entry): entry is [string, GuidePage<GuideItem>] => !!entry[1]));
  const { counts, neighborhoods, featured, today, previewSnapshot } = summary;
  return <RestaurantGuide initialView={view} summary={{ counts, neighborhoods, featured }} initialPages={initialPages} availableRegionSlugs={availableRegionSlugs} region={region} today={today} previewSnapshot={previewSnapshot} timeZone={region.timeZone} />;
}
