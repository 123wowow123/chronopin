import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { MusicRankingView } from '@/components/music/MusicRankingView';
import { siteName } from '@/lib/appConfig';
import { alternates, getT } from '@/lib/i18n/server';
import { musicRankings } from '@/server/services/music';
import { siteCardImages } from '@/server/services/shareCard';

const TITLE = 'Top music rankings per year';
const DESCRIPTION = `Top music rankings per year on ${siteName}, grouped by continent and country across official national music charts including Billboard, Oricon, Circle Chart, and the Official Charts UK, each backed by a native timeline pin.`;

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const t = await getT();
  const rankings = await musicRankings(t.locale);
  const images = await siteCardImages();
  const links = await alternates('/music');
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: links,
    ...(rankings.length >= 8 ? {} : { robots: { index: false, follow: true } }),
    openGraph: {
      type: 'website',
      siteName,
      url: links.canonical,
      title: `${TITLE} · ${siteName}`,
      description: DESCRIPTION,
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${TITLE} · ${siteName}`,
      description: DESCRIPTION,
      images: images.map((i) => i.url),
    },
  };
}

export default function MusicLandingPage() {
  return (
    <Suspense
      fallback={
        <div
          className="mx-auto my-12 h-[70vh] max-w-7xl animate-pulse rounded-xl bg-panel"
          aria-busy="true"
        />
      }
    >
      <MusicContent />
    </Suspense>
  );
}

async function MusicContent() {
  await connection();
  const t = await getT();
  const rankings = await musicRankings(t.locale);

  return (
    <MusicRankingView
      initialRankings={rankings}
      title={TITLE}
      description={DESCRIPTION}
      path="/music"
    />
  );
}

