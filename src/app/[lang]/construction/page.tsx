import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { ConstructionExplorer } from '@/components/construction/ConstructionExplorer';
import Link from '@/components/ui/Link';
import { siteName } from '@/lib/appConfig';
import { alternates, getT } from '@/lib/i18n/server';
import { hasQueryParam, NOINDEX_FOLLOW } from '@/lib/seo';
import { CONSTRUCTION_ROW_LIMIT, CONSTRUCTION_YEARS, constructionSpans } from '@/server/services/construction';
import { siteCardImages } from '@/server/services/shareCard';

type Props = { searchParams: Promise<{ year?: string; country?: string }> };

// Default: five years from the current one, builds in the United States. ?year=2027
// moves the window's first year, ?country=all lifts the country filter.
const US = 'United States';

const CONSTRUCTION_NOINDEX_PARAMS = ['year', 'country'] as const;

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  await connection();
  const [t, params, images, links] = await Promise.all([getT(), searchParams, siteCardImages(), alternates('/construction')]);
  const parameterized = hasQueryParam(params, CONSTRUCTION_NOINDEX_PARAMS);
  const TITLE = t('guides.construction.title');
  const DESCRIPTION = t('guides.construction.description', { site: siteName });
  return {
    title: TITLE,
    description: DESCRIPTION,
    ...(parameterized ? NOINDEX_FOLLOW : { alternates: links }),
    openGraph: { type: 'website', siteName, url: links.canonical, title: `${TITLE} · ${siteName}`, description: DESCRIPTION, images },
    twitter: { card: 'summary_large_image', title: `${TITLE} · ${siteName}`, description: DESCRIPTION, images: images.map((i) => i.url) },
  };
}

export default function ConstructionPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<div className="mx-auto h-[70vh] max-w-[120rem] animate-pulse rounded-xl bg-panel" aria-busy="true" />}>
      <Construction searchParams={searchParams} />
    </Suspense>
  );
}

async function Construction({ searchParams }: Props) {
  await connection();
  const t = await getT();
  const params = await searchParams;
  const now = Date.now();
  const thisYear = new Date(now).getUTCFullYear();
  const asked = Number(params.year);
  const year = Number.isInteger(asked) && asked >= 1900 && asked <= thisYear + 50 ? asked : thisYear;
  const everywhere = params.country === 'all';
  const { bars, total, undated } = await constructionSpans(year, everywhere ? null : US, t.locale);
  const range = `${year}–${year + CONSTRUCTION_YEARS - 1}`;
  const href = (y: number, all: boolean) => `/construction?year=${y}${all ? '&country=all' : ''}`;
  const pill = 'rounded-full border border-line px-3 py-1 text-sm hover:bg-panel';
  return (
    <main className="mx-auto w-full max-w-[120rem] px-4 py-6">
      <h1 className="text-2xl font-semibold">{t('guides.construction.heading', { year: range, place: everywhere ? t('guides.construction.worldwide') : t('guides.construction.usa') })}</h1>
      <p className="mt-1 max-w-3xl text-muted">{t('guides.construction.description', { site: siteName })}</p>
      <div className="my-4 flex flex-wrap items-center gap-2">
        <Link href={href(year, false)} className={`${pill} ${everywhere ? '' : 'bg-panel font-medium'}`}>{t('guides.construction.usa')}</Link>
        <Link href={href(year, true)} className={`${pill} ${everywhere ? 'bg-panel font-medium' : ''}`}>{t('guides.construction.worldwide')}</Link>
      </div>
      {bars.length ? (
        <>
          <ConstructionExplorer bars={bars} year={year} now={now} />
          <p className="mt-2 text-xs text-muted">{total > CONSTRUCTION_ROW_LIMIT ? t('guides.construction.shownOf', { shown: String(bars.length), total: String(total) }) : t('guides.construction.count', { total: String(total) })}</p>
          {undated > 0 && <p className="mt-1 text-xs text-muted">{t('guides.construction.undated', { count: String(undated) })}</p>}
        </>
      ) : <p className="rounded-xl border border-line bg-panel p-6 text-muted">{t('guides.construction.empty', { year: range })}</p>}
    </main>
  );
}
