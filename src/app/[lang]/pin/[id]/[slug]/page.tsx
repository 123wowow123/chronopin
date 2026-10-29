import { PinFactoryBuildout } from '@/components/pin/PinFactoryBuildout';
import { hasFactoryBuildout, hasFactoryRubric } from '@/lib/pinFactory';
import Anchor from '@/components/ui/Anchor';
import type { Metadata } from 'next';
import Link from '@/components/ui/Link';
import { notFound } from 'next/navigation';
import { Fragment, Suspense } from 'react';
import { JsonLd } from '@/components/JsonLd';
import { Comments } from '@/components/pin/Comments';
import { PlaceLinks } from '@/components/pin/PlaceLinks';
import { CompanyTicker } from '@/components/pin/CompanyTicker';
import { CountdownMeter } from '@/components/pin/CountdownMeter';
import { CitedText } from '@/components/pin/CitedText';
import { DateConfidence, DateConfidenceReasoning } from '@/components/pin/DateConfidence';
import { DelayBadge, DelayReasoning } from '@/components/pin/DelayBadge';
import { DateRanges } from '@/components/pin/DateRanges';
import { FollowButton } from '@/components/pin/FollowButton';
import { MessageButton } from '@/components/messages/Messenger';
import { PinAdminLink } from '@/components/pin/PinAdminLink';
import { PinMenu } from '@/components/pin/PinMenu';
import { AddressShare } from '@/components/pin/PinShare';
import { PinConfidence } from '@/components/pin/PinConfidence';
import { PinPillRow } from '@/components/pin/PinPillRow';
import { PinDistance } from '@/components/pin/PinDistance';
import { PinDuplicates } from '@/components/pin/PinDuplicates';
import { PinEventInfo } from '@/components/pin/PinEventInfo';
import { PinGameInfo } from '@/components/pin/PinGameInfo';
import { PinCarPerf } from '@/components/pin/PinCarPerf';
import { PinGasCarPerf } from '@/components/pin/PinGasCarPerf';
import { PinGamePerf } from '@/components/pin/PinGamePerf';
import { PinAircraftPerf } from '@/components/pin/PinAircraftPerf';
import { PinVideoPerf } from '@/components/pin/PinVideoPerf';
import { PinLlmPerf } from '@/components/pin/PinLlmPerf';
import { PinPerf } from '@/components/pin/PinPerf';
import { PinFactory } from '@/components/pin/PinFactory';
import { PinForecastLinks } from '@/components/forecasts/PinForecastLinks';
import { IndustryForecastPanel } from '@/components/timeline/IndustryForecastPanel';
import { PinDining } from '@/components/pin/PinDining';
import { getAdjacentMusicRankings, getMusicRankingByTitleOrPin } from '@/lib/music';
import { MusicPinNav } from '@/components/music/MusicPinNav';
import { AlbumTracklist } from '@/components/music/AlbumTracklist';
import { MusicStats } from '@/components/music/MusicStats';
import { PinHotel } from '@/components/pin/PinHotel';
import { getResortPricePerNight } from '@/lib/travel';
import { PinModelChart } from '@/components/pin/PinModelChart';
import { PinTaste } from '@/components/pin/PinTaste';
import { PinOdds, ResolvedToggle } from '@/components/pin/PinOdds';
import { PinPlace } from '@/components/pin/PinPlace';
import { PinRestaurantMenu } from '@/components/pin/PinRestaurantMenu';
import { PinRestaurantDetails } from '@/components/pin/PinRestaurantDetails';
import { PinSeriesChart } from '@/components/pin/PinSeriesChart';
import { PinStocks } from '@/components/pin/PinStocks';
import { PinAwards } from '@/components/pin/PinAwards';
import { PinCandidates } from '@/components/pin/PinCandidates';
import { PinCompetitors } from '@/components/pin/PinCompetitors';
import { PinTags } from '@/components/pin/PinTags';
import { PinAlternateNames } from '@/components/pin/PinAlternateNames';
import { branchesUnder, threadNumbers } from '@/lib/thread';
import { PinUpdates } from '@/components/pin/PinUpdates';
import { PinRatings, RatingSummary } from '@/components/pin/PinRatings';
import { hasPlace } from '@/lib/places';
import { affiliateUrl, isAmazonStoreUrl } from '@/lib/affiliate';
import { shopLinks } from '@/lib/shopping';
import { restaurantOpenTableUrl } from '@/lib/restaurantDetails';
import { contentForSource } from '@/server/model/restaurantContent';
import { StoreLogo } from '@/components/pin/StoreLogo';
import { streamingService, watchOrder } from '@/lib/streaming';
import { isWordmark, StreamingLogo } from '@/components/pin/StreamingLogo';
import { AdColumn, AdFill, AdRow } from '@/components/ads/AdBlock';
import { AdsenseBanner, AdsenseColumn } from '@/components/ads/AdsensePanel';
import { adsenseAllowed } from '@/lib/adsense';
import { ageOn } from '@/lib/ads';
import { ShopButtons } from '@/components/pin/ShopButtons';
import { PinListings } from '@/components/listings/PinListings';
import { listingKindOf } from '@/lib/listings';
import { EpisodeCount } from '@/components/pin/EpisodeCount';
import { MarketVolume } from '@/components/pin/MarketVolume';
import { PinReferences } from '@/components/pin/PinReferences';
import { PinPhotos } from '@/components/pin/PinPhotos';
import { PinReviews } from '@/components/pin/PinReviews';
import { PinCriticReviews } from '@/components/pin/PinCriticReviews';
import { isReviewable } from '@/lib/userReviews';
import { restaurantMenuProfileFor } from '@/server/services/restaurantContent';
import { PinSuggest } from '@/components/pin/PinSuggest';
import { PinMapLoader, ThreadMapLoader } from '@/components/pin/PinMapLoader';
import { PinMediaFrame } from '@/components/pin/PinMedia';
import { PinWeather } from '@/components/pin/PinWeather';
import { RelatedPins } from '@/components/pin/RelatedPins';
import { RefineLink } from '@/components/pin/RefineLink';
import { ViewCount } from '@/components/pin/ViewCount';
import { ThreadAge } from '@/components/pin/ThreadAge';
import { ThreadList } from '@/components/pin/ThreadList';
import { ThreadSuggestion } from '@/components/pin/ThreadSuggestion';
import { ThreadWatchButton } from '@/components/pin/ThreadWatchButton';
import { LikeButton } from '@/components/pin/LikeButton';
import { WatchButton } from '@/components/pin/WatchButton';
import { Icon } from '@/components/ui/Icon';
import { PostedTime, StartTime } from '@/components/ui/LocalTime';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { pinDateRanges } from '@/lib/dateClaims';
import { dayKeyIn } from '@/lib/format';
import { bothMoney } from '@/lib/currency';
import { RESTAURANT_REGIONS } from '@/lib/restaurants';
import { pinMarketRefs } from '@/lib/predictionMarkets';
import { isPredictedPin, PREDICTED_TAG } from '@/lib/tags';
import { pinEvidence } from '@/lib/referenceConfidence';
import { safeCitedHtml, safeHtml } from '@/lib/sanitize';
import { entityJsonLd, isAttendableEvent, isTicketedVenue, pinJsonLd, pinMetadata, pinPath } from '@/lib/seo';
import { thinReasons, translationReady } from '@/lib/searchQuality';
import { pinTense } from '@/lib/timeline';
import type { PinEventInfoJson } from '@/lib/eventInfo';
import { formatMegawatts, type PinPowerJson } from '@/lib/power';
import { ENERGY_BASIS_WORDS, formatGigawattHours, type PinEnergyJson } from '@/lib/energy';
import { WATER_BASIS_WORDS, coolingSegments, powerSourceSegments, datacenterSearchPills, estimateHomesEquivalentFromMw, formatAcres, formatChips, formatSqft, formatWaterGallonsPerDay, type PinDatacenterJson } from '@/lib/datacenter';
import type { PinCandidateJson } from '@/lib/candidates';
import type { PinCompetitorJson } from '@/lib/competitors';
import type { PinJson } from '@/lib/types';
import { companyWebsite, duplicateGroupPins, pinById, pinCandidates, pinCompetitors, pinEventInfo, pinPower, pinEnergy, pinDatacenter, pinHasSiteShape, pinPerf, pinCarPerf, pinGasCarPerf, pinGamePerf, pinAircraftPerf, pinVideoPerf, pinLlmPerf, pinDining, pinFactory, pinIndustries, pinHotel, pinCriticReviews, pinGameInfo, pinTaste, pinComments, pinUpdates, threadPins, timelineVideo, adPlacements, adsenseSlots, hideThinPins, pinAlternateNames } from '@/server/services/pages';
import { soft } from '@/server/util/soft';
import { viewerTimeZone, viewerUser } from '@/server/viewer';
import { getLocale, getT } from '@/lib/i18n/server';
import { DEFAULT_LOCALE, pinTextDir } from '@/lib/i18n/config';
import { categoryLabel } from '@/lib/i18n/labels';
import type { Translator } from '@/lib/i18n/translate';
import { localesOffered } from '@/server/services/multilingual';

