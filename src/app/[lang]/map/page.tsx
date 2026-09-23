import type { Metadata } from 'next';
import { siteName } from '@/lib/appConfig';
import { alternates, getT } from '@/lib/i18n/server';
import { sliderTyping } from '@/server/services/pages';
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
  const [t, typing] = await Promise.all([getT(), sliderTyping()]);
  return (
    <main>
      <h1 className="sr-only">{t('meta.mapHeading')}</h1>
      <MapLoader sliderTyping={typing.enabled} />
    </main>
  );
}
