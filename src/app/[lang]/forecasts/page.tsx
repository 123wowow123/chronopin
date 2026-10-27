import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { ForecastsView } from '@/components/forecasts/ForecastsView';
import { LandingMark } from '@/components/ui/LandingMark';
import Link from '@/components/ui/Link';
import styles from '@/components/restaurants/RestaurantGuide.module.css';
import { industrySlug } from '@/lib/industryForecast';
import { siteName } from '@/lib/appConfig';
import { alternates, getT } from '@/lib/i18n/server';
import { forecastPanels } from '@/server/services/forecasts';
import { siteCardImages } from '@/server/services/shareCard';


export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const t = await getT();
  const TITLE = t('forecasts.title');
  const DESCRIPTION = t('forecasts.description', { site: siteName });
  const images = await siteCardImages();
  const links = await alternates('/forecasts');
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: links,
    openGraph: { type: 'website', siteName, url: links.canonical, title: `${TITLE} · ${siteName}`, description: DESCRIPTION, images },
    twitter: { card: 'summary_large_image', title: `${TITLE} · ${siteName}`, description: DESCRIPTION, images: images.map((i) => i.url) },
  };
}

export default function ForecastsPage() {
  return (
    <Suspense fallback={<div className="mx-auto h-[70vh] max-w-7xl animate-pulse rounded-xl bg-panel" aria-busy="true" />}>
      <Forecasts />
    </Suspense>
  );
}

async function Forecasts() {
  await connection();
  const t = await getT();
  const forecasts = await forecastPanels();
  const industries = new Set(forecasts.map((f) => f.industry)).size;
  const sources = new Set(forecasts.flatMap((f) => f.sources.map((s) => new URL(s.url).hostname.replace(/^www\./, '')))).size;
  const projected = forecasts.filter((f) => f.projection).length;
  const counts = new Map<string, number>();
  for (const f of forecasts) counts.set(f.industry, (counts.get(f.industry) ?? 0) + 1);
  const industryLinks = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const stats = [[forecasts.length, t('forecasts.statPanels')], [industries, t('forecasts.statIndustries')], [projected, t('forecasts.statProjections')], [sources, t('forecasts.statPublishers')]] as const;
  return (
    <main className={`${styles.guide} max-sm:px-3!`} data-landing>
      <LandingMark />
      <div className={styles.container}>
        <div className={styles.guideNav}>
          <Link href="/forecasts" className={styles.wordmark}><span aria-hidden="true">✳</span> {t('forecasts.wordmark')}</Link>
        </div>
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{t('forecasts.eyebrow')}</p>
            <h1>{t('forecasts.headingLead')} <em>{t('forecasts.headingEm')}</em></h1>
            <p className={styles.lead}>{t('forecasts.description', { site: siteName })}</p>
          </div>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[5px] border border-(--rule) bg-(--rule)">
            {stats.map(([n, label]) => (
              <div key={label} className="flex min-h-[150px] flex-col justify-center bg-(--paper-raised) px-6">
                <dt className="order-2 mt-2 text-[11px] font-bold tracking-[1.5px] text-(--soft) uppercase">{label}</dt>
                <dd className="order-1 font-serif text-6xl leading-none tracking-tight text-(--green)">{n}</dd>
              </div>
            ))}
          </dl>
        </header>
        <nav aria-label={t('forecasts.byIndustry')} className="mt-6 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-[11px] font-bold tracking-[1.5px] text-(--soft) uppercase">{t('forecasts.byIndustry')}</span>
          {industryLinks.map(([name, count]) => (
            <Link key={name} href={`/forecasts/${industrySlug(name)}`} className="rounded-full border border-(--rule) px-3 py-1 text-(--soft) hover:text-(--text)">{name} <span className="opacity-60">{count}</span></Link>
          ))}
        </nav>
        <ForecastsView forecasts={forecasts} />
      </div>
    </main>
  );
}
