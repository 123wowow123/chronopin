'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { JsonLd } from '@/components/JsonLd';
import Link from '@/components/ui/Link';
import { LandingMark } from '@/components/ui/LandingMark';
import { AdFilledGrid } from '@/components/restaurants/AdFilledGrid';
import { RestaurantCardAdsProvider } from '@/components/restaurants/RestaurantAdCard';
import { absoluteUrl, pinPath } from '@/lib/seo';
import type { PinJson } from '@/lib/types';
import { CardImage } from '@/components/pin/CardImage';
import {
  TRAVEL_SEASONS,
  formatMonthRange,
  getResortPricePerNight,
  sortTravelResorts,
  type TravelResortPin,
  type TravelShelf,
  type TravelSort,
} from '@/lib/travel';
import { Icon, type IconName } from '@/components/ui/Icon';
import { viewerPlace, type ViewerPlace } from '@/lib/client/viewerPlace';
import { ResortCard } from './ResortCard';
import styles from '@/components/restaurants/RestaurantGuide.module.css';

function picture(media: PinJson['media']) {
  // Prioritize high-resolution photo (type 1) with thumbName over video stills (type 3)
  const medium =
    media?.find((m) => String(m.type) === '1' && m.thumbName) ??
    media?.find((m) => m.thumbName) ??
    media?.[0];
  return {
    thumbName: medium?.thumbName,
    originalUrl: medium?.originalUrl ?? undefined,
    portrait: !!(medium?.thumbWidth && medium.thumbHeight && medium.thumbHeight > medium.thumbWidth * 1.2),
  };
}

export const ACTIVITY_FILTERS: { id: string; label: string; icon: IconName }[] = [
  { id: 'all', label: 'All activities', icon: 'compass' },
  { id: 'Kids', label: 'Kids & Family', icon: 'smile' },
  { id: 'Culture', label: 'Culture & Heritage', icon: 'building' },
  { id: 'Wellness', label: 'Thermal & Wellness', icon: 'sparkle' },
  { id: 'Water', label: 'Coral & Ocean', icon: 'globe' },
  { id: 'Snow', label: 'Arctic & Snow', icon: 'snow' },
  { id: 'Adventure', label: 'Expeditions', icon: 'map' },
  { id: 'Dining', label: 'Gastronomy', icon: 'coffee' },
  { id: 'Nature', label: 'Wildlife & Nature', icon: 'sun' },
];

export type { TravelSort };

