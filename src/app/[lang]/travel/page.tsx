import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { TravelView } from '@/components/travel/TravelView';
import { siteName } from '@/lib/appConfig';
import { alternates, getT } from '@/lib/i18n/server';
import { MIN_INDEXED_RESORTS } from '@/lib/travel';
import { travelShelves } from '@/server/services/travel';
import { siteCardImages } from '@/server/services/shareCard';
import { adPlacements } from '@/server/services/pages';

const TITLE = 'The best resorts & travel guide';
const DESCRIPTION = `The best luxury resorts and destinations on ${siteName}, ranked on the published hotel rubric of rooms, service, location, cleanliness, value and critic acclaim, with the optimal season and weather behind every journey.`;

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const t = await getT();
  const shelves = await travelShelves(t.locale);
  const images = await siteCardImages();
  const links = await alternates('/travel');
  const totalPins = shelves.flatMap((s) => s.pins).length;
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: links,
    ...(totalPins >= MIN_INDEXED_RESORTS ? {} : { robots: { index: false, follow: true } }),
    openGraph: { type: 'website', siteName, url: links.canonical, title: `${TITLE} · ${siteName}`, description: DESCRIPTION, images },
    twitter: { card: 'summary_large_image', title: `${TITLE} · ${siteName}`, description: DESCRIPTION, images: images.map((i) => i.url) },
  };
}

export default function TravelPage() {
  return (
    <Suspense fallback={<div className="mx-auto h-[70vh] max-w-7xl animate-pulse rounded-xl bg-panel" aria-busy="true" />}>
      <Travel />
    </Suspense>
  );
}

async function Travel() {
  await connection();
  const t = await getT();
  const [shelves, placements] = await Promise.all([travelShelves(t.locale), adPlacements()]);
  return (
    <TravelView
      shelves={shelves}
      title={TITLE}
      description={DESCRIPTION}
      path="/travel"
      adPlacementsMap={placements}
    />
  );
}

