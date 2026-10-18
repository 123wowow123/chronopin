import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { Suspense } from 'react';
import { PersonView } from '@/components/person/PersonView';
import { siteName } from '@/lib/appConfig';
import { localizePath } from '@/lib/i18n/config';
import { alternates, getT } from '@/lib/i18n/server';
import { personPath } from '@/lib/people';
import { topicSlug } from '@/lib/topics';
import { timelineVideo } from '@/server/services/pages';
import { personPage } from '@/server/services/people';
import { viewerTimeZone } from '@/server/viewer';
import { siteCardImages } from '@/server/services/shareCard';

type Props = PageProps<'/[lang]/person/[slug]'>;

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
  const page = await personPage(slug, t.locale);
  if (!page) return { robots: { index: false } };
  const { profile } = page;
  const title = t('person.title', { name: profile.name });
  const description = t('person.description', { name: profile.name, site: siteName });
  const images = await siteCardImages();
  const links = await alternates(personPath(profile.name));
  return {
    title,
    description,
    alternates: links,
    openGraph: { type: 'profile', siteName, url: links.canonical, title: `${title} · ${siteName}`, description, images },
    twitter: { card: 'summary_large_image', title: `${title} · ${siteName}`, description, images: images.map((i) => i.url) },
  };
}

export default function PersonRoute({ params }: Props) {
  return (
    <Suspense fallback={<div className="mx-auto h-[70vh] max-w-7xl animate-pulse rounded-xl bg-panel" aria-busy="true" />}>
      <PersonContent params={params} />
    </Suspense>
  );
}

async function PersonContent({ params }: Pick<Props, 'params'>) {
  const [{ raw, slug }, t] = await Promise.all([slugOf(params), getT()]);
  const page = await personPage(slug, t.locale);
  if (!page) notFound();
  // One URL per person: /person/Susan-Collins goes to /person/susan-collins.
  if (raw !== slug) permanentRedirect(localizePath(personPath(page.profile.name), t.locale));
  const [timeZone, video] = await Promise.all([viewerTimeZone(), timelineVideo()]);
  return <PersonView profile={page.profile} pins={page.pins} trades={page.trades} tradeSummary={page.tradeSummary} campaigns={page.campaigns} timeZone={timeZone} video={video} t={t} />;
}
