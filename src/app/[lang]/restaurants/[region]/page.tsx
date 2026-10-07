import type { Metadata } from 'next';
import { Suspense } from 'react';
import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import { RestaurantGuide } from '@/components/restaurants/RestaurantGuide';
import { dayKeyIn } from '@/lib/format';
import { RESTAURANT_REGIONS } from '@/lib/restaurants';
import { absoluteUrl } from '@/lib/seo';
import { regionalRestaurants, regionalTopRestaurants } from '@/server/services/restaurants';

type Props = { params: Promise<{ region: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { region: slug } = await params;
  const region = RESTAURANT_REGIONS.find((item) => item.slug === slug);
  if (!region) return { robots: { index: false } };
  const title = `New & Upcoming Restaurants in ${region.name}`;
  const description = `Discover recently opened and upcoming restaurants in ${region.name}. Explore neighborhoods, opening dates, photos, and sourced details on Chronopin.`;
  return { title, description, alternates: { canonical: absoluteUrl(`/restaurants/${region.slug}`) }, openGraph: { title, description, type: 'website', url: absoluteUrl(`/restaurants/${region.slug}`) } };
}

export default function RestaurantRegionPage({ params }: Props) {
  return <Suspense fallback={<main className="mx-auto min-h-[75vh] max-w-7xl px-6 py-16" aria-busy="true"><p className="text-muted">Loading the restaurant guide…</p></main>}><GuideContent params={params} /></Suspense>;
}

async function GuideContent({ params }: Props) {
  await connection();
  const { region: slug } = await params;
  const region = RESTAURANT_REGIONS.find((item) => item.slug === slug);
  if (!region) notFound();
  const data = await regionalRestaurants(region.name);
  return <RestaurantGuide {...data} topRestaurants={regionalTopRestaurants(region.slug)} region={region} today={dayKeyIn(new Date(), region.timeZone)} />;
}
