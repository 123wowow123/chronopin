import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { TopicLinks } from '@/components/topic/TopicView';
import { siteName } from '@/lib/appConfig';
import { tagLabel } from '@/lib/i18n/labels';
import { alternates, getT } from '@/lib/i18n/server';
import { MIN_INDEXED_PINS, tagPath } from '@/lib/topics';
import { topicIndex } from '@/server/services/topics';

// Every tag with a page worth indexing, so each one is a link away from a
// page a crawler finds: the categories first, then the rest, busiest first.
export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const t = await getT();
  const title = t('topic.tagsTitle');
  const description = t('topic.tagsDescription', { site: siteName });
  const links = await alternates('/tags');
  return {
    title,
    description,
    alternates: links,
    openGraph: { type: 'website', siteName, url: links.canonical, title: `${title} · ${siteName}`, description },
  };
}

export default function TagsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 pt-6 pb-20 sm:px-6">
      <Suspense fallback={<div className="h-[70vh] animate-pulse rounded-xl bg-panel" aria-busy="true" />}>
        <Tags />
      </Suspense>
    </main>
  );
}

async function Tags() {
  // Per request: the counts are upcoming pins, which read the clock and the database.
  await connection();
  const [t, index] = await Promise.all([getT(), topicIndex()]);
  const shown = index.tags.filter((tag) => tag.pins >= MIN_INDEXED_PINS);
  const link = (tag: (typeof shown)[number]) => ({ href: tagPath(tag.name), label: tagLabel(t, tag), pins: tag.pins });
  return (
    <>
      <h1 className="mb-3 text-3xl font-semibold tracking-tight">{t('topic.tagsTitle')}</h1>
      <p className="mb-10 max-w-3xl text-base text-muted">{t('topic.tagsDescription', { site: siteName })}</p>
      <div className="grid gap-10">
        <TopicLinks heading={t('topic.categories')} links={shown.filter((tag) => tag.kind === 'category').map(link)} />
        <TopicLinks heading={t('topic.tags')} links={shown.filter((tag) => tag.kind !== 'category').map(link)} />
      </div>
    </>
  );
}
