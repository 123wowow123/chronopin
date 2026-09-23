import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { siteName } from '@/lib/appConfig';
import { alternates, getT } from '@/lib/i18n/server';
import { sliderTyping, tagList } from '@/server/services/pages';
import { MapLoader } from './MapLoader';

// openGraph and twitter replace the root layout's whole objects, so a share of
// /map would otherwise show the home page's title, description and URL.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  const title = `${t('meta.mapTitle')} · ${siteName}`;
  const description = t('meta.mapDescription');
  const links = await alternates('/map');
  return {
    title: t('meta.mapTitle'),
    description,
    alternates: links,
    openGraph: { type: 'website', siteName, url: links.canonical, title, description },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function MapPage() {
  const t = await getT();
  return (
    <main>
      <h1 className="sr-only">{t('meta.mapHeading')}</h1>
      <Suspense fallback={<div className="h-[calc(100dvh-52px)] animate-pulse bg-raised" />}>
        <MapWithSettings />
      </Suspense>
    </main>
  );
}

// Per request, as the timeline's settings are: prerendered, the admin
// settings would be read from the database at build time, which a Docker
// build has no database for.
async function MapWithSettings() {
  await connection();
  const [typing, listing] = await Promise.all([sliderTyping(), tagList()]);
  return <MapLoader sliderTyping={typing.enabled} tagList={listing.enabled} />;
}
