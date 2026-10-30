import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { OnThisDayView } from '@/components/topic/OnThisDayView';
import { siteName } from '@/lib/appConfig';
import { INTL_LOCALES } from '@/lib/i18n/config';
import { alternates, getT } from '@/lib/i18n/server';
import { isMonthDay, monthDayLabel, onThisDayPath } from '@/lib/onThisDay';
import { timelineVideo } from '@/server/services/pages';
import { onThisDayPage } from '@/server/services/onThisDay';
import { siteCardImages } from '@/server/services/shareCard';
import { viewerTimeZone } from '@/server/viewer';

type Props = PageProps<'/[lang]/on-this-day/[day]'>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ day }, t] = await Promise.all([params, getT()]);
  if (!isMonthDay(day)) return { robots: { index: false } };
  const page = await onThisDayPage(day, t.locale);
  const date = monthDayLabel(day, INTL_LOCALES[t.locale]);
  const title = t('onThisDay.title', { date });
  const description = t('onThisDay.description', { date, site: siteName });
  const images = await siteCardImages();
  const links = await alternates(onThisDayPath(day));
  return {
    title,
    description,
    alternates: links,
    // A date with no pin is a page of nothing.
    ...(page.total ? {} : { robots: { index: false, follow: true } }),
    openGraph: { type: 'website', siteName, url: links.canonical, title: `${title} · ${siteName}`, description, images },
    twitter: { card: 'summary_large_image', title: `${title} · ${siteName}`, description, images: images.map((i) => i.url) },
  };
}

export default function OnThisDayPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="mx-auto h-[70vh] max-w-7xl animate-pulse rounded-xl bg-panel" aria-busy="true" />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: Pick<Props, 'params'>) {
  const [{ day }, t] = await Promise.all([params, getT()]);
  if (!isMonthDay(day)) notFound();
  const [page, timeZone, video] = await Promise.all([onThisDayPage(day, t.locale), viewerTimeZone(), timelineVideo()]);
  return <OnThisDayView page={page} timeZone={timeZone} video={video} t={t} />;
}
