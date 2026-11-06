import Anchor from '@/components/ui/Anchor';
import Link from '@/components/ui/Link';
import { JsonLd } from '@/components/JsonLd';
import { LandingMediaGallery } from '@/components/pin/LandingMediaGallery';
import { ProductTimeline } from '@/components/pin/ProductTimeline';
import { MediaMosaic } from '@/components/pin/MediaMosaic';
import { siteName } from '@/lib/appConfig';
import { branchMilestones, branchPins, productPath, productPinCount, type CompanyHubJson, type HubProductJson } from '@/lib/companyHub';
import { dateFormat, plainText } from '@/lib/format';
import { INTL_LOCALES } from '@/lib/i18n/config';
import type { Translator } from '@/lib/i18n/translate';
import { term } from '@/lib/searchTerms';
import { pinPath, topicJsonLd } from '@/lib/seo';
import type { TimelineVideoSetting } from '@/lib/timelineVideo';
import { companyPath } from '@/lib/topics';
import type { PinJson } from '@/lib/types';
import type { CompanyTopicPage } from '@/server/services/topics';
import type { SegmentRow } from '@/lib/companySegments';
import { CompanyCharts } from './CompanyCharts';
import { CompanySegments } from './CompanySegments';
import { PinDate, TopicBody } from './TopicView';

const CHIP = 'inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-3 py-1 text-xs font-medium text-ink hover:bg-raised hover:no-underline';

