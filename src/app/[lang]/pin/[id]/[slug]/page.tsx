import type { Metadata } from 'next';
import Link from '@/components/ui/Link';
import { notFound } from 'next/navigation';
import { Fragment, Suspense } from 'react';
import { JsonLd } from '@/components/JsonLd';
import { Comments } from '@/components/pin/Comments';
import { CompanyTicker } from '@/components/pin/CompanyTicker';
import { CountdownMeter } from '@/components/pin/CountdownMeter';
import { CitedText } from '@/components/pin/CitedText';
import { DateConfidence, DateConfidenceReasoning } from '@/components/pin/DateConfidence';
import { DelayBadge, DelayReasoning } from '@/components/pin/DelayBadge';
import { DateRanges } from '@/components/pin/DateRanges';
import { FollowButton } from '@/components/pin/FollowButton';
import { PinAdminLink } from '@/components/pin/PinAdminLink';
import { CardGrid } from '@/components/pin/CardGrid';
import { PinCard } from '@/components/pin/PinCard';
import { PinConfidence } from '@/components/pin/PinConfidence';
import { PinDuplicates } from '@/components/pin/PinDuplicates';
import { PinOdds } from '@/components/pin/PinOdds';
import { PinStocks } from '@/components/pin/PinStocks';
import { PinAwards } from '@/components/pin/PinAwards';
import { PinTags } from '@/components/pin/PinTags';
import { PinRatings, RatingSummary } from '@/components/pin/PinRatings';
import { EpisodeCount } from '@/components/pin/EpisodeCount';
import { MarketVolume } from '@/components/pin/MarketVolume';
import { PinReferences } from '@/components/pin/PinReferences';
import { PinMapLoader } from '@/components/pin/PinMapLoader';
import { PinMediaFrame } from '@/components/pin/PinMedia';
import { PinWeather } from '@/components/pin/PinWeather';
import { RefineLink } from '@/components/pin/RefineLink';
import { ViewCount } from '@/components/pin/ViewCount';
import { ThreadAge } from '@/components/pin/ThreadAge';
import { ThreadSuggestion } from '@/components/pin/ThreadSuggestion';
import { WatchButton } from '@/components/pin/WatchButton';
import { TimelineVideoProvider } from '@/lib/client/timelineVideo';
import { Icon } from '@/components/ui/Icon';
import { PostedTime, StartTime } from '@/components/ui/LocalTime';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { pinDateRanges } from '@/lib/dateClaims';
import { dayKeyIn, money } from '@/lib/format';
import { pinMarketRefs } from '@/lib/predictionMarkets';
import { pinEvidence } from '@/lib/referenceConfidence';
import { safeCitedHtml, safeHtml, toCardPins } from '@/lib/sanitize';
import { pinJsonLd, pinMetadata, pinPath } from '@/lib/seo';
import { pinTense } from '@/lib/timeline';
import type { PinJson } from '@/lib/types';
import { duplicateGroupPins, pinById, pinComments, relatedPins, threadPins, timelineVideo } from '@/server/services/pages';
import { viewerTimeZone } from '@/server/viewer';
import { getLocale, getT } from '@/lib/i18n/server';
import { categoryLabel } from '@/lib/i18n/labels';
import type { Translator } from '@/lib/i18n/translate';
import { after } from 'next/server';
import { needsTranslation, requestTranslation } from '@/server/services/translations';

// src/proxy.ts sends the real 308s and 404s for pin URLs before this renders.
type Props = PageProps<'/[lang]/pin/[id]/[slug]'>;

// The pin in the page's language (its translation, when there is one).
async function loadPin(params: Props['params']) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? pinById(id, await getLocale()) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [pin, t] = await Promise.all([loadPin(params), getT()]);
  return pin ? pinMetadata(pin, t.locale) : { title: t('meta.pinNotFound'), robots: { index: false } };
}

export default function PinPage({ params }: Props) {
  return (
    <main className="mx-auto max-w-7xl px-4 pt-6 pb-20 sm:px-6">
      <Suspense fallback={<div className="h-[70vh] animate-pulse rounded-xl bg-panel" aria-busy="true" />}>
        <PinContent params={params} />
      </Suspense>
    </main>
  );
}