// src/proxy.ts sends the real 308s and 404s for pin URLs before this renders.
type Props = PageProps<'/[lang]/pin/[id]/[slug]'>;

// The pin in the page's language (its translation, when there is one).
async function loadPin(params: Props['params']) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? pinById(id, await getLocale()) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [pin, t, offered] = await Promise.all([loadPin(params), getT(), localesOffered()]);
  if (!pin) return { title: t('meta.pinNotFound'), robots: { index: false } };
  // Read after the pin (which waits on the URL), never while prerendering at
  // build time, when there is no database.
  if (!(await hideThinPins()).enabled) return pinMetadata(pin, t.locale, offered);
  // Judged on the English pin, so every language's copy agrees (src/lib/searchQuality.ts).
  const english = t.locale === DEFAULT_LOCALE ? pin : await pinById(pin.id, DEFAULT_LOCALE);
  if (!english) return pinMetadata(pin, t.locale, offered);
  if (thinReasons(english).length) return { ...pinMetadata(pin, t.locale, offered), robots: { index: false, follow: true } };
  // A pin under the translation bar offers no hreflang, and its translated pages are not indexed.
  if (!translationReady(english)) {
    const metadata = pinMetadata(pin, t.locale, []);
    return t.locale === DEFAULT_LOCALE ? metadata : { ...metadata, robots: { index: false, follow: true } };
  }
  return pinMetadata(pin, t.locale, offered);
}

