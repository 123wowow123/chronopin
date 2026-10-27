import type { Metadata } from 'next';
import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { JsonLd } from '@/components/JsonLd';
import { ForecastCard } from '@/components/timeline/IndustryForecastPanel';
import { LandingMark } from '@/components/ui/LandingMark';
import Link from '@/components/ui/Link';
import styles from '@/components/restaurants/RestaurantGuide.module.css';
import { siteName } from '@/lib/appConfig';
import { formatForecastValue, industrySlug, type IndustryForecastJson } from '@/lib/industryForecast';
import { alternates, getT } from '@/lib/i18n/server';
import { localizePath } from '@/lib/i18n/config';
import { absoluteUrl } from '@/lib/seo';
import { forecastPanels } from '@/server/services/forecasts';
import { siteCardImages } from '@/server/services/shareCard';

type Props = PageProps<'/[lang]/forecasts/[industry]'>;

// The industry's forecasts; null for a slug no panel is filed under.
async function industryOf(params: Props['params']) {
  const { industry } = await params;
  const items = (await forecastPanels()).filter((f) => industrySlug(f.industry) === industry);
  return items.length ? { name: items[0].industry, slug: industry, items } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection();
  const [page, t] = await Promise.all([industryOf(params), getT()]);
  if (!page) return { robots: { index: false } };
  const title = t('forecasts.industryTitle', { industry: page.name });
  const description = t('forecasts.industryDescription', { industry: page.name, count: page.items.length, site: siteName });
  const images = await siteCardImages();
  const links = await alternates(`/forecasts/${page.slug}`);
  return {
    title,
    description,
    alternates: links,
    openGraph: { type: 'website', siteName, url: links.canonical, title: `${title} · ${siteName}`, description, images },
    twitter: { card: 'summary_large_image', title: `${title} · ${siteName}`, description, images: images.map((i) => i.url) },
  };
}

export default function IndustryForecastsPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="mx-auto h-[70vh] max-w-7xl animate-pulse rounded-xl bg-panel" aria-busy="true" />}>
      <IndustryForecasts params={params} />
    </Suspense>
  );
}

// A Dataset per panel (its figures and publishers), under a CollectionPage and breadcrumb.
function jsonLd(name: string, path: string, items: IndustryForecastJson[], locale: Parameters<typeof localizePath>[1], description: string, hub: string) {
  const url = absoluteUrl(localizePath(path, locale));
  const datasets = items.map((f) => {
    const years = [...(f.projection?.points ?? []), ...f.lines.flatMap((l) => l.points)].map((p) => p.x).filter(Boolean).sort();
    return {
      '@type': 'Dataset',
      name: f.title,
      description: f.note ?? `${f.title}: ${f.industry} figures with their sources.`,
      keywords: [f.industry, ...f.tags],
      dateModified: f.checkedAt,
      ...(years.length ? { temporalCoverage: years.length > 1 ? `${years[0]}/${years[years.length - 1]}` : years[0] } : {}),
      isBasedOn: f.sources.map((s) => ({ '@type': 'CreativeWork', name: s.label, url: s.url, ...(s.date ? { datePublished: s.date } : {}) })),
    };
  });
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      url,
      name,
      description,
      hasPart: datasets,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: siteName, item: absoluteUrl(localizePath('/', locale)) },
        { '@type': 'ListItem', position: 2, name: hub, item: absoluteUrl(localizePath('/forecasts', locale)) },
        { '@type': 'ListItem', position: 3, name, item: url },
      ],
    },
  ];
}

async function IndustryForecasts({ params }: Pick<Props, 'params'>) {
  await connection();
  const [page, t] = await Promise.all([industryOf(params), getT()]);
  if (!page) notFound();
  const title = t('forecasts.industryTitle', { industry: page.name });
  const description = t('forecasts.industryDescription', { industry: page.name, count: page.items.length, site: siteName });
  return (
    <main className={`${styles.guide} max-sm:px-3!`} data-landing>
      <LandingMark />
      {jsonLd(title, `/forecasts/${page.slug}`, page.items, t.locale, description, t('forecasts.title')).map((d, i) => <JsonLd key={i} data={d} />)}
      <div className={styles.container}>
        <div className={styles.guideNav}>
          <Link href="/forecasts" className={styles.wordmark}><span aria-hidden="true">✳</span> {t('forecasts.wordmark')}</Link>
          <Link href="/forecasts" className="text-sm underline underline-offset-2">{t('forecasts.allForecasts')}</Link>
        </div>
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{t('forecasts.eyebrow')}</p>
            <h1>{title}</h1>
            <p className={styles.lead}>{description}</p>
          </div>
        </header>
        <section className={styles.section} aria-label={title}>
          {/* The cards take the page's paper colours rather than the site panel's. */}
          <div className="grid gap-4 [--color-line:var(--rule)] [--color-panel:var(--paper-raised)] md:grid-cols-2 xl:grid-cols-3">
            {page.items.map((f) => <ForecastCard key={f.slug} forecast={f} />)}
          </div>
        </section>
        {/* The figures and sources as plain text, so they are in the page whether or not a chart draws. */}
        <section className={styles.section}>
          <ul className="space-y-4 text-sm">
            {page.items.map((f) => {
              const points = [...(f.projection?.points ?? []), ...f.lines.flatMap((l) => l.points)];
              return (
                <li key={f.slug}>
                  <h2 className="font-medium">{f.title}</h2>
                  {points.length ? <p className="font-serif text-(--green) tabular-nums">{points.map((p) => `${formatForecastValue(f, p.value)}${p.x ? ` (${p.x})` : ''}`).join(' → ')}</p> : null}
                  {f.note ? <p className="mt-1 text-(--soft)">{f.note}</p> : null}
                  <ul className="mt-1 space-y-1 text-xs">
                    {f.sources.map((s) => (
                      <li key={s.url}>
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{s.label}</a>
                        {s.date ? <span className="text-(--soft)"> · {s.date}</span> : null}
                        {s.quote ? <span className="text-(--soft) italic"> “{s.quote}”</span> : null}
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </main>
  );
}
