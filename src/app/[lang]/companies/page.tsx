import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { TopicLinks } from '@/components/topic/TopicView';
import { siteName } from '@/lib/appConfig';
import { alternates, getT } from '@/lib/i18n/server';
import { companyPath, MIN_INDEXED_PINS } from '@/lib/topics';
import { topicIndex } from '@/server/services/topics';
import { siteCardImages } from '@/server/services/shareCard';

// Every company with a page worth indexing, busiest first.
export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const t = await getT();
  const title = t('topic.companiesTitle');
  const description = t('topic.companiesDescription', { site: siteName });
  const images = await siteCardImages();
  const links = await alternates('/companies');
  return {
    title,
    description,
    alternates: links,
    openGraph: { type: 'website', siteName, url: links.canonical, title: `${title} · ${siteName}`, description, images },
    twitter: { card: 'summary_large_image', title: `${title} · ${siteName}`, description, images: images.map((i) => i.url) },
  };
}

export default function CompaniesPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 pt-6 pb-20 sm:px-6">
      <Suspense fallback={<div className="h-[70vh] animate-pulse rounded-xl bg-panel" aria-busy="true" />}>
        <Companies />
      </Suspense>
    </main>
  );
}

async function Companies() {
  // Per request: the counts are upcoming pins, which read the clock and the database.
  await connection();
  const [t, index] = await Promise.all([getT(), topicIndex()]);
  const shown = index.companies.filter((c) => c.pins >= MIN_INDEXED_PINS);
  return (
    <>
      <h1 className="mb-3 text-3xl font-semibold tracking-tight">{t('topic.companiesTitle')}</h1>
      <p className="mb-10 max-w-3xl text-base text-muted">{t('topic.companiesDescription', { site: siteName })}</p>
      <TopicLinks heading={t('topic.companies')} links={shown.map((c) => ({ href: companyPath(c.name), label: c.name, pins: c.pins }))} />
    </>
  );
}