export default function PinPage({ params, searchParams }: Props) {
  return (
    <main className="mx-auto max-w-7xl px-4 pt-6 pb-20 sm:px-6">
      <Suspense fallback={<div className="h-[70vh] animate-pulse rounded-xl bg-panel" aria-busy="true" />}>
        <PinContent params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function PinContent({ params, searchParams }: Pick<Props, 'params' | 'searchParams'>) {
  // The slug was already checked (and redirected) by src/proxy.ts.
  const [pin, t, query] = await Promise.all([
    loadPin(params),
    getT(),
    searchParams,
  ]);
  if (!pin) {
    notFound();
  }
  const autoplay = query?.autoplay === '1' || query?.play === '1';
  // The dishes and drinks on the pin's menus, for tagging them on readers' photos.
  const menuItemNames = pin.categories?.includes('Food')
    ? [...new Set(((await restaurantMenuProfileFor(pin.sourceUrl))?.menus ?? []).flatMap((menu) => menu.items.map((item) => item.name)))]
    : [];
  // What changed since it was posted: the pin shows the newest, and these say
  // how it got there. An event people can attend also carries its host's
  // website, performers and tickets, for the page and its Event markup.
  const event = isAttendableEvent(pin);
  // A museum or park sells admission, not a dated event: same ticket panel.
  const venue = !event && isTicketedVenue(pin);
  const [updates, timeZone, organizerUrl, eventInfo, power, energy, datacenter, hasSiteShape, perf, gameInfo, taste, carPerf, gasCarPerf, gamePerf, aircraftPerf, videoPerf, llmPerf, dining, factory, industries, hotel, criticReviews, candidates, competitors, ads, adsense, viewer, alternateNames] = await Promise.all([
    soft(pinUpdates(pin.id), [], 'pinUpdates'),
    viewerTimeZone(),
    (event || venue) && pin.companyId ? companyWebsite(pin.companyId) : null,
    // Any pin may carry a hand-entered reading (a Food pin for a wine expo), so
    // the panel does not wait on the category; the Event markup still does.
    soft(pinEventInfo(pin.id), null, 'pinEventInfo'),
    soft(pinPower(pin.id), null, 'pinPower'),
    soft(pinEnergy(pin.id), null, 'pinEnergy'),
    soft(pinDatacenter(pin.id), null, 'pinDatacenter'),
    soft(pinHasSiteShape(pin.id), false, 'pinHasSiteShape'),
    soft(pinPerf(pin.id), null, 'pinPerf'),
    pin.categories?.includes('Gaming') ? soft(pinGameInfo(pin.id), null, 'pinGameInfo') : null,
    soft(pinTaste(pin.id), null, 'pinTaste'),
    soft(pinCarPerf(pin.id), null, 'pinCarPerf'),
    soft(pinGasCarPerf(pin.id), null, 'pinGasCarPerf'),
    soft(pinGamePerf(pin.id), null, 'pinGamePerf'),
    soft(pinAircraftPerf(pin.id), null, 'pinAircraftPerf'),
    soft(pinVideoPerf(pin.id), null, 'pinVideoPerf'),
    soft(pinLlmPerf(pin.id), null, 'pinLlmPerf'),
    soft(pinDining(pin.id), null, 'pinDining'),
    soft(pinFactory(pin.id), null, 'pinFactory'),
    soft(pinIndustries(pin.id, [...(pin.categories ?? []), ...(pin.tags?.map((tag) => tag.name) ?? [])], pin.title), [], 'pinIndustries'),
    soft(pinHotel(pin.id), null, 'pinHotel'),
    soft(pinCriticReviews(pin.id), null, 'pinCriticReviews'),
    soft(pinCandidates(pin.id), [], 'pinCandidates'),
    soft(pinCompetitors(pin.id), [], 'pinCompetitors'),
    adPlacements(),
    adsenseSlots(),
    viewerUser(),
    soft(pinAlternateNames(pin.id), [], 'pinAlternateNames'),
  ]);
  // Google ads only for a viewer old enough, like the Amazon ones.
  const google = adsenseAllowed(ageOn(viewer?.birthday)) ? adsense : {};
  // The tags follow whatever the aside shows above them; first in the column they need no gap.
  // An AI model pin gets the cost/quality chart; the chart asks for its own data.
  const modelChart = !!pin.categories?.includes('AI') || !!pin.tags?.some((tag) => tag.name === 'AI Models');
  const tagsClass = (pin.latitude != null && pin.longitude != null) || gameInfo || taste || perf || carPerf || gasCarPerf || gamePerf || aircraftPerf || videoPerf || llmPerf || dining || hasFactoryBuildout(factory) || hasFactoryRubric(factory) || hotel || criticReviews || modelChart ? 'mt-4' : '';

  const isPredicted = isPredictedPin(pin);
  const altSet = new Set(alternateNames.map((a) => a.name.toLowerCase()));
  const filteredTags = altSet.size > 0 && pin.tags?.length
    ? pin.tags.filter((t) => !altSet.has(t.name.trim().toLowerCase()))
    : (pin.tags ?? []);
  const displayTags = isPredicted && !filteredTags.some((t) => t.name.toLowerCase() === PREDICTED_TAG.toLowerCase())
    ? [...filteredTags, { name: PREDICTED_TAG, kind: 'topic' as const, source: 'auto' as const }]
    : filteredTags;
  const displayPin = { ...pin, tags: displayTags };

  return (
    <>
      <JsonLd data={pinJsonLd(pin, t.locale, { organizerUrl, eventInfo })} />
      {entityJsonLd(pin, t.locale, { taste, carPerf, gasCarPerf, dining, hotel, aircraftPerf, llmPerf, videoPerf }) ? <JsonLd data={entityJsonLd(pin, t.locale, { taste, carPerf, gasCarPerf, dining, hotel, aircraftPerf, llmPerf, videoPerf })} /> : null}
      {/* grid-cols-[minmax(0,1fr)]: the single column below lg is otherwise
          floored by its content's min-width, which scrolls the page sideways. */}
      {/* On a phone the references and the correction box come last, under the
          final sponsored block. From lg they sit under the article, as the
          grid-row-start / row-span pins say; row 2 is 1fr so the tall aside
          stretches that row, not the gap between article and references. */}
      <div data-pin-grid className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:grid-rows-[auto_1fr] lg:gap-10">
        <article className="lg:col-start-1 lg:row-start-1">
          <PinBody pin={pin} timeZone={timeZone} t={t} eventInfo={eventInfo} power={power} energy={energy} datacenter={datacenter} venue={venue} candidates={candidates} competitors={competitors} isHotel={!!hotel} autoplay={autoplay} />
        </article>

        <aside data-pin-side className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          {pin.latitude != null && pin.longitude != null ? (
            <div>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                {pin.address ? (
                  <p className="flex min-w-0 items-center gap-1.5 text-muted">
                    <AddressShare pinId={pin.id} address={pin.address} />
                    <PlaceLinks address={pin.address} className="min-w-0" />
                  </p>
                ) : (
                  <span />
                )}
                <Link href={`/map?pin=${pin.id}`} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-raised px-2.5 py-0.5 text-xs font-medium text-muted ring-1 ring-line ring-inset transition-colors hover:bg-raised-2 hover:text-ink hover:no-underline active:ring-subtle/60">
                  <Icon name="map" className="size-3.5 text-link" />
                  {t('pin.toMap')}
                </Link>
              </div>
              <PinMapLoader latitude={pin.latitude} longitude={pin.longitude} title={pin.title} flightPath={pin.flightPath} siteShapePinId={hasSiteShape ? pin.id : undefined} />
              {pin.flightPath ? (
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  <span>
                    {t(pin.flightPath.estimated ? 'pin.flightPathEstimated' : 'pin.flightPath')}
                    {pin.flightPath.label ? ` · ${pin.flightPath.label}` : ''}
                  </span>
                  {pin.flightPath.sourceUrl ? (
                    <Anchor href={pin.flightPath.sourceUrl} target="_blank" rel="noopener noreferrer">
                      {t('pin.flightPathSimulation')}
                    </Anchor>
                  ) : null}
                </p>
              ) : null}
              <PinDistance pinId={pin.id} latitude={pin.latitude} longitude={pin.longitude} />
              <PinWeather pinId={pin.id} />
            </div>
          ) : null}

          {gameInfo ? <PinGameInfo info={gameInfo} t={t} className="mt-4" /> : null}
          <PinModelChart pinId={pin.id} has={modelChart} className="mt-4" />
          {taste ? <PinTaste taste={taste} t={t} locale={t.locale} evidence={pinEvidence(pin)} className="mt-4" /> : null}
          {perf ? <PinPerf perf={perf} t={t} locale={t.locale} className="mt-4" /> : null}
          {carPerf ? <PinCarPerf perf={carPerf} t={t} locale={t.locale} evidence={pinEvidence(pin)} className="mt-4" /> : null}
          {gasCarPerf ? <PinGasCarPerf perf={gasCarPerf} t={t} locale={t.locale} evidence={pinEvidence(pin)} className="mt-4" /> : null}
          {gamePerf ? <PinGamePerf perf={gamePerf} t={t} evidence={pinEvidence(pin)} className="mt-4" /> : null}
          {aircraftPerf ? <PinAircraftPerf perf={aircraftPerf} t={t} locale={t.locale} evidence={pinEvidence(pin)} className="mt-4" /> : null}
          {videoPerf ? <PinVideoPerf perf={videoPerf} t={t} locale={t.locale} evidence={pinEvidence(pin)} className="mt-4" /> : null}
          {llmPerf ? <PinLlmPerf perf={llmPerf} t={t} locale={t.locale} evidence={pinEvidence(pin)} className="mt-4" /> : null}
          {factory ? <PinFactoryBuildout factory={factory} t={t} className="mt-4" /> : null}
          {factory ? <PinFactory factory={factory} t={t} className="mt-4" /> : null}
          {industries.length ? <IndustryForecastPanel slugs={industries} limit={3} /> : null}
          {industries.length ? <PinForecastLinks slugs={industries} t={t} /> : null}
          {dining ? <PinDining dining={dining} t={t} locale={t.locale} evidence={pinEvidence(pin)} className="mt-4" /> : null}
          {hotel ? (
            <PinHotel
              hotel={hotel}
              t={t}
              locale={t.locale}
              evidence={pinEvidence(pin)}
              pricePerNight={getResortPricePerNight(pin.id, pin.priceLowerBound ?? pin.price, pin.priceCurrency, pin.priceUpperBound)}
              className="mt-4"
            />
          ) : null}
          {criticReviews ? <PinCriticReviews reviews={criticReviews} t={t} locale={t.locale} className="mt-4" /> : null}

          {/* Beside the pin on wide screens, under its map, game facts, taste
              profile and car performance rubric; after them on phones. */}
          <Suspense fallback={<PinTags tags={displayPin.tags} categories={pin.categories?.slice(1)} className={tagsClass} />}>
            <ThreadAwareTags pin={displayPin} className={tagsClass} />
          </Suspense>

          <PinAlternateNames names={alternateNames} className="mt-4" />

          {/* Related ads, one row under what the pin is about. */}
          {ads['pin-strip'] ? <AdRow slot="pin-strip" pinId={pin.id} className="mt-6" /> : null}

          {/* Right under what the pin is about: what has changed on it since. */}
          <PinUpdates updates={updates} timeZone={timeZone} className="mt-6" />

          <Suspense fallback={null}>
            <Duplicates pin={pin} />
          </Suspense>

          <Suspense fallback={null}>
            <Thread pin={pin} />
          </Suspense>

          {isReviewable(pin.categories) ? <PinReviews pinId={pin.id} /> : null}

          <PinPhotos pinId={pin.id} menuItems={menuItemNames} />

          <Suspense fallback={<Comments pinId={pin.id} initialComments={[]} />}>
            <PinCommentsSection pinId={pin.id} />
          </Suspense>

          {/* The tall space the side column leaves under the comments. */}
          {ads['pin-side'] ? google['pin-side'] ? <AdsenseColumn unit={google['pin-side']} className="mt-6" /> : <AdColumn pinId={pin.id} className="mt-6" /> : null}
        </aside>

        {/* Across the foot of the page: a Google banner, when the admin has given it a unit. */}
        {google['pin-bottom'] ? <AdsenseBanner unit={google['pin-bottom']} className="lg:col-span-2 lg:row-start-3" /> : null}

        {/* What backs the pin, then: a missing link, date or fact goes to the
            AI, which adds whatever page backs it up to the list above. The
            first child's own top margin and the grid gap would double up. */}
        <div data-pin-main-end className="min-w-0 lg:col-start-1 lg:row-start-2 lg:-mt-4 [&>:first-child]:mt-0">
          <PinReferences pinId={pin.id} authorId={pin.user?.id ?? pin.userId} evidence={pinEvidence(pin)} sourceReasoning={pin.dateConfidenceReasoning} dateRanges={pinDateRanges(pin, timeZone)} timeZone={timeZone} />
          <PinSuggest pinId={pin.id} />
          {/* Up to four rows of ads in the space the taller side column leaves under the left one. */}
          {ads['pin-strip'] ? <AdFill pinId={pin.id} className="mt-6" /> : null}
        </div>
      </div>

      <Suspense fallback={null}>
        <Related pin={pin} />
      </Suspense>
    </>
  );
}

async function PinBody({
  pin,
  timeZone,
  t,
  eventInfo,
  power,
  energy,
  datacenter,
  venue,
  candidates,
  competitors,
  isHotel,
  autoplay,
}: {
  pin: PinJson;
  timeZone: string;
  t: Translator;
  eventInfo?: PinEventInfoJson | null;
  power?: PinPowerJson | null;
  energy?: PinEnergyJson | null;
  datacenter?: PinDatacenterJson | null;
  venue?: boolean;
  candidates?: PinCandidateJson[];
  competitors?: PinCompetitorJson[];
  isHotel?: boolean;
  autoplay?: boolean;
}) {
  const hasCoordinates = pin.latitude != null && pin.longitude != null;
  // A datacenter figure searches for the pins at least that size (mw:>=100).
  const dcPills = datacenter ? datacenterSearchPills(datacenter, power, energy) : null;
  const dcLink = (key: keyof NonNullable<typeof dcPills>, children: React.ReactNode, tone = 'text-inherit') => {
    const pill = dcPills?.[key][0];
    return pill ? (
      <Link href={`/search?q=${encodeURIComponent(pill.q)}`} title={`Search ${pill.q}`} className={`${tone} underline-offset-2 hover:underline`}>
        {children}
      </Link>
    ) : (
      children
    );
  };
  const isRestaurant = pin.categories?.includes('Food') && pin.tags?.some((tag) => /^(Restaurant Opening|Restaurants?)$/i.test(tag.name));
  const restaurantRegion = isRestaurant
    ? RESTAURANT_REGIONS.find((region) => pin.tags?.some((tag) => tag.name === region.name))
    : undefined;
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
  const shop = isRestaurant ? [] : shopLinks(pin);
  const restaurantContent = isRestaurant ? await contentForSource(pin.sourceUrl) : null;
  const openTableUrl = isRestaurant ? restaurantOpenTableUrl(undefined, pin.place?.reservationUrl || restaurantContent?.profile.details?.reservationUrl) : null;
  const listingKind = isRestaurant ? null : listingKindOf(pin);
  // The map labels the place itself; the text is only for an address it cannot draw.
  const locationText = pin.address && !hasCoordinates ? pin.address : null;
  const musicEntry = getMusicRankingByTitleOrPin(pin.id, pin.title, pin.productName);
  const musicAdjacent = musicEntry ? getAdjacentMusicRankings(musicEntry.id) : undefined;
  let media = pin.media ?? [];
  if (musicEntry?.youtubeId && !media.some((m) => String(m.type) === '3')) {
    const videoUrl = musicEntry.youtubeUrl || `https://www.youtube.com/watch?v=${musicEntry.youtubeId}`;
    const videoMedium = {
      type: '3' as const,
      originalUrl: videoUrl,
      thumbName: musicEntry.artworkUrl,
      authorName: musicEntry.artist,
      authorUrl: musicEntry.sourceUrl,
      html: `<iframe width="480" height="270" src="https://www.youtube.com/embed/${musicEntry.youtubeId}?feature=oembed&enablejsapi=1${autoplay ? '&autoplay=1' : ''}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen title="${musicEntry.title} by ${musicEntry.artist}"></iframe>`,
    };
    media = [videoMedium, ...media];
  }

  // Company and place for a pin without a medium to label, the place as its
  // parts, each a search for the pins standing there. Over a picture it stays
  // plain text: that frame is a link to the pin, and a link cannot hold another.
  const placeRow =
    company || locationText ? (
      <div className="mb-2 flex flex-wrap gap-x-3 text-sm text-muted">
        {company}
        {locationText ? <PlaceLinks address={locationText} /> : null}
      </div>
    ) : null;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center text-xs text-subtle">
        {/* The main category alone (the pin's categories come main-first): the
            rest are chips in the tag section, where a pin's lesser subjects go. */}
        {pin.categories?.length ? (
          <>
            <RefineLink field="tag" value={pin.categories[0]} className="rounded-full bg-raised px-2.5 py-0.5 font-medium text-muted ring-1 ring-line ring-inset transition-colors hover:bg-raised-2 hover:text-ink hover:no-underline active:ring-subtle/60">
              {categoryLabel(t, pin.categories[0])}
            </RefineLink>
            <span className="px-1" />
          </>
        ) : null}
        {pin.utcCreatedDateTime ? (
          <span>
            {t.rich('pin.posted', { time: () => <PostedTime value={pin.utcCreatedDateTime!} serverTimeZone={timeZone} dateOnly="phone" search /> })}
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
        <div className="ms-auto flex flex-wrap items-center justify-end gap-2">
          {restaurantRegion ? <Link href={`/restaurants/${restaurantRegion.slug}`} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-curated/15 px-2.5 py-0.5 font-luxe text-xs font-semibold text-curated ring-1 ring-curated/40 ring-inset transition-colors hover:bg-curated/25 hover:no-underline active:ring-curated/70">
            <Icon name="pin" className="size-3.5 text-curated" />
            {t.dynamic('pin.curatedRestaurants', 'Curated restaurants')}
          </Link> : null}
          {musicEntry ? (
            <Link href={`/music#year=${musicEntry.year}&continent=${encodeURIComponent(musicEntry.originContinent ?? musicEntry.continent)}&track=${encodeURIComponent(musicEntry.id)}`} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-raised px-2.5 py-0.5 text-xs font-medium text-muted ring-1 ring-line ring-inset transition-colors hover:bg-raised-2 hover:text-ink hover:no-underline active:ring-subtle/60">
              <Icon name="music" className="size-3.5 text-link" />
              {t.dynamic('pin.musicRankings', 'Music Rankings')}
            </Link>
          ) : null}
          {/* Opens the timeline on this pin, centred, rather than on today. */}
          {/* The same pill as the aside's "To map". */}
          <Link href={`/?pin=${pin.id}`} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-raised px-2.5 py-0.5 text-xs font-medium text-muted ring-1 ring-line ring-inset transition-colors hover:bg-raised-2 hover:text-ink hover:no-underline active:ring-subtle/60">
            <Icon name="timeline" className="size-3.5 text-link" />
            {t('pin.toTimeline')}
          </Link>
          {/* Share, Not interested (or Show this pin again), Block. */}
          <PinMenu
            pin={{ id: pin.id, title: pin.title, originalTitle: pin.originalTitle, user: pin.user, companyId: pin.companyId, company: pin.company, companyLogoUrl: pin.companyLogoUrl }}
            onPage
          />
        </div>
      </div>

      {media.length ? (
        <PinMediaFrame
          key={pin.id}
          className="relative mb-4 overflow-hidden rounded-xl border border-line bg-black"
          overlay={
            <>
              {locationText ? <span className="media-chip absolute top-3 end-3 z-10">{locationText}</span> : null}
              {company ? <span className="media-chip absolute bottom-3 start-3 z-10">{company}</span> : null}
            </>
          }
          fallback={placeRow}
          media={media}
          title={pin.title}
          href={pin.sourceUrl}
          external
          selectable
          priority
          autoplay={autoplay}
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      ) : (
        placeRow
      )}

      {pin.utcStartDateTime ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
          <PinPillRow>
            <StartTime pin={pin} serverTimeZone={timeZone} allDaySuffix search />
            <DateConfidence level={pin.dateConfidence} />
            <DelayBadge pin={pin} search />
            <PinConfidence evidence={pinEvidence(pin)} />
          </PinPillRow>
          {/* Last: the reasoning takes a line of its own below the badges. */}
          <DateConfidenceReasoning reasoning={pin.dateConfidenceReasoning} dir={pinTextDir(pin)}>
            {pin.dateConfidenceReasoning ? <CitedText text={pin.dateConfidenceReasoning} evidence={pinEvidence(pin)} /> : undefined}
          </DateConfidenceReasoning>
          <DelayReasoning pin={pin} />
        </div>
      ) : null}
      {pin.utcStartDateTime ? <DateRanges {...dateRanges} evidence={pinEvidence(pin)} /> : null}

      {pin.utcStartDateTime ? <CountdownMeter start={pin.utcStartDateTime} since={pin.utcCreatedDateTime} allDay={pin.allDay} originalStart={pin.originalStartDate} /> : null}

      {/* Above the title: on a pin you can walk into, what the place scores
          and whether it is open now is the first thing worth knowing, and the
          headline is about an opening decades ago. */}
      {hasPlace(pin.place) ? <PinPlace pinId={pin.id} ratings={pin.ratings} /> : null}

      <h1 dir={pinTextDir(pin)} className="mt-3 mb-4 flex items-start gap-2 text-3xl leading-tight font-semibold tracking-tight text-pretty">
        {pin.sourceUrl ? (
          <>
            <Anchor href={pin.sourceUrl} target="_blank" rel="noopener" className="text-ink transition-colors hover:text-link hover:no-underline">
              {pin.title}
            </Anchor>
            <Anchor href={pin.sourceUrl} target="_blank" rel="noopener" aria-label={t('pin.openSource')} className="flex h-[1lh] shrink-0 items-center text-subtle hover:text-link">
              <Icon name="external" className="size-4" />
            </Anchor>
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

      {/* The scraped facts about the work, on one wrapping row. A pin with a
          place leaves its ratings out of this row: PinPlace shows them in one
          block with the place's live scores, so a MICHELIN star count does not
          sit in a chip of its own above them. */}
      <div className="-mt-1 mb-4 flex flex-wrap items-center gap-2 empty:hidden">
        {hasPlace(pin.place) ? null : <PinRatings ratings={pin.ratings} search className="" />}
        <EpisodeCount pin={pin} />
        <MarketVolume pin={pin} />
        {pinMarketRefs(pin).length ? <ResolvedToggle pinId={pin.id} /> : null}
      </div>
      <PinAwards awards={pin.awards} />
      {pinMarketRefs(pin).length ? <PinOdds pinId={pin.id} /> : null}
      {candidates?.length ? <PinCandidates candidates={candidates} t={t} /> : null}
      {competitors?.length ? <PinCompetitors competitors={competitors} t={t} /> : null}
      <PinStocks pinId={pin.id} />
      {/* The publisher's own chart for a series this event moves (PinSeries,
          0062). The pin's JSON says whether it has one, so a pin without a
          series never makes the request. */}
      <PinSeriesChart pinId={pin.id} has={!!pin.series?.length} />

      {musicEntry ? (
        <div data-music-panel className="surface mb-4 rounded-xl border border-line bg-raised/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl" role="img" aria-label={musicEntry.originCountry ?? musicEntry.country}>
                {musicEntry.originFlag ?? musicEntry.countryFlag}
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">
                  #{musicEntry.rank} on {musicEntry.chartName} ({musicEntry.year})
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                  {(() => {
                    const pill = 'inline-flex items-center rounded-full bg-raised px-2.5 py-0.5 text-xs font-medium text-ink ring-1 ring-line ring-inset transition-colors hover:bg-raised-2 hover:no-underline';
                    const q = (v: string) => `/search?q=${encodeURIComponent(v)}`;
                    const originName = musicEntry.originCountry ?? musicEntry.country;
                    return (
                      <>
                        <strong className="font-semibold text-ink">Origin</strong>
                        <Link href={q(originName)} className={pill} title={`Search ${originName}`}>{originName}</Link>
                        {musicEntry.originArea && musicEntry.originArea !== originName ? (
                          <Link href={q(musicEntry.originArea)} className={pill}>{musicEntry.originArea}</Link>
                        ) : null}
                        <strong className="ml-1 font-semibold text-ink">Genres</strong>
                        {musicEntry.genres.map((g) => (
                          <Link key={g} href={q(g)} className={pill} title={`Search ${g}`}>{g}</Link>
                        ))}
                        {musicEntry.album ? (
                          <>
                            <strong className="ml-1 font-semibold text-ink">{musicEntry.album.kind === 'single' ? 'Single' : musicEntry.album.kind === 'ep' ? 'EP' : 'Album'}</strong>
                            <Link href={q(musicEntry.album.title)} className={pill} title={`Search ${musicEntry.album.title}`}>{musicEntry.album.title}</Link>
                          </>
                        ) : null}
                      </>
                    );
                  })()}
                </div>
                <p className="mt-1.5 text-xs text-muted">
                  {musicEntry.chartAuthority}{musicEntry.streamsOrUnits ? ` · ${musicEntry.streamsOrUnits}` : ''}
                </p>
              </div>
            </div>
            <MusicPinNav entry={musicEntry} adjacent={musicAdjacent} variant="card" autoplay={autoplay} />
          </div>
          <MusicStats entry={musicEntry} />
          {musicEntry.album ? (
            <div className="mt-3">
              <AlbumTracklist song={musicEntry} open scroll={false} />
            </div>
          ) : null}
        </div>
      ) : null}

      {pin.description ? <div dir={pinTextDir(pin)} className="rich-text mb-3 text-base leading-relaxed font-medium text-ink" dangerouslySetInnerHTML={{ __html: safeHtml(pin.description) }} /> : null}
      {pin.longFormSummary ? <div dir={pinTextDir(pin)} className="rich-text text-[15px] leading-relaxed text-ink/90" dangerouslySetInnerHTML={{ __html: safeCitedHtml(pin.longFormSummary, pinEvidence(pin)) }} /> : null}

      <PinRestaurantMenu sourceUrl={pin.sourceUrl} today={dayKeyIn(new Date(), 'America/Los_Angeles')} />
      <PinRestaurantDetails sourceUrl={pin.sourceUrl} name={pin.company || pin.title} isRestaurant={isRestaurant} priceRange={pin.restaurantPriceRange} />

      {pin.user?.id && pin.user.userName ? (
        <div className="surface mt-6 flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <RefineLink field="user" value={pin.user.userName} className="flex items-center gap-2 font-semibold text-ink hover:no-underline">
            <UserAvatar userName={pin.user.userName} pictureUrl={pin.user.pictureUrl} className="size-9 text-sm" />
            {pin.user.userName}
          </RefineLink>
          <FollowButton
            userId={pin.user.id}
            userName={pin.user.userName}
            showCount
            beside={<MessageButton user={{ id: pin.user.id, userName: pin.user.userName, pictureUrl: pin.user.pictureUrl }} />}
          />
        </div>
      ) : null}

      <div className="flex items-center justify-between py-3">
        <div className={pin.price != null && pin.price < 0 ? 'text-danger' : ''}>
          {pin.price ? (
            <>
              <span className="text-subtle">
                {pin.productName ? t('pin.msrp') : (isHotel && pin.price > 10000 ? 'Project cost' : t('pin.cost'))}
              </span>{' '}
              <span className="font-semibold text-success tabular-nums">{bothMoney(pin.price, pin.priceCurrency, t.locale).stated}</span>
              {bothMoney(pin.price, pin.priceCurrency, t.locale).local ? <span className="text-sm text-muted tabular-nums"> ({bothMoney(pin.price, pin.priceCurrency, t.locale).local})</span> : null}
            </>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <ViewCount pinId={pin.id} initial={pin.viewCount} track />
          <LikeButton pin={pin} loadForViewer />
          <WatchButton pin={pin} loadForViewer />
          <PinAdminLink pinId={pin.id} />
        </div>
      </div>

      {datacenter ? (
        <section data-datacenter-panel aria-label="Datacenter and infrastructure specifications" className="surface mt-3 rounded-2xl border border-line bg-raised/40 p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-6 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30 ring-inset">
                <Icon name="bolt" className="size-3.5" />
              </span>
              <h2 className="text-xs font-semibold tracking-wider text-subtle uppercase">
                Datacenter &amp; Infrastructure Telemetry
              </h2>
            </div>
            {(datacenter.sourceUrl || power?.sourceUrl || energy?.sourceUrl) ? (
              <a
                href={(datacenter.sourceUrl || power?.sourceUrl || energy?.sourceUrl)!}
                rel="noopener nofollow"
                target="_blank"
                className="inline-flex items-center gap-1 rounded-full bg-raised px-2.5 py-0.5 text-xs font-medium text-link ring-1 ring-line ring-inset transition-colors hover:bg-raised-2 hover:no-underline"
              >
                Tracker source
                <Icon name="external" className="size-3 opacity-70" />
              </a>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {power ? (
              <div className="flex flex-col rounded-xl border border-line/70 bg-panel/70 p-3">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-subtle uppercase">
                  <span className="size-2 rounded-full bg-amber-400" aria-hidden />
                  {power.kind === 'generation' ? 'Power generation' : power.kind === 'storage' ? 'Power storage' : 'Power usage'}
                </div>
                <div className="mt-1.5 text-lg leading-tight font-bold tracking-tight text-past tabular-nums">
                  {dcLink('power', formatMegawatts(power.megawatts))}
                </div>
                <div className="mt-1 text-xs text-muted tabular-nums">
                  {power.kind === 'usage'
                    ? `~${estimateHomesEquivalentFromMw(power.megawatts).toLocaleString('en-US')} US homes`
                    : power.note ?? 'Grid capacity'}
                </div>
              </div>
            ) : null}

            {datacenter.waterGallonsPerDay != null ? (
              <div className="flex flex-col rounded-xl border border-line/70 bg-panel/70 p-3">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-subtle uppercase">
                  <span className="size-2 rounded-full bg-sky-400" aria-hidden />
                  Water usage
                </div>
                <div className="mt-1.5 text-lg leading-tight font-bold tracking-tight text-link tabular-nums">
                  {dcLink('water', formatWaterGallonsPerDay(datacenter.waterGallonsPerDay))}
                </div>
                <div className="mt-1 text-xs text-muted">
                  {datacenter.waterBasis ? WATER_BASIS_WORDS[datacenter.waterBasis] : 'daily cooling draw'}
                </div>
              </div>
            ) : null}

            {(datacenter.chips != null || datacenter.h100Equivalents != null) ? (
              <div className="flex flex-col rounded-xl border border-line/70 bg-panel/70 p-3">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-subtle uppercase">
                  <span className="size-2 rounded-full bg-violet-400" aria-hidden />
                  AI chips
                </div>
                <div className="mt-1.5 text-lg leading-tight font-bold tracking-tight text-future tabular-nums">
                  {dcLink(
                    'chips',
                    datacenter.chips != null
                      ? formatChips(datacenter.chips)
                      : `${formatChips(Math.round(datacenter.h100Equivalents!))} H100-eq`,
                  )}
                </div>
                <div className="mt-1 line-clamp-2 text-xs text-muted" title={datacenter.chipModel ?? undefined}>
                  {datacenter.chipModel ?? 'AI accelerators'}
                  {datacenter.chips != null && datacenter.h100Equivalents != null
                    ? ` · ${formatChips(Math.round(datacenter.h100Equivalents))} H100-eq`
                    : ''}
                </div>
              </div>
            ) : null}

            {energy ? (
              <div className="flex flex-col rounded-xl border border-line/70 bg-panel/70 p-3">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-subtle uppercase">
                  <span className="size-2 rounded-full bg-emerald-400" aria-hidden />
                  Energy used
                </div>
                <div className="mt-1.5 text-lg leading-tight font-bold tracking-tight text-success tabular-nums">
                  {dcLink('energy', formatGigawattHours(energy.gwh))}
                </div>
                <div className="mt-1 text-xs text-muted">
                  {ENERGY_BASIS_WORDS[energy.basis]}
                </div>
              </div>
            ) : null}
          </div>

          {(datacenter.acres != null ||
            datacenter.sqft != null ||
            datacenter.buildings != null ||
            datacenter.generators != null ||
            datacenter.cooling ||
            datacenter.powerSource ||
            datacenter.note) ? (
            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 border-t border-line/70 pt-3 text-xs sm:grid-cols-2">
              {(datacenter.acres != null || datacenter.sqft != null || datacenter.buildings != null) ? (
                <div className="flex flex-col gap-0.5">
                  <dt className="font-semibold tracking-wider text-subtle uppercase">Footprint &amp; Facility</dt>
                  <dd className="font-medium text-ink tabular-nums">
                    {[
                      datacenter.acres != null ? dcLink('acres', formatAcres(datacenter.acres), 'text-link') : null,
                      datacenter.sqft != null ? dcLink('sqft', formatSqft(datacenter.sqft), 'text-link') : null,
                      datacenter.buildings != null
                        ? `${datacenter.buildings.toLocaleString('en-US')} ${datacenter.buildings === 1 ? 'building' : 'buildings'}`
                        : null,
                    ]
                      .filter(Boolean)
                      .map((part, i) => (
                        <Fragment key={i}>
                          {i ? ' · ' : null}
                          {part}
                        </Fragment>
                      ))}
                  </dd>
                </div>
              ) : null}

              {datacenter.generators != null ? (
                <div className="flex flex-col gap-0.5">
                  <dt className="font-semibold tracking-wider text-subtle uppercase">Backup Generation</dt>
                  <dd className="font-medium text-ink tabular-nums">
                    {dcLink('generators', datacenter.generators.toLocaleString('en-US'), 'text-link')} permitted backup {datacenter.generators === 1 ? 'generator' : 'generators'}
                  </dd>
                </div>
              ) : null}

              {datacenter.cooling ? (
                <div className="flex flex-col gap-0.5">
                  <dt className="font-semibold tracking-wider text-subtle uppercase">Cooling Architecture</dt>
                  <dd className="font-medium text-ink">
                    {coolingSegments(datacenter.cooling).map((seg, i) =>
                      seg.q ? (
                        <Link key={i} href={`/search?q=${encodeURIComponent(seg.q)}`} title={`Search ${seg.q}`} className="text-link underline-offset-2 hover:underline">
                          {seg.text}
                        </Link>
                      ) : (
                        <Fragment key={i}>{seg.text}</Fragment>
                      ),
                    )}
                  </dd>
                </div>
              ) : null}

              {datacenter.powerSource ? (
                <div className="flex flex-col gap-0.5">
                  <dt className="font-semibold tracking-wider text-subtle uppercase">Power Source &amp; Grid</dt>
                  <dd className="font-medium text-ink">
                    {powerSourceSegments(datacenter.powerSource).map((seg, i) =>
                      seg.q ? (
                        <Link key={i} href={`/search?q=${encodeURIComponent(seg.q)}`} title={`Search ${seg.q}`} className="text-link underline-offset-2 hover:underline">
                          {seg.text}
                        </Link>
                      ) : (
                        <Fragment key={i}>{seg.text}</Fragment>
                      ),
                    )}
                  </dd>
                </div>
              ) : null}

              {datacenter.note ? (
                <div className="flex flex-col gap-0.5 sm:col-span-2">
                  <dt className="font-semibold tracking-wider text-subtle uppercase">Tracker Notes</dt>
                  <dd className="text-muted">{datacenter.note}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </section>
      ) : (
        <>
          {power ? (
            <p className="mt-2 text-sm text-ink">
              <span className="me-1 text-xs font-semibold tracking-wider text-subtle uppercase">{power.kind === 'generation' ? 'Power generation' : power.kind === 'storage' ? 'Power storage' : 'Power usage'}</span>
              <span className="font-medium tabular-nums">{formatMegawatts(power.megawatts)}</span>
              {power.note ? <span className="text-muted"> · {power.note}</span> : null}
              {power.sourceUrl ? <> · <a href={power.sourceUrl} rel="noopener nofollow" target="_blank" className="text-link">source</a></> : null}
            </p>
          ) : null}
          {energy ? (
            <p className="mt-1 text-sm text-ink">
              <span className="me-1 text-xs font-semibold tracking-wider text-subtle uppercase">Energy used</span>
              <span className="font-medium tabular-nums">{formatGigawattHours(energy.gwh)}</span>
              <span className="text-muted"> {ENERGY_BASIS_WORDS[energy.basis]}</span>
              {energy.note ? <span className="text-muted"> · {energy.note}</span> : null}
              {energy.sourceUrl ? <> · <a href={energy.sourceUrl} rel="noopener nofollow" target="_blank" className="text-link">source</a></> : null}
            </p>
          ) : null}
        </>
      )}
      {eventInfo ? <PinEventInfo info={eventInfo} started={!venue && pinTense(pin, new Date(), dayKeyIn(new Date(), timeZone)) === 'past'} t={t} /> : null}

      {/* Where to watch a film, series or anime: a merchant whose link is a
          streaming service (src/lib/streaming.ts), in the service's colours. */}
      {pin.merchants?.some((m) => streamingService(m.url)) ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="me-1 text-xs font-semibold tracking-wider text-subtle uppercase">{t('pin.watchOnHeading')}</span>
          {watchOrder(pin.merchants).map((merchant, index) => {
            const service = streamingService(merchant.url);
            return service ? (
              <Anchor
                key={merchant.id ?? index}
                href={affiliateUrl(merchant.url!)}
                target="_blank"
                rel={isAmazonStoreUrl(merchant.url) ? 'noopener nofollow sponsored' : 'noopener nofollow'}
                aria-label={t('pin.watchOn', { service: service.label })}
                title={t('pin.watchOn', { service: service.label })}
                className="btn h-8 gap-1.5 border border-white/15 px-3 py-0 hover:opacity-90"
                style={{ backgroundColor: service.background, color: service.text }}
              >
                {isWordmark(service.label) ? (
                  <StreamingLogo label={service.label} />
                ) : (
                  <>
                    <StreamingLogo label={service.label} className="size-4 shrink-0" />
                    {service.label}
                  </>
                )}
              </Anchor>
            ) : null;
          })}
        </div>
      ) : null}

      {/* Where to buy the product the pin is about (src/lib/shopping.ts). */}
      {openTableUrl ? <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="me-1 text-xs font-semibold tracking-wider text-subtle uppercase">{t.dynamic('pin.reserveHeading', 'Reserve')}</span>
        <Anchor href={openTableUrl} target="_blank" rel="noopener noreferrer" aria-label={t.dynamic('pin.reserveOnOpenTable', 'Reserve on OpenTable')} className="btn h-8 gap-1.5 border border-white/15 px-3 py-0 shadow-sm transition hover:-translate-y-px hover:brightness-110 hover:shadow-md" style={{ backgroundColor: '#DA3743', color: '#FFFFFF' }}>
          <StoreLogo store="OpenTable" className="h-4 w-[22px] shrink-0" /> OpenTable <Icon name="external" className="size-3 shrink-0 opacity-60" />
        </Anchor>
      </div> : null}
      {shop.length ? <ShopButtons pinId={pin.id} links={shop} productName={pin.productName} /> : null}
      {/* Readers' own listings of the product, and "Sell this item here". */}
      {listingKind ? <PinListings pinId={pin.id} kind={listingKind} productName={pin.productName} categories={pin.categories} /> : null}

    </>
  );
}

// The pin's tags, the thread tag's icon forked when the thread branches under
// the pin. Only a pin in a thread reads the thread, and that read is cached.
async function ThreadAwareTags({ pin, className }: { pin: PinJson; className?: string }) {
  const inThread = !!pin.parentId || !!pin.rootThread;
  const branching = inThread ? branchesUnder(await threadPins(pin.id, (await getT()).locale), pin.id) : false;
  const isPredicted = isPredictedPin(pin);
  const baseTags = (pin.tags ?? []).map((t) =>
    t.name.toLowerCase() === PREDICTED_TAG.toLowerCase() ? { ...t, kind: 'reserved' as const } : t,
  );
  const tags =
    isPredicted && !baseTags.some((t) => t.name.toLowerCase() === PREDICTED_TAG.toLowerCase())
      ? [{ name: PREDICTED_TAG, kind: 'reserved' as const, source: 'auto' as const }, ...baseTags]
      : baseTags;
  return <PinTags tags={tags} categories={pin.categories?.slice(1)} branching={branching} className={className} />;
}

// The thread pane's nesting: pixels a branch steps in, and how many steps show.
const THREAD_INDENT = 16;
const MAX_THREAD_INDENT = 4;

async function Thread({ pin }: { pin: PinJson }) {
  const t = await getT();
  const pins = await threadPins(pin.id, t.locale);
  const numbers = threadNumbers(pins);
  const stops = pins.flatMap((p) =>
    p.latitude != null && p.longitude != null
      ? [{ id: p.id, n: numbers.get(p.id) ?? 0, title: p.title, href: pinPath(p), latitude: p.latitude, longitude: p.longitude }]
      : [],
  );
  return (
    <section aria-labelledby="thread-heading" className="surface mt-6 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 id="thread-heading" className="text-base font-semibold">
            {t('pin.thread')}
          </h2>
          <ThreadWatchButton pinId={pin.id} />
        </div>
        <Link href={`/respond/${pin.id}`} className="text-sm" prefetch={false}>
          {t('pin.respond')}
        </Link>
      </div>
      <ThreadSuggestion pinId={pin.id} />
      {new Set(stops.map((s) => `${s.latitude.toFixed(4)},${s.longitude.toFixed(4)}`)).size > 1 ? <ThreadMapLoader stops={stops} currentId={pin.id} backHref={pinPath(pin)} /> : null}
      <ThreadList
        key={pin.id}
        current={Math.max(0, pins.findIndex((p) => p.id === pin.id))}
        items={pins.map((p) => {
          // A branch steps in under the pin it answers (threadLevel, capped so a
          // deep tree still fits the pane); an unbranched chain stays flush left.
          const level = Math.min(p.threadLevel ?? 0, MAX_THREAD_INDENT);
          return (
            <div key={p.id} className="relative" style={level ? { paddingInlineStart: level * THREAD_INDENT } : undefined}>
              {Array.from({ length: level }, (_, i) => (
                <span key={i} aria-hidden className="absolute -inset-y-0.5 w-px bg-line" style={{ insetInlineStart: i * THREAD_INDENT + THREAD_INDENT / 2 }} />
              ))}
              <Link
                href={pinPath(p)}
                aria-current={p.id === pin.id ? 'page' : undefined}
                className={`flex gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink hover:no-underline ${p.id === pin.id ? 'bg-raised ring-1 ring-line ring-inset' : 'hover:bg-raised/60'}`}
              >
                <span className="w-4 shrink-0 text-end text-subtle tabular-nums">{numbers.get(p.id)}</span>
                <span className="min-w-0">
                  <span dir={pinTextDir(p)}>{p.title}</span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-x-3 text-xs font-normal">
                    <CompanyTicker pin={p} bare />
                    {/* A season's own score and run length, the way a card shows them. */}
                    <RatingSummary ratings={p.ratings} />
                    <EpisodeCount pin={p} chip />
                    <ThreadAge start={p.utcStartDateTime} allDay={p.allDay} />
                  </span>
                </span>
              </Link>
            </div>
          );
        })}
      />
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

// "More like this" loads in the browser once scrolled to (RelatedPins), so the
// page never waits on it.
async function Related({ pin }: { pin: PinJson }) {
  const t = await getT();
  const [timeZone, video] = await Promise.all([viewerTimeZone(), timelineVideo()]);
  return (
    <RelatedPins
      pinId={pin.id}
      locale={t.locale}
      heading={t('pin.moreLikeThis')}
      loadingLabel={t('common.loading')}
      serverTimeZone={timeZone}
      todayKey={dayKeyIn(new Date(), timeZone)}
      video={video}
    />
  );
}