async function PinContent({ params }: Pick<Props, 'params'>) {
  // The slug was already checked (and redirected) by src/proxy.ts.
  const [pin, t] = await Promise.all([loadPin(params), getT()]);
  if (!pin) {
    notFound();
  }
  // Read in a language it has no words in yet: translated once the page has
  // been answered, for the next reader.
  if (needsTranslation(pin, t.locale)) {
    after(() => requestTranslation(pin.id));
  }

  return (
    <>
      <JsonLd data={pinJsonLd(pin, t.locale)} />
      {/* grid-cols-[minmax(0,1fr)]: the single column below lg is otherwise
          floored by its content's min-width, which scrolls the page sideways. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-10">
        <article>
          <PinBodyForViewer pin={pin} />
        </article>

        <aside className="min-w-0">
          {pin.latitude != null && pin.longitude != null ? (
            <div>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                {pin.address ? (
                  <p className="flex min-w-0 items-center gap-1.5 text-muted">
                    <Icon name="pin" className="size-4 shrink-0" />
                    {pin.address}
                  </p>
                ) : (
                  <span />
                )}
                <Link href={`/map?pin=${pin.id}`} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-raised px-2.5 py-0.5 text-xs font-medium text-muted ring-1 ring-line ring-inset hover:text-ink hover:no-underline">
                  <Icon name="map" className="size-3.5 text-link" />
                  {t('pin.toMap')}
                </Link>
              </div>
              <PinMapLoader latitude={pin.latitude} longitude={pin.longitude} title={pin.title} flightPath={pin.flightPath} />
              {pin.flightPath ? (
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  <span>
                    {t(pin.flightPath.estimated ? 'pin.flightPathEstimated' : 'pin.flightPath')}
                    {pin.flightPath.label ? ` · ${pin.flightPath.label}` : ''}
                  </span>
                  {pin.flightPath.sourceUrl ? (
                    <a href={pin.flightPath.sourceUrl} target="_blank" rel="noopener noreferrer">
                      {t('pin.flightPathSimulation')}
                    </a>
                  ) : null}
                </p>
              ) : null}
              <PinWeather pinId={pin.id} />
            </div>
          ) : null}

          {/* Beside the pin on wide screens, under its map; after it on phones. */}
          <PinTags tags={pin.tags} className={pin.latitude != null && pin.longitude != null ? 'mt-6' : ''} />

          <Suspense fallback={null}>
            <Duplicates pin={pin} />
          </Suspense>

          <Suspense fallback={null}>
            <Thread pin={pin} />
          </Suspense>

          <Suspense fallback={<Comments pinId={pin.id} initialComments={[]} />}>
            <PinCommentsSection pinId={pin.id} />
          </Suspense>
        </aside>
      </div>

      <Suspense fallback={null}>
        <Related pin={pin} />
      </Suspense>
    </>
  );
}

async function PinBodyForViewer({ pin }: { pin: PinJson }) {
  const [timeZone, t] = await Promise.all([viewerTimeZone(), getT()]);
  return <PinBody pin={pin} timeZone={timeZone} t={t} />;
}

