import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { Suspense } from 'react';
import { TopicView } from '@/components/topic/TopicView';
import { siteName } from '@/lib/appConfig';
import { localizePath } from '@/lib/i18n/config';
import { alternates, getT } from '@/lib/i18n/server';
import { companyPath, topicSlug } from '@/lib/topics';
import { timelineVideo } from '@/server/services/pages';
import { companyPage } from '@/server/services/topics';
import { viewerTimeZone } from '@/server/viewer';
import { siteCardImages } from '@/server/services/shareCard';

type Props = PageProps<'/[lang]/company/[slug]'>;

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
  const page = await companyPage(slug, t.locale);
  if (!page) return { robots: { index: false } };
  const label = page.name;
  const title = t('topic.companyTitle', { name: label });
  const description = t('topic.companyDescription', { name: label, site: siteName });
  const images = await siteCardImages();
  const links = await alternates(companyPath(page.name));
  return {
    title,
    description,
    alternates: links,
    ...(page.indexable ? {} : { robots: { index: false, follow: true } }),
    openGraph: { type: 'website', siteName, url: links.canonical, title: `${title} · ${siteName}`, description, images },
    twitter: { card: 'summary_large_image', title: `${title} · ${siteName}`, description, images: images.map((i) => i.url) },
  };
}

export default function CompanyPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="mx-auto h-[70vh] max-w-7xl animate-pulse rounded-xl bg-panel" aria-busy="true" />}>
      <CompanyContent params={params} />
    </Suspense>
  );
}

async function CompanyContent({ params }: Pick<Props, 'params'>) {
  const [{ raw, slug }, t] = await Promise.all([slugOf(params), getT()]);
  const page = await companyPage(slug, t.locale);
  if (!page) notFound();
  // One URL per company: /company/Nintendo goes to /company/nintendo.
  if (raw !== slug) permanentRedirect(localizePath(companyPath(page.name), t.locale));
  const [timeZone, video] = await Promise.all([viewerTimeZone(), timelineVideo()]);
  const label = page.name;
  return (
    <TopicView
      page={page}
      kind="company"
      path={companyPath(page.name)}
      label={label}
      description={t('topic.companyDescription', { name: label, site: siteName })}
      timeZone={timeZone}
      video={video}
      t={t}
    />
  );
}
