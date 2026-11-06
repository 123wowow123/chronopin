import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { OpenSourceOnHash } from '@/components/pin/OpenSourceOnHash';
import Link from '@/components/ui/Link';
import { CardImage } from '@/components/pin/CardImage';
import { MediaMosaic, pinPicture } from '@/components/pin/MediaMosaic';
import { ProductTimeline } from '@/components/pin/ProductTimeline';
import { PinSection } from '@/components/topic/TopicView';
import { TimelineVideoProvider } from '@/lib/client/timelineVideo';
import { siteName } from '@/lib/appConfig';
import { overviewParagraphs, productPath } from '@/lib/companyHub';
import { pinPath } from '@/lib/seo';
import { dateFormat, dayKeyIn } from '@/lib/format';
import { INTL_LOCALES } from '@/lib/i18n/config';
import { alternates, getT } from '@/lib/i18n/server';
import { companyPath, topicSlug } from '@/lib/topics';
import { companyProductPage } from '@/server/services/topics';
import { timelineVideo } from '@/server/services/pages';
import { viewerTimeZone } from '@/server/viewer';

type Props = PageProps<'/[lang]/company/[slug]/[product]'>;

async function slugs(params: Props['params']) {
  const { slug, product } = await params;
  const decode = (s: string) => {
    try {
      return topicSlug(decodeURIComponent(s));
    } catch {
      return topicSlug(s);
    }
  };
  return { company: decode(slug), product: decode(product) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [s, t] = await Promise.all([slugs(params), getT()]);
  const page = await companyProductPage(s.company, s.product, t.locale);
  if (!page) return { robots: { index: false } };
  const title = `${page.product.name} · ${page.company.name}`;
  const description = page.product.summary ?? `${page.product.name}: the dated pins about ${page.company.name}'s ${page.product.name}.`;
  const links = await alternates(productPath(companyPath(page.company.name), page.product));
  return { title, description, alternates: links, openGraph: { type: 'website', siteName, url: links.canonical, title: `${title} · ${siteName}`, description } };
}

export default function CompanyProductPage({ params }: Props) {
  return (
    <main className="mx-auto max-w-7xl px-4 pt-6 pb-20 sm:px-6">
      <Suspense fallback={<div className="h-[70vh] animate-pulse rounded-xl bg-panel" aria-busy="true" />}>
        <Content params={params} />
      </Suspense>
    </main>
  );
}

async function Content({ params }: Pick<Props, 'params'>) {
  const [s, t] = await Promise.all([slugs(params), getT()]);
  const page = await companyProductPage(s.company, s.product, t.locale);
  if (!page) notFound();
  const [timeZone, video] = await Promise.all([viewerTimeZone(), timelineVideo()]);
  const now = new Date();
  const todayKey = dayKeyIn(now, timeZone);
  const base = companyPath(page.company.name);
  const { paragraphs, cited } = overviewParagraphs(page.product.overview);
  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-subtle">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href={base} className="text-inherit hover:text-ink">
              {page.company.name}
            </Link>
          </li>
          {page.ancestors.map((a) => (
            <li key={a.id} className="flex items-center gap-1.5">
              <span aria-hidden>/</span>
              <Link href={productPath(base, a)} className="text-inherit hover:text-ink">
                {a.name}
              </Link>
            </li>
          ))}
          <li aria-hidden>/</li>
          <li aria-current="page">{page.product.name}</li>
        </ol>
      </nav>
      <h1 className="text-2xl font-semibold tracking-tight">{page.product.name}</h1>
      {page.product.summary ? <p className="mt-2 text-[15px] text-ink/90">{page.product.summary}</p> : null}
      <MediaMosaic
        pins={page.milestones.length >= 2 ? page.milestones.map((m) => m.pin) : [...page.past, ...page.upcoming]}
        labels={Object.fromEntries(page.milestones.map((m) => [m.pin.id, m.label]))}
        dateOf={page.milestones.length >= 2 ? (p) => dateFormat(INTL_LOCALES[t.locale], { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(p.utcStartDateTime)) : undefined}
        className="mt-5"
      />
      {paragraphs.length || page.product.facts.length ? (
        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_26rem]">
          <article className="min-w-0 space-y-4 text-[15px] leading-relaxed">
            {paragraphs.map((parts, i) => (
              <p key={i}>
                {parts.map((part, j) =>
                  'text' in part ? (
                    part.text
                  ) : (
                    <sup key={j} className="ms-0.5 text-xs">
                      <a href={`#source-${part.cite}`}>[{part.cite}]</a>
                    </sup>
                  ),
                )}
              </p>
            ))}
            {cited.length ? (
              <details className="group pt-2">
                <OpenSourceOnHash />
                <summary className="mb-2 cursor-pointer text-base font-semibold">
                  {t('references.heading')} <span className="text-sm font-normal text-subtle">({cited.length})</span>
                </summary>
                <ol className="space-y-1 text-sm">
                  {cited.map((id, i) => {
                    const pin = page.cited.find((c) => c.id === id);
                    return pin ? (
                      <li key={id} id={`source-${i + 1}`} className="flex scroll-mt-24 gap-2 rounded-md px-2 py-1 data-[hit]:bg-accent/15 data-[hit]:ring-1 data-[hit]:ring-accent/40">
                        <span className="w-6 shrink-0 text-subtle tabular-nums">[{i + 1}]</span>
                        <Link href={pinPath(pin)}>{pin.title}</Link>
                      </li>
                    ) : null;
                  })}
                </ol>
              </details>
            ) : null}
          </article>
          {page.product.facts.length ? (
            <aside className="surface h-fit p-4 text-sm">
              <h2 className="mb-2 text-base font-semibold">{page.product.name}</h2>
              <dl className="divide-y divide-line">
                {page.product.facts.map((f, i) => {
                  const pin = f.pinId ? page.cited.find((c) => c.id === f.pinId) : undefined;
                  const full = f.pinId ? [...page.upcoming, ...page.past].find((x) => x.id === f.pinId) : undefined;
                  const pic = full ? pinPicture(full) : null;
                  return (
                    <div key={i} className="flex gap-3 py-2.5">
                      {pin && pic ? (
                        <Link href={pinPath(pin)} tabIndex={-1} aria-hidden className="relative block min-h-16 w-28 shrink-0 self-stretch overflow-hidden rounded-md bg-panel">
                          <CardImage thumbName={pic.thumbName} originalUrl={pic.originalUrl} alt="" />
                        </Link>
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <dt className="mb-1 text-xs font-medium tracking-wide text-subtle uppercase">{f.label}</dt>
                        <dd>{pin ? <Link href={pinPath(pin)}>{f.value}</Link> : f.value}</dd>
                      </div>
                    </div>
                  );
                })}
              </dl>
            </aside>
          ) : null}
        </div>
      ) : null}
      {page.product.children.length ? <ProductTimeline products={[page.product]} base={base} t={t} now={now} className="mt-8" /> : null}
      <div className="mt-10">
        <TimelineVideoProvider setting={video}>
          <PinSection id="upcoming" heading={t('topic.upcoming')} pins={page.upcoming} timeZone={timeZone} now={now} todayKey={todayKey} tiles t={t} />
          <PinSection id="recent" heading={t('topic.past')} pins={page.past} timeZone={timeZone} now={now} todayKey={todayKey} tiles t={t} />
        </TimelineVideoProvider>
      </div>
    </>
  );
}