function PinBody({ pin, timeZone, t }: { pin: PinJson; timeZone: string; t: Translator }) {
  const media = pin.media ?? [];
  const hasCoordinates = pin.latitude != null && pin.longitude != null;
  // Searches for the company, as the same label on a card does. That search
  // opens with the company's own panel - what it is, how its pins are being
  // taken, a Follow button and the link on to its Wikipedia article.
  const company = pin.company ? (
    <RefineLink field="company" value={pin.company} className="inline-flex items-center gap-1 text-inherit hover:no-underline">
      {pin.companyLogoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- favicons from arbitrary hosts
        <img src={pin.companyLogoUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-3.5 rounded-sm" />
      ) : null}
      {pin.company}
    </RefineLink>
  ) : null;
  const dateRanges = pinDateRanges(pin, timeZone);
  // The map labels the place itself; the text is only for an address it cannot draw.
  const locationText = pin.address && !hasCoordinates ? pin.address : null;

  // Company and place as plain text, for a pin without a medium to label.
  const placeRow =
    company || locationText ? (
      <div className="mb-2 flex flex-wrap gap-x-3 text-sm text-muted">
        {company}
        {locationText ? <span>{locationText}</span> : null}
      </div>
    ) : null;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center text-xs text-subtle">
        {pin.categories?.map((category) => (
          <Fragment key={category}>
            <RefineLink field="tag" value={category} className="rounded-full bg-raised px-2.5 py-0.5 font-medium text-muted ring-1 ring-line ring-inset hover:text-ink hover:no-underline">
              {categoryLabel(t, category)}
            </RefineLink>
            <span className="px-1" />
          </Fragment>
        ))}
        {pin.utcCreatedDateTime ? (
          <span>
            {t.rich('pin.posted', { time: () => <PostedTime value={pin.utcCreatedDateTime!} serverTimeZone={timeZone} search /> })}
          </span>
        ) : null}
        {pin.user?.userName ? (
          <>
            <span className="px-1.5 text-faint" aria-hidden>·</span>
            <RefineLink field="user" value={pin.user.userName} className="text-inherit hover:text-ink hover:no-underline">
              {pin.user.userName}
            </RefineLink>
          </>
        ) : null}
        {/* Opens the timeline on this pin, centred, rather than on today. */}
        {/* The same pill as the aside's "To map". */}
        <Link href={`/?pin=${pin.id}`} className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-raised px-2.5 py-0.5 text-xs font-medium text-muted ring-1 ring-line ring-inset hover:text-ink hover:no-underline">
          <Icon name="timeline" className="size-3.5 text-link" />
          {t('pin.toTimeline')}
        </Link>
      </div>

      {media.length ? (
        <PinMediaFrame
          className="relative mb-4 overflow-hidden rounded-xl border border-line bg-black"
          overlay={
            <>
              {locationText ? <span className="media-chip absolute top-3 right-3 z-10">{locationText}</span> : null}
              {company ? <span className="media-chip absolute bottom-3 left-3 z-10">{company}</span> : null}
            </>
          }
          fallback={placeRow}
          media={media}
          title={pin.title}
          href={pin.sourceUrl}
          external
          selectable
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      ) : (
        placeRow
      )}

      {pin.utcStartDateTime ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
          <StartTime pin={pin} serverTimeZone={timeZone} allDaySuffix search />
          <DateConfidence level={pin.dateConfidence} reasoning={pin.dateConfidenceReasoning} />
          <DelayBadge pin={pin} />
          <PinConfidence evidence={pinEvidence(pin)} />
          {/* Last: the reasoning takes a line of its own below the badges. */}
          <DateConfidenceReasoning reasoning={pin.dateConfidenceReasoning}>
            {pin.dateConfidenceReasoning ? <CitedText text={pin.dateConfidenceReasoning} evidence={pinEvidence(pin)} /> : undefined}
          </DateConfidenceReasoning>
          <DelayReasoning pin={pin} />
        </div>
      ) : null}
      {pin.utcStartDateTime ? <DateRanges {...dateRanges} /> : null}

      {pin.utcStartDateTime ? <CountdownMeter start={pin.utcStartDateTime} since={pin.utcCreatedDateTime} allDay={pin.allDay} /> : null}

      <h1 className="mt-3 mb-4 flex items-start gap-2 text-3xl leading-tight font-semibold tracking-tight text-pretty">
        {pin.sourceUrl ? (
          <>
            <a href={pin.sourceUrl} target="_blank" rel="noopener" className="text-ink transition-colors hover:text-link hover:no-underline">
              {pin.title}
            </a>
            <a href={pin.sourceUrl} target="_blank" rel="noopener" aria-label={t('pin.openSource')} className="flex h-[1lh] shrink-0 items-center text-subtle hover:text-link">
              <Icon name="external" className="size-4" />
            </a>
          </>
        ) : (
          pin.title
        )}
      </h1>

      {pin.translatedTo && pin.originalTitle ? (
        <details className="-mt-2 mb-4 text-xs text-subtle">
          <summary className="cursor-pointer hover:text-ink">{t('pin.translated')}</summary>
          <p className="mt-1" lang="en">
            {t('pin.originalTitle')}: <span className="text-muted">{pin.originalTitle}</span>
          </p>
        </details>
      ) : null}

      {/* The scraped facts about the work, on one wrapping row. */}
      <div className="-mt-1 mb-4 flex flex-wrap items-center gap-2 empty:hidden">
        <PinRatings ratings={pin.ratings} className="" />
        <EpisodeCount pin={pin} />
        <MarketVolume pin={pin} />
      </div>
      <PinAwards awards={pin.awards} />
      {pinMarketRefs(pin).length ? <PinOdds pinId={pin.id} /> : null}
      <PinStocks pinId={pin.id} />

      {pin.description ? <div className="rich-text mb-3 text-base leading-relaxed font-medium text-ink" dangerouslySetInnerHTML={{ __html: safeHtml(pin.description) }} /> : null}
      {pin.longFormSummary ? <div className="rich-text text-[15px] leading-relaxed text-ink/90" dangerouslySetInnerHTML={{ __html: safeCitedHtml(pin.longFormSummary, pinEvidence(pin)) }} /> : null}

      {pin.user?.id && pin.user.userName ? (
        <div className="surface mt-6 flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <RefineLink field="user" value={pin.user.userName} className="flex items-center gap-2 font-semibold text-ink hover:no-underline">
            <UserAvatar userName={pin.user.userName} pictureUrl={pin.user.pictureUrl} className="size-9 text-sm" />
            {pin.user.userName}
          </RefineLink>
          <FollowButton userId={pin.user.id} userName={pin.user.userName} showCount />
        </div>
      ) : null}

      <div className="flex items-center justify-between py-3">
        <div className={pin.price != null && pin.price < 0 ? 'text-danger' : ''}>
          {pin.price ? (
            <>
              <span className="text-subtle">{t('pin.cost')}</span> <span className="font-semibold text-success tabular-nums">{money(pin.price, pin.priceCurrency)}</span>
            </>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <ViewCount pinId={pin.id} initial={pin.viewCount} track />
          <WatchButton pin={pin} loadForViewer />
          <PinAdminLink pinId={pin.id} />
        </div>
      </div>

      {pin.merchants?.some((m) => m.url) ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {pin.merchants
            .filter((m) => m.url)
            .map((merchant, index) => (
              <a
                key={merchant.id ?? index}
                href={merchant.url}
                target="_blank"
                rel="noopener nofollow sponsored"
                className={`btn ${
                  merchant.label === 'Amazon' ? 'bg-[#ff9900] text-black hover:bg-[#ffad33]' : merchant.label === 'Best Buy' ? 'bg-[#0046be] text-white hover:bg-[#1257d1]' : 'btn-secondary'
                }`}
              >
                <Icon name={merchant.label === 'Best Buy' ? 'tag' : 'cart'} className="size-4" />
                {merchant.label === 'Amazon' ? t('pin.buyOnAmazon') : merchant.label === 'Best Buy' ? t('pin.buyAtBestBuy') : merchant.label}
                {merchant.price ? <span className="font-normal">{money(merchant.price)}</span> : null}
                <Icon name="external" className="size-3.5 shrink-0 opacity-70" />
              </a>
            ))}
        </div>
      ) : null}

      <PinReferences pinId={pin.id} authorId={pin.user?.id ?? pin.userId} evidence={pinEvidence(pin)} sourceReasoning={pin.dateConfidenceReasoning} dateRanges={dateRanges} timeZone={timeZone} />
    </>
  );
}