export function TravelView({
  shelves,
  title,
  description,
  path = '/travel',
  adPlacementsMap,
}: {
  shelves: TravelShelf[];
  title: string;
  description: string;
  path?: string;
  adPlacementsMap?: Record<string, boolean>;
}) {
  const [activeShelfId, setActiveShelfId] = useState<string>('all');
  const [selectedSeason, setSelectedSeason] = useState<string>('all');
  const [selectedActivity, setSelectedActivity] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<TravelSort>('rating-desc');
  const [viewerOrigin, setViewerOrigin] = useState<ViewerPlace | undefined>();
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const locationRequestId = useRef(0);
  const shelfNavRef = useRef<HTMLElement>(null);

  // Allow horizontal scrolling via mouse wheel when shelf tabs overflow
  useEffect(() => {
    const nav = shelfNavRef.current;
    if (!nav) return;
    const onWheel = (event: WheelEvent) => {
      if (nav.scrollWidth <= nav.clientWidth || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      event.preventDefault();
      nav.scrollLeft += event.deltaY;
    };
    nav.addEventListener('wheel', onWheel, { passive: false });
    return () => nav.removeEventListener('wheel', onWheel);
  }, []);

  // Reveal selected shelf tab if it's partially or fully outside the visible area
  useEffect(() => {
    const revealSelected = () => {
      const nav = shelfNavRef.current;
      const selected = nav?.querySelector<HTMLElement>('[aria-current="location"]');
      if (nav && selected) {
        const left = selected.offsetLeft;
        const right = left + selected.offsetWidth;
        if (left < nav.scrollLeft || right > nav.scrollLeft + nav.clientWidth) {
          nav.scrollTo({
            left: Math.max(0, left - (nav.clientWidth - selected.offsetWidth) / 2),
            behavior: 'smooth',
          });
        }
      }
    };
    revealSelected();
    window.addEventListener('resize', revealSelected);
    return () => window.removeEventListener('resize', revealSelected);
  }, [activeShelfId]);

  useEffect(() => {
    const pending = locationRequestId;
    const id = pending.current;
    void viewerPlace()
      .then((place) => {
        if (place && id === pending.current) setViewerOrigin(place);
      })
      .catch(() => {});
    return () => {
      pending.current++;
    };
  }, []);

  const handleSortCategory = (category: 'rating' | 'price' | 'distance') => {
    setLocationError('');
    if (category === 'rating') {
      setSortOrder((prev) => (prev === 'rating-desc' || prev === 'score' ? 'rating-asc' : 'rating-desc'));
    } else if (category === 'price') {
      setSortOrder((prev) => (prev === 'price-asc' ? 'price-desc' : 'price-asc'));
    } else if (category === 'distance') {
      if (sortOrder === 'distance-asc') {
        setSortOrder('distance-desc');
        return;
      }
      if (sortOrder === 'distance-desc') {
        setSortOrder('distance-asc');
        return;
      }
      // First click on distance
      if (viewerOrigin?.source === 'device' || (viewerOrigin && viewerOrigin.latitude && viewerOrigin.longitude)) {
        setSortOrder('distance-asc');
        return;
      }
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        setLocationError('Location is unavailable in your browser.');
        setSortOrder('distance-asc');
        return;
      }
      const id = ++locationRequestId.current;
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          if (id !== locationRequestId.current) return;
          setViewerOrigin({ latitude: coords.latitude, longitude: coords.longitude, source: 'device' });
          setSortOrder('distance-asc');
          setLocating(false);
        },
        (error) => {
          if (id !== locationRequestId.current) return;
          setLocating(false);
          setLocationError(
            error.code === 1
              ? 'Allow location access in your browser to sort by distance.'
              : 'Could not find your location. Try distance again.',
          );
          setSortOrder('distance-asc');
        },
        { maximumAge: 5 * 60 * 1000, timeout: 10000 },
      );
    }
  };

  // All unique resorts across shelves
  const allResorts = useMemo(() => {
    const map = new Map<number, TravelResortPin>();
    for (const shelf of shelves) {
      for (const pin of shelf.pins) {
        if (!map.has(pin.id)) {
          map.set(pin.id, pin);
        }
      }
    }
    return Array.from(map.values());
  }, [shelves]);

  // Featured resort (e.g. Capella Kyoto or highest score property with photo)
  const featured = useMemo(() => {
    return (
      allResorts.find((r) => r.id === 15302 && (picture(r.media).thumbName || picture(r.media).originalUrl)) ??
      allResorts[0]
    );
  }, [allResorts]);

  const featuredPic = useMemo(() => (featured ? picture(featured.media) : null), [featured]);

  const featuredPrice = useMemo(
    () =>
      featured
        ? (featured.pricePerNight ??
            getResortPricePerNight(
              featured.id,
              featured.priceLowerBound ?? featured.price,
              featured.priceCurrency,
              featured.priceUpperBound,
            ))
        : null,
    [featured],
  );

  const activeSeason = useMemo(() => {
    return TRAVEL_SEASONS.find((s) => s.id === selectedSeason) ?? TRAVEL_SEASONS[0];
  }, [selectedSeason]);

  // Filtered and sorted resorts based on active shelf, season, and sort order
  const displayedResorts = useMemo(() => {
    let list: TravelResortPin[];
    if (activeShelfId === 'all') {
      list = allResorts;
    } else {
      const shelf = shelves.find((s) => s.id === activeShelfId);
      list = shelf ? shelf.pins : allResorts;
    }

    if (selectedActivity !== 'all') {
      list = list.filter((r) =>
        r.topActivities?.some(
          (act) =>
            act.category.toLowerCase() === selectedActivity.toLowerCase() ||
            (selectedActivity.toLowerCase() === 'kids' && (act.kidsFriendly || act.category === 'Kids')),
        ),
      );
    }

    const seasonMonths = selectedSeason !== 'all' ? (activeSeason.months as readonly number[]) : null;
    return sortTravelResorts(list, sortOrder, seasonMonths, viewerOrigin);
  }, [activeShelfId, allResorts, shelves, selectedActivity, selectedSeason, activeSeason, sortOrder, viewerOrigin]);

  // Count of properties in prime season for current season
  const primeCount = useMemo(() => {
    if (selectedSeason === 'all') return null;
    const seasonMonths = activeSeason.months as readonly number[];
    return displayedResorts.filter((r) =>
      r.bestTimeToGo.recommendedMonths.some((m) => seasonMonths.includes(m)),
    ).length;
  }, [displayedResorts, selectedSeason, activeSeason]);

  // JSON-LD structured schema
  const collection = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url: absoluteUrl(path),
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: allResorts.length,
      itemListElement: allResorts.map((resort, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: absoluteUrl(pinPath(resort)),
        name: resort.productName ?? resort.title,
        description: resort.bestTimeToGo.bestSeason,
      })),
    },
  };

  const currentShelf = shelves.find((s) => s.id === activeShelfId);
  const isRating = sortOrder === 'rating-desc' || sortOrder === 'rating-asc' || sortOrder === 'score';
  const isPrice = sortOrder === 'price-asc' || sortOrder === 'price-desc';
  const isDistance = sortOrder === 'distance-asc' || sortOrder === 'distance-desc';

  return (
    <RestaurantCardAdsProvider value={!!adPlacementsMap?.['card-grid']}>
      <main className={styles.guide} data-landing>
        <LandingMark />
        <JsonLd data={collection} />

        <div className={styles.container}>
          {/* Top Wordmark Navigation */}
          <div className={styles.guideNav}>
            <Link href={path} className={styles.wordmark}>
              <span aria-hidden="true">✳</span> The travel guide
            </Link>
            <div className="flex items-center gap-3 text-xs text-[var(--soft,#627069)]">
              <span>Curated Resorts & Best Time to Go</span>
            </div>
          </div>

          {/* Hero Section */}
          <header className={styles.hero}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>WHERE TO STAY. WHEN TO GO.</p>
              <h1>
                The resorts worth <em>the journey.</em> And when to go.
              </h1>
              <p className={styles.lead}>{description}</p>
            </div>

            {featured && (featuredPic?.thumbName || featuredPic?.originalUrl) ? (
              <Link href={pinPath(featured)} className={styles.featured} aria-label={`Explore ${featured.productName ?? featured.title}`}>
                <CardImage
                  thumbName={featuredPic?.thumbName}
                  originalUrl={featuredPic?.originalUrl}
                  alt={featured.productName ?? featured.title}
                  priority
                  className={styles.featuredImage}
                />
                <div className={styles.featuredShade} />
                <span className={styles.featuredBadge}>CHRONOPIN SELECTION</span>
                <div className={styles.featuredCopy}>
                  <p>
                    {featured.destination}{featuredPrice ? ` · ${featuredPrice.isRange ? '' : 'From '}${featuredPrice.formatted} / night` : ''} · Score: {featured.rubricScore.toFixed(1)}/5
                  </p>
                  <h2>{featured.productName ?? featured.title}</h2>
                  {featured.hotel.reviews?.[0]?.quote && (
                    <p className="mt-1 mb-2 line-clamp-2 text-xs italic text-[#f6f3eb]/90 font-serif">
                      &ldquo;{featured.hotel.reviews[0].quote}&rdquo;
                    </p>
                  )}
                  <span className="flex items-center justify-between">
                    <span>
                      Best time: {formatMonthRange(featured.bestTimeToGo.recommendedMonths)}
                    </span>
                    <span aria-hidden="true">↗</span>
                  </span>
                </div>
              </Link>
            ) : (
              <div className={styles.noFeature}>
                <span aria-hidden="true">✳</span>
                <p>
                  The world&apos;s finest escapes.<br />Timed to perfection.
                </p>
              </div>
            )}
          </header>

          {/* "When are you travelling?" Interactive Season Filter Bar */}
          <section className="my-8 rounded-xl border border-[var(--rule,#d8dcd0)] bg-[var(--paper-raised,#fffdf7)] p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className={styles.eyebrow}>WHEN ARE YOU TRAVELLING?</p>
                <h2 className="text-xl font-normal text-[var(--text,#263c32)] font-serif">
                  Match resorts to their optimal climate and season
                </h2>
              </div>
              {selectedSeason !== 'all' && primeCount !== null && (
                <div className="rounded-full bg-[#edf0cf] px-3 py-1 text-xs font-bold text-[#244d39] ring-1 ring-[#c8cfb4]">
                  ✨ {primeCount} {primeCount === 1 ? 'resort' : 'resorts'} in prime season in {activeSeason.label.split(' (')[0]}
                </div>
              )}
            </div>

            {/* Season buttons */}
            <div className="mt-4 flex flex-wrap gap-2">
              {TRAVEL_SEASONS.map((season) => (
                <button
                  key={season.id}
                  type="button"
                  onClick={() => setSelectedSeason(season.id)}
                  aria-pressed={selectedSeason === season.id}
                  className={`rounded-md px-3.5 py-2 text-xs font-semibold transition-all ${
                    selectedSeason === season.id
                      ? 'bg-[var(--green,#244d39)] text-[var(--paper,#f6f3eb)] shadow-sm'
                      : 'border border-[var(--rule,#d8dcd0)] bg-[var(--paper,#f6f3eb)] text-[var(--text,#263c32)] hover:border-[var(--green,#244d39)]'
                  }`}
                >
                  {season.label}
                </button>
              ))}
            </div>

            {selectedSeason !== 'all' && (
              <div className="mt-3 flex items-center justify-between text-xs text-[var(--soft,#627069)]">
                <span>
                  Showing all properties, sorted with <strong>{activeSeason.label.split(' (')[0]} prime destinations</strong> first.
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedSeason('all')}
                  className="font-semibold text-[var(--green,#244d39)] hover:underline"
                >
                  Reset season filter
                </button>
              </div>
            )}
          </section>

          {/* Top Activities Discovery Pane */}
          <section className="my-8 rounded-xl border border-[var(--rule,#d8dcd0)] bg-[var(--paper-raised,#fffdf7)] p-6 shadow-sm" aria-label="Top activities">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className={styles.eyebrow}>SIGNATURE EXPERIENCES & TOP ACTIVITIES</p>
                <h2 className="text-xl font-normal text-[var(--text,#263c32)] font-serif">
                  Explore retreats by their standout activities
                </h2>
              </div>
              {selectedActivity !== 'all' && (
                <div className="rounded-full bg-[#edf0cf] px-3 py-1 text-xs font-bold text-[#244d39] ring-1 ring-[#c8cfb4]">
                  ✨ {displayedResorts.length} {displayedResorts.length === 1 ? 'retreat' : 'retreats'} featuring {selectedActivity} experiences
                </div>
              )}
            </div>

            {/* Activity filter buttons */}
            <div className="mt-4 flex flex-wrap gap-2">
              {ACTIVITY_FILTERS.map((act) => (
                <button
                  key={act.id}
                  type="button"
                  onClick={() => setSelectedActivity(act.id)}
                  aria-pressed={selectedActivity === act.id}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-semibold transition-all ${
                    selectedActivity === act.id
                      ? 'bg-[var(--green,#244d39)] text-[var(--paper,#f6f3eb)] shadow-sm'
                      : 'border border-[var(--rule,#d8dcd0)] bg-[var(--paper,#f6f3eb)] text-[var(--text,#263c32)] hover:border-[var(--green,#244d39)]'
                  }`}
                >
                  <Icon name={act.icon} className="size-3.5" />
                  <span>{act.label}</span>
                </button>
              ))}
            </div>

            {selectedActivity !== 'all' && (
              <div className="mt-3 flex items-center justify-between text-xs text-[var(--soft,#627069)]">
                <span>
                  Filtering properties curated with signature <strong>{selectedActivity}</strong> experiences.
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedActivity('all')}
                  className="font-semibold text-[var(--green,#244d39)] hover:underline"
                >
                  Reset activity filter
                </button>
              </div>
            )}
          </section>

          {/* Curated Shelves Navigation */}
          <section id="resorts" className={styles.openings} aria-label="Browse resorts">
            <div className={styles.browseHeading}>
              <div>
                <p className={styles.eyebrow}>CURATED COLLECTIONS</p>
                <h2>Something extraordinary for every journey.</h2>
              </div>
            </div>

            <div className={`${styles.filters} min-w-0 max-w-full overflow-hidden`}>
              <nav
                ref={shelfNavRef}
                className={`${styles.statusFilters} flex min-w-0 max-w-full flex-nowrap items-center gap-1.5 overflow-x-auto py-1 border-b-0 [overscroll-behavior-x:contain] [scrollbar-width:thin]`}
                aria-label="Resort collections"
              >
                <button
                  type="button"
                  onClick={() => setActiveShelfId('all')}
                  aria-current={activeShelfId === 'all' ? 'location' : undefined}
                  className={`shrink-0 rounded px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                    activeShelfId === 'all'
                      ? 'bg-[var(--text,#263c32)] text-[var(--paper,#f6f3eb)]'
                      : 'text-[var(--soft,#627069)] hover:bg-[var(--rule,#d8dcd0)]'
                  }`}
                >
                  All Curated Resorts <span>· {allResorts.length.toString().padStart(2, '0')}</span>
                </button>
                {shelves.map((shelf) => (
                  <button
                    key={shelf.id}
                    type="button"
                    onClick={() => setActiveShelfId(shelf.id)}
                    aria-current={activeShelfId === shelf.id ? 'location' : undefined}
                    className={`shrink-0 rounded px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                      activeShelfId === shelf.id
                        ? 'bg-[var(--text,#263c32)] text-[var(--paper,#f6f3eb)]'
                        : 'text-[var(--soft,#627069)] hover:bg-[var(--rule,#d8dcd0)]'
                    }`}
                  >
                    {shelf.label} <span>· {shelf.pins.length.toString().padStart(2, '0')}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Current Shelf Headline & Sort controls */}
            <div className={`${styles.sectionHeading} ${styles.sortedSectionHeading} mt-8 mb-6`}>
              <div>
                <h2 className="text-2xl font-serif font-normal text-[var(--text,#263c32)]">
                  {activeShelfId === 'all' ? 'All Curated Resorts & Retreats' : currentShelf?.label}
                </h2>
                <p className="mt-1 text-sm text-[var(--soft,#627069)]">
                  {sortOrder === 'price-asc'
                    ? 'Sorted by nightly rate from lowest to highest, paired with verified climate timing.'
                    : sortOrder === 'price-desc'
                    ? 'Sorted by nightly rate from highest sanctuary tier, paired with verified climate timing.'
                    : sortOrder === 'rating-asc'
                    ? 'Sorted by guest and critic rubric rating from lowest to highest, paired with verified climate timing.'
                    : sortOrder === 'distance-asc'
                    ? 'Sorted by approximate distance from your location (nearest first), paired with verified climate timing.'
                    : sortOrder === 'distance-desc'
                    ? 'Sorted by approximate distance from your location (farthest first), paired with verified climate timing.'
                    : sortOrder === 'rating-desc' && activeShelfId !== 'all'
                    ? `Ranked by guest and critic rating within ${currentShelf?.label ?? 'collection'}, paired with verified climate timing.`
                    : 'Ranked by overall rubric score and critic acclaim, each with published facts and climate guide.'}
                </p>
                {(locating || locationError) && (
                  <p className="mt-2 text-xs text-[var(--soft,#627069)]" role="status">
                    {locating ? 'Finding your location…' : locationError}
                  </p>
                )}
              </div>

              {/* Sort controls */}
              <div className={styles.offerSort}>
                <div role="group" aria-label="Sort resorts">
                  <span>Sort</span>
                  <button
                    type="button"
                    aria-pressed={isRating}
                    onClick={() => handleSortCategory('rating')}
                    title={
                      isRating
                        ? sortOrder === 'rating-asc'
                          ? 'Rating: Lowest first (click to inverse)'
                          : 'Rating: Highest first (click to inverse)'
                        : 'Sort by rating'
                    }
                  >
                    Rating{isRating ? (sortOrder === 'rating-asc' ? ' ↑' : ' ↓') : ''}
                  </button>
                  <button
                    type="button"
                    aria-pressed={isPrice}
                    onClick={() => handleSortCategory('price')}
                    title={
                      isPrice
                        ? sortOrder === 'price-desc'
                          ? 'Price: Highest first (click to inverse)'
                          : 'Price: Lowest first (click to inverse)'
                        : 'Sort by price'
                    }
                  >
                    Price{isPrice ? (sortOrder === 'price-desc' ? ' ↓' : ' ↑') : ''}
                  </button>
                  <button
                    type="button"
                    aria-pressed={isDistance}
                    disabled={locating}
                    onClick={() => handleSortCategory('distance')}
                    title={
                      isDistance
                        ? sortOrder === 'distance-desc'
                          ? 'Distance: Farthest first (click to inverse)'
                          : 'Distance: Nearest first (click to inverse)'
                        : 'Sort by distance'
                    }
                  >
                    {locating ? 'Finding location…' : `Distance${isDistance ? (sortOrder === 'distance-desc' ? ' ↓' : ' ↑') : ''}`}
                  </button>
                </div>
                <Link href="/map" className={styles.offerMapButton} prefetch={false}>
                  <Icon name="map" />Map
                </Link>
              </div>
            </div>

            {/* Resort Cards Grid */}
            <AdFilledGrid
              cards={displayedResorts.map((resort) => (
                <ResortCard
                  key={resort.id}
                  resort={resort}
                  shelfLabel={
                    shelves.find((s) => s.pins.some((p) => p.id === resort.id))?.label ?? 'LUXURY RETREAT'
                  }
                  activeSeasonMonths={selectedSeason !== 'all' ? activeSeason.months : null}
                  activeSeasonLabel={selectedSeason !== 'all' ? activeSeason.label.split(' (')[0] : undefined}
                  viewerOrigin={viewerOrigin}
                  showDistance={sortOrder.startsWith('distance')}
                />
              ))}
            />
          </section>

          {/* Editorial Note & Rubric Methodology */}
          <div className={styles.editorialNote}>
            <span aria-hidden="true">✳</span>
            <div>
              <h2>About the Chronopin Hotel & Travel Rubric</h2>
              <p className="text-xs leading-relaxed text-[var(--soft,#627069)]">
                Every property on Chronopin is scored on an objective six-axis rubric: Rooms, Service, Location, Cleanliness,
                Value, and Critic Acclaim (each 0 to 5 in half steps). The first five are derived from verified published guest
                sub-scores (halved from 10-point scales across Booking.com, Google, and Tripadvisor). Critic Acclaim is drawn from
                independent guide selections, including the MICHELIN Guide Keys, Forbes Travel Guide Star Awards, AAA Diamonds,
                and Relais &amp; Châteaux. Timing insights are based on multi-year Open-Meteo historical climate averages, local
                seasonal festivals, trade wind cycles, and crowd dynamics.
              </p>
            </div>
          </div>
        </div>
      </main>
    </RestaurantCardAdsProvider>
  );
}
