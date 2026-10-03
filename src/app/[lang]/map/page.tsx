import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { blobUrl, siteName } from '@/lib/appConfig';
import { plainText } from '@/lib/format';
import { alternates, getT } from '@/lib/i18n/server';
import Listing from '@/server/model/listing';
import { sliderTyping } from '@/server/services/pages';
import { siteCardImages } from '@/server/services/shareCard';
import { MapLoader } from './MapLoader';

type Props = PageProps<'/[lang]/map'>;

// A listing with no pin opens here (?listing=, listingHref): the link to it
// previews as the listing - its first photo and its title - the way a
// Marketplace link does, not as the map.
async function sharedListing(searchParams: Props['searchParams']) {
  const id = Number((await searchParams).listing);
  if (!Number.isInteger(id) || id <= 0) return null;
  const listing = await Listing.get(id).catch(() => null);
  return listing && listing.status !== 'sold' ? listing : null;
}

// openGraph and twitter replace the root layout's whole objects, so a share of
// /map would otherwise show the home page's title, description and URL - and
// no picture, which Messenger shows as a bare title.
// Per request too: the hreflang list follows the admin's language setting.
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  await connection();
  const [t, listing, siteImages] = await Promise.all([getT(), sharedListing(searchParams), siteCardImages()]);
  const photo = blobUrl(listing?.photos[0]);
  const title = `${listing?.title || t('meta.mapTitle')} · ${siteName}`;
  const description = listing?.description ? plainText(listing.description, 160) : t('meta.mapDescription');
  const links = await alternates('/map');
  const images = photo && listing ? [{ url: photo, alt: listing.title }] : siteImages;
  // Facebook takes og:url as the page's address, so a listing's carries its id.
  const url = listing ? `${links.canonical}?show=market&listing=${listing.id}` : links.canonical;
  return {
    title: listing?.title || t('meta.mapTitle'),
    description,
    alternates: links,
    openGraph: { type: 'website', siteName, url, title, description, images },
    twitter: { card: 'summary_large_image', title, description, images: images.map((i) => i.url) },
    ...(listing ? { robots: { index: false, follow: true } } : {}),
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
  const typing = await sliderTyping();
  return <MapLoader sliderTyping={typing.enabled} />;
}
