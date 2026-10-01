import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { Suspense } from 'react';
import { TopicView } from '@/components/topic/TopicView';
import { siteName } from '@/lib/appConfig';
import { localizePath } from '@/lib/i18n/config';
import { tagLabel } from '@/lib/i18n/labels';
import { alternates, getT } from '@/lib/i18n/server';
import { tagPath, topicSlug } from '@/lib/topics';
import { timelineVideo } from '@/server/services/pages';
import { tagPage } from '@/server/services/topics';
import { viewerTimeZone } from '@/server/viewer';

type Props = PageProps<'/[lang]/tag/[slug]'>;

// The slug as the URL gave it, decoded, and as the page's own spelling.
async function slugOf(params: Props['params']) {
  const { slug } = await params;
  let raw = slug;
  try {
    raw = decodeURIComponent(slug);
  } catch {}
  return { raw, slug: topicSlug(raw) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ slug }, t] = await Promise.all([slugOf(params), getT()]);
  const page = await tagPage(slug, t.locale);
  if (!page) return { robots: { index: false } };
  const label = tagLabel(t, { name: page.name, kind: page.kind });
  const title = t('topic.tagTitle', { name: label });
  const description = t('topic.tagDescription', { name: label, site: siteName });
  const links = await alternates(tagPath(page.name));
  return {
    title,
    description,
    alternates: links,
    ...(page.indexable ? {} : { robots: { index: false, follow: true } }),
    openGraph: { type: 'website', siteName, url: links.canonical, title: `${title} · ${siteName}`, description },
    twitter: { card: 'summary_large_image', title: `${title} · ${siteName}`, description },
  };
}

export default function TagPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="mx-auto h-[70vh] max-w-7xl animate-pulse rounded-xl bg-panel" aria-busy="true" />}>
      <TagContent params={params} />
    </Suspense>
  );
}

async function TagContent({ params }: Pick<Props, 'params'>) {
  const [{ raw, slug }, t] = await Promise.all([slugOf(params), getT()]);
  const page = await tagPage(slug, t.locale);
  if (!page) notFound();
  // One URL per tag: /tag/Anime and /tag/anime- go to /tag/anime.
  if (raw !== slug) permanentRedirect(localizePath(tagPath(page.name), t.locale));
  const [timeZone, video] = await Promise.all([viewerTimeZone(), timelineVideo()]);
  const label = tagLabel(t, { name: page.name, kind: page.kind });
  return (
    <TopicView
      page={page}
      kind="tag"
      path={tagPath(page.name)}
      label={label}
      description={t('topic.tagDescription', { name: label, site: siteName })}
      timeZone={timeZone}
      video={video}
      t={t}
    />
  );
}