// A company's landing page: who it is, a picture wall, a card for each product
// (opening its own page), the full tree of dated threads, then every pin.
export function CompanyHubView({
  page,
  tree,
  segments,
  milestones,
  timeZone,
  video,
  t,
  description,
}: {
  page: CompanyTopicPage;
  tree: CompanyHubJson;
  segments: SegmentRow[];
  milestones: { label: string; productName: string; pin: PinJson }[];
  timeZone: string;
  video: TimelineVideoSetting;
  t: Translator;
  description: string;
}) {
  const company = page.company;
  const hub = company.hub!;
  const base = companyPath(page.name);
  const pins = [...page.upcoming, ...page.past];
  const byId = new Map<number, PinJson>([...pins, ...milestones.map((m) => m.pin)].map((p) => [p.id, p]));
  const fmt = dateFormat(INTL_LOCALES[t.locale], {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const eventPins = milestones.map((m) => m.pin);
  const labels = Object.fromEntries(milestones.map((m) => [m.pin.id, m.label]));
  const blurb = plainText(hub.description ?? company.description, 400);
  const about = plainText(hub.summary, 1600);
  const spotlight = page.upcoming[0] ?? page.past[0];
  return (
    <main className="mx-auto max-w-7xl px-4 pt-6 pb-20 sm:px-6">
      <JsonLd
        data={topicJsonLd({
          name: page.name,
          path: base,
          description,
          locale: t.locale,
          hub: { name: t('topic.companies'), path: '/companies' },
          company,
          pins: page.upcoming,
        })}
      />
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-subtle">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="text-inherit hover:text-ink">
              {siteName}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href="/companies" className="text-inherit hover:text-ink">
              {t('topic.companies')}
            </Link>
          </li>
        </ol>
      </nav>

      <header className="grid gap-8 rounded-2xl border border-line bg-gradient-to-br from-panel to-raised p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          <div className="flex flex-wrap items-center gap-4">
            {company.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- hotlinked brand mark, as on the company page
              <img src={company.logoUrl} alt="" referrerPolicy="no-referrer" className="size-14 min-w-0 rounded-xl bg-white p-1.5 shadow-sm" />
            ) : null}
            <div className="min-w-0">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{page.name}</h1>
              {blurb ? <p className="mt-1 max-w-3xl text-[15px] text-muted">{blurb}</p> : null}
            </div>
          </div>
          {about ? <p className="mt-4 max-w-4xl text-[15px] leading-relaxed text-ink/90">{about}</p> : null}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {company.wikiUrl ? (
              <Anchor href={company.wikiUrl} target="_blank" rel="noopener" className={CHIP}>
                Wikipedia
              </Anchor>
            ) : null}
            {company.websiteUrl ? (
              <Anchor href={company.websiteUrl} target="_blank" rel="noopener" className={CHIP}>
                {t('topic.website')}
              </Anchor>
            ) : null}
            <Link href={`/search?q=${encodeURIComponent(term('company', page.name))}`} prefetch={false} className={CHIP}>
              {t('thread.companyTreeAll', { name: page.name })}
            </Link>
          </div>
        </div>
        {spotlight ? (
          <aside aria-label={t(page.upcoming[0] ? 'topic.upcoming' : 'topic.past')} className="self-start rounded-xl border border-line bg-panel p-4 shadow-sm">
            <p className="text-xs font-semibold tracking-wide text-subtle uppercase">{t(page.upcoming[0] ? 'topic.upcoming' : 'topic.past')}</p>
            <div className="group mt-2">
              <LandingMediaGallery name={spotlight.title} href={pinPath(spotlight)} media={spotlight.media} className="overflow-hidden rounded-lg" />
              <Link href={pinPath(spotlight)} className="mt-3 block hover:no-underline">
                <span className="block text-xs font-medium text-subtle"><PinDate pin={spotlight} timeZone={timeZone} t={t} /></span>
                <span className="mt-0.5 block text-base leading-snug font-semibold text-ink group-hover:text-link">{spotlight.title}</span>
              </Link>
            </div>
            <p className="mt-3 border-t border-line pt-3 text-xs text-muted tabular-nums">
              {t('topic.counts', {
                upcoming: page.upcomingCount,
                total: page.total,
              })}
            </p>
          </aside>
        ) : null}
      </header>

      <CompanyCharts name={page.name} ticker={company.ticker} sentiment={company.sentiment} className="mt-6" />

      <CompanySegments rows={segments} t={t} className="mt-6" />

      <MediaMosaic
        pins={eventPins.length >= 2 ? eventPins : pins}
        labels={labels}
        dateOf={eventPins.length >= 2 ? (p) => fmt.format(new Date(p.utcStartDateTime)) : undefined}
        max={17}
        className="mt-6"
      />

      {tree.products.length ? (
        <section aria-labelledby="products-heading" className="mt-10">
          <h2 id="products-heading" className="mb-4 text-xl font-semibold tracking-tight">
            {t('thread.companyTreeHeading')}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tree.products.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} base={base} byId={byId} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ProductTimeline products={tree.products} base={base} t={t} now={new Date()} className="mt-10" />

      <div className="mt-12">
        <TopicBody page={page} timeZone={timeZone} video={video} t={t} tiles />
      </div>
    </main>
  );
}

function ProductCard({ product, base, byId }: { product: HubProductJson; base: string; byId: Map<number, PinJson> }) {
  const media = [...branchMilestones(product).map((m) => m.pin), ...branchPins(product)]
    .flatMap((p) => byId.get(p.id)?.media ?? []);
  const count = productPinCount(product);
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-panel hover:shadow-md">
      <LandingMediaGallery name={product.name} href={productPath(base, product)} media={media} />
      <Link href={productPath(base, product)} className="flex flex-1 flex-col gap-1.5 p-4 hover:no-underline">
        <span className="flex items-baseline justify-between gap-2">
          <span className="text-base font-semibold text-ink">{product.name}</span>
          <span className="shrink-0 text-xs text-subtle tabular-nums">{count}</span>
        </span>
        {product.summary ? <span className="text-sm text-muted">{product.summary}</span> : null}
        {product.children.length ? (
          <span className="mt-auto flex flex-wrap gap-1 pt-2">
            {product.children.map((c) => (
              <span key={c.id} className="rounded-full bg-raised px-2 py-0.5 text-xs text-muted">
                {c.name}
              </span>
            ))}
          </span>
        ) : null}
      </Link>
    </article>
  );
}
