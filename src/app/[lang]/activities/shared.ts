import type { Metadata } from 'next';
import { connection } from 'next/server';
import { siteName } from '@/lib/appConfig';
import { activitiesNearCity, activityCity } from '@/lib/activities';
import { alternates, getT } from '@/lib/i18n/server';
import type { Translator } from '@/lib/i18n/translate';
import { siteCardImages } from '@/server/services/shareCard';
import { activityPins } from '@/server/services/activities';

export const MIN_INDEXED_ACTIVITIES = 8;

export function activityDescription(t: Translator, citySlug: string | null): string {
  const city = citySlug ? activityCity(citySlug) : undefined;
  return city
    ? t('guides.activities.descriptionCity', { city: city.name, site: siteName })
    : t('guides.activities.description', { site: siteName });
}

export async function activityMetadata(citySlug: string | null): Promise<Metadata> {
  await connection();
  const t = await getT();
  const city = citySlug ? activityCity(citySlug) : undefined;
  const title = city ? t('guides.activities.titleCity', { city: city.name }) : t('guides.activities.title');
  const description = activityDescription(t, citySlug);
  const allPins = await activityPins(t.locale);
  const pins = city ? activitiesNearCity(allPins, city) : allPins;
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
