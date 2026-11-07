import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { ConstructionChart } from '@/components/construction/ConstructionChart';
import Link from '@/components/ui/Link';
import { siteName } from '@/lib/appConfig';
import { alternates, getT } from '@/lib/i18n/server';
import { CONSTRUCTION_ROW_LIMIT, CONSTRUCTION_YEARS, constructionSpans, type ConstructionStatus } from '@/server/services/construction';
import { siteCardImages } from '@/server/services/shareCard';

type Props = { searchParams: Promise<{ year?: string; country?: string }> };

// Default: five years from the current one, builds in the United States. ?year=2027
// moves the window's first year, ?country=all lifts the country filter.
const US = 'United States';

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const t = await getT();
  const images = await siteCardImages();
  const links = await alternates('/construction');
  const TITLE = t('guides.construction.title');
  const DESCRIPTION = t('guides.construction.description', { site: siteName });
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: links,
    openGraph: { type: 'website', siteName, url: links.canonical, title: `${TITLE} · ${siteName}`, description: DESCRIPTION, images },
    twitter: { card: 'summary_large_image', title: `${TITLE} · ${siteName}`, description: DESCRIPTION, images: images.map((i) => i.url) },
  };
}

export default function ConstructionPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<div className="mx-auto h-[70vh] max-w-7xl animate-pulse rounded-xl bg-panel" aria-busy="true" />}>
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
  const legend: [ConstructionStatus, string, 'proposed' | 'inProgress' | 'completed'][] = [['Proposed', 'bg-slate-400', 'proposed'], ['In Progress', 'bg-blue-600', 'inProgress'], ['Completed', 'bg-emerald-500', 'completed']];
  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="text-2xl font-semibold">{t('guides.construction.heading', { year: range, place: everywhere ? t('guides.construction.worldwide') : t('guides.construction.usa') })}</h1>
      <p className="mt-1 max-w-3xl text-muted">{t('guides.construction.description', { site: siteName })}</p>
      <div className="my-4 flex flex-wrap items-center gap-2">
        <Link href={href(year - 1, everywhere)} className={pill}>← {year - 1}</Link>
        <span className="px-2 font-medium">{range}</span>
        <Link href={href(year + 1, everywhere)} className={pill}>{year + 1} →</Link>
        <span className="mx-2 h-5 w-px bg-line" />
        <Link href={href(year, false)} className={`${pill} ${everywhere ? '' : 'bg-panel font-medium'}`}>{t('guides.construction.usa')}</Link>
        <Link href={href(year, true)} className={`${pill} ${everywhere ? 'bg-panel font-medium' : ''}`}>{t('guides.construction.worldwide')}</Link>
        <ul className="ms-auto flex gap-3 text-xs text-muted">
          {legend.map(([status, tone, key]) => <li key={status} className="flex items-center gap-1"><span className={`size-2.5 rounded-sm ${tone}`} />{t(`reserved.${key}`)}</li>)}
        </ul>
      </div>
      {bars.length ? (
        <>
          <ConstructionChart bars={bars} year={year} now={now} />
          <p className="mt-2 text-xs text-muted">{total > CONSTRUCTION_ROW_LIMIT ? t('guides.construction.shownOf', { shown: String(bars.length), total: String(total) }) : t('guides.construction.count', { total: String(total) })}</p>
          {undated > 0 && <p className="mt-1 text-xs text-muted">{t('guides.construction.undated', { count: String(undated) })}</p>}
        </>
      ) : <p className="rounded-xl border border-line bg-panel p-6 text-muted">{t('guides.construction.empty', { year: range })}</p>}
    </main>
  );
}