async function Thread({ pin }: { pin: PinJson }) {
  const t = await getT();
  const pins = await threadPins(pin.id, t.locale);
  return (
    <section aria-labelledby="thread-heading" className="surface mt-6 p-5">
      <div className="flex items-baseline justify-between">
        <h2 id="thread-heading" className="text-base font-semibold">
          {t('pin.thread')}
        </h2>
        <Link href={`/respond/${pin.id}`} className="text-sm" prefetch={false}>
          {t('pin.respond')}
        </Link>
      </div>
      <ThreadSuggestion pinId={pin.id} />
      <ol className="mt-3 space-y-1">
        {pins.map((p, index) => (
          <li key={p.id}>
            <Link
              href={pinPath(p)}
              aria-current={p.id === pin.id ? 'page' : undefined}
              className={`flex gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink hover:no-underline ${p.id === pin.id ? 'bg-raised ring-1 ring-line ring-inset' : 'hover:bg-raised/60'}`}
            >
              <span className="w-4 shrink-0 text-right text-subtle tabular-nums">{index + 1}</span>
              <span className="min-w-0">
                {p.title}
                <span className="mt-1.5 flex flex-wrap items-center gap-x-3 text-xs font-normal">
                  <CompanyTicker pin={p} bare />
                  {/* A season's own score and run length, the way a card shows them. */}
                  <RatingSummary ratings={p.ratings} />
                  <EpisodeCount pin={p} chip />
                  <ThreadAge start={p.utcStartDateTime} allDay={p.allDay} />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

// The same event pinned by others, plus (for an admin or an author) the
// app's duplicate suggestions to review. Renders nothing when there are none.
async function Duplicates({ pin }: { pin: PinJson }) {
  const locale = await getLocale();
  const [group, timeZone] = await Promise.all([pin.duplicateGroup?.length ? duplicateGroupPins(pin.id, pin.duplicateGroup, locale) : [], viewerTimeZone()]);
  return <PinDuplicates pinId={pin.id} group={group} timeZone={timeZone} />;
}

async function PinCommentsSection({ pinId }: { pinId: number }) {
  return <Comments pinId={pinId} initialComments={await pinComments(pinId)} />;
}

async function Related({ pin }: { pin: PinJson }) {
  const t = await getT();
  const [pins, timeZone, video] = await Promise.all([
    relatedPins(pin.id, pin.originalTitle ?? pin.title, t.locale),
    viewerTimeZone(),
    timelineVideo(),
  ]);
  if (!pins.length) {
    return null;
  }
  const now = new Date();
  const todayKey = dayKeyIn(now, timeZone);
  return (
    <section aria-labelledby="related-heading" className="mt-16 border-t border-line pt-10">
      <h2 id="related-heading" className="mb-4 text-xl font-semibold tracking-tight">
        {t('pin.moreLikeThis')}
      </h2>
      {/* These cards are a suggestion nobody asked to play, same as a page of
          them: the admin setting decides whether they load their players. */}
      <TimelineVideoProvider setting={video}>
        <CardGrid>
          {toCardPins(pins).map((p) => (
            <li key={p.id}>
              <PinCard pin={p} serverTimeZone={timeZone} tense={pinTense(p, now, todayKey)} todayKey={todayKey} />
            </li>
          ))}
        </CardGrid>
      </TimelineVideoProvider>
    </section>
  );
}
