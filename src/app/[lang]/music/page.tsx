import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { MusicRankingView } from '@/components/music/MusicRankingView';
import { siteName } from '@/lib/appConfig';
import { alternates, getT } from '@/lib/i18n/server';
import { musicRankings } from '@/server/services/music';
import { siteCardImages } from '@/server/services/shareCard';

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const t = await getT();
  const TITLE = t('guides.music.title');
  const DESCRIPTION = t('guides.music.description', { site: siteName });
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
  const TITLE = t('guides.music.title');
  const DESCRIPTION = t('guides.music.description', { site: siteName });
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

