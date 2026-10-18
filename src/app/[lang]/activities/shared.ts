import type { Metadata } from 'next';
import { connection } from 'next/server';
import { siteName } from '@/lib/appConfig';
import { activityCity } from '@/lib/activities';
import { alternates, getT } from '@/lib/i18n/server';
import { siteCardImages } from '@/server/services/shareCard';
import { activityPins } from '@/server/services/activities';

export const MIN_INDEXED_ACTIVITIES = 8;

export function activityDescription(citySlug: string | null): string {
  const city = citySlug ? activityCity(citySlug) : undefined;
  return city
    ? `Seasonal things to do in ${city.name}: what is in season today, plus the best winter, spring, summer and fall activities, festivals and outings, each linked to its source and dates on ${siteName}.`
    : `What to do in New York, Los Angeles, Chicago, Houston and the other major US cities: what is in season today, plus the best winter, spring, summer and fall activities, festivals and outings, each linked to its source on ${siteName}.`;
}

export async function activityMetadata(citySlug: string | null): Promise<Metadata> {
  await connection();
  const t = await getT();
  const city = citySlug ? activityCity(citySlug) : undefined;
  const title = city ? `Seasonal things to do in ${city.name}` : 'Seasonal activities in major US cities';
  const description = activityDescription(citySlug);
  const pins = (await activityPins(t.locale)).filter((p) => !city || p.activity.citySlug === city.slug);
  const links = await alternates(city ? `/activities/${city.slug}` : '/activities');
  const images = await siteCardImages();
  return {
    title,
    description,
    alternates: links,
    ...(pins.length >= MIN_INDEXED_ACTIVITIES ? {} : { robots: { index: false, follow: true } }),
    openGraph: { type: 'website', siteName, url: links.canonical, title: `${title} · ${siteName}`, description, images },
    twitter: { card: 'summary_large_image', title: `${title} · ${siteName}`, description, images: images.map((i) => i.url) },
  };
}
