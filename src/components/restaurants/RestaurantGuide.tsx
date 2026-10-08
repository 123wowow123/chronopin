'use client';

import Anchor from '@/components/ui/Anchor';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import { Icon } from '@/components/ui/Icon';
import Link from '@/components/ui/Link';
import { RESTAURANT_COUNTRIES, RESTAURANT_REGIONS, openingGroup, type Restaurant, type OpeningGroup, type TopRestaurant } from '@/lib/restaurants';
import { pinPath } from '@/lib/seo';
import styles from './RestaurantGuide.module.css';
import { AvailableRestaurantOffers } from './AvailableRestaurantOffers';
import { restaurantOffersToShow, type RestaurantOffer } from '@/lib/restaurantOffers';
import { restaurantDistance, sortRestaurants, type RestaurantDetails } from '@/lib/restaurantSort';
import { formatDistance } from '@/lib/distance';
import { usesImperial } from '@/lib/weather';
import { usePathname } from '@/lib/client/navigation';
import { RestaurantControls, RestaurantSortNote, useRestaurantSort } from './RestaurantControls';

type Props = {
  restaurants: Restaurant[];
  topRestaurants: TopRestaurant[];
  availableRegionSlugs: string[];
  region: { name: string; state: string; slug: string; country: string };
  today: string;
  previewSnapshot: boolean;
  offers: RestaurantOffer[];
  timeZone: string;
  initialNow: string;
  details?: Record<number, RestaurantDetails>;
};

const VIEWS = [
  { key: 'upcoming', label: 'Coming soon', mobileLabel: 'Soon', hash: '#upcoming' },
  { key: 'new', label: 'Just opened', mobileLabel: 'New', hash: '#new' },
  { key: 'top', label: 'Top restaurants', mobileLabel: 'Top rated', hash: '#top-restaurants' },
  { key: 'discounts', label: 'Discounted menus available now', mobileLabel: 'Specials', hash: '#available-now' },
] as const;

function subscribeToHash(listener: () => void) {
  window.addEventListener('hashchange', listener);
  window.addEventListener('popstate', listener);
  return () => {
    window.removeEventListener('hashchange', listener);
    window.removeEventListener('popstate', listener);
  };
}
const currentHash = () => window.location.hash;
const serverHash = () => '';

export function RestaurantGuide({ restaurants, topRestaurants, availableRegionSlugs, region, today, previewSnapshot, offers, timeZone, initialNow, details = {} }: Props) {
  const pathname = usePathname();
  const recentSort = useRestaurantSort('Restaurants');
  const topSort = useRestaurantSort('Restaurants');
  const upcomingSort = useRestaurantSort('Restaurants', 'opening-date');
  const [now, setNow] = useState(initialNow);
  useEffect(() => {
    const refresh = () => setNow(new Date().toISOString());
    const onVisibility = () => { if (document.visibilityState === 'visible') refresh(); };
    refresh();
    const timer = window.setInterval(refresh, 15_000);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('focus', refresh); };
  }, []);
  const hash = useSyncExternalStore(subscribeToHash, currentHash, serverHash);
  const [selectedNeighborhood, setNeighborhood] = useState('all');
  const [countrySelection, setCountrySelection] = useState({ regionSlug: region.slug, country: region.country });
  const availableRegions = RESTAURANT_REGIONS.filter((city) => availableRegionSlugs.includes(city.slug));
  const countries = RESTAURANT_COUNTRIES.filter((country) => availableRegions.some((city) => city.country === country));
  const preferredCountry = countrySelection.regionSlug === region.slug ? countrySelection.country : region.country;
  const selectedCountry = countries.find((country) => country === preferredCountry) ?? countries[0];
  const countryNav = useRef<HTMLElement>(null);
  const viewNav = useRef<HTMLElement>(null);
  const cities = availableRegions.filter((city) => city.country === selectedCountry);
  const active = restaurants.filter((restaurant) => openingGroup(restaurant, today));
  const upcoming = active.filter((restaurant) => openingGroup(restaurant, today) === 'upcoming').sort((a, b) => a.day.localeCompare(b.day));
  const recent = active.filter((restaurant) => openingGroup(restaurant, today) === 'new').sort((a, b) => b.day.localeCompare(a.day));
  const shownOffers = restaurantOffersToShow(offers, new Date(now), timeZone);
  const views = VIEWS.filter((view) => ({ upcoming: upcoming.length, new: recent.length, top: topRestaurants.length, discounts: shownOffers.offers.length })[view.key] > 0);
  // Old bookmarks and links from another city can point to an empty view.
  const status = views.find((view) => view.hash === hash)?.key ?? views[0]?.key ?? 'upcoming';
  const top = status === 'top';
  const discounts = status === 'discounts';
  const neighborhoods = [...new Set((discounts ? offers : top ? topRestaurants : status === 'new' ? recent : status === 'upcoming' ? upcoming : [...active, ...topRestaurants]).map((restaurant) => restaurant.neighborhood))].sort();
  const neighborhood = neighborhoods.includes(selectedNeighborhood) ? selectedNeighborhood : 'all';
  const featured = recent.find((restaurant) => restaurant.id === 6434 && restaurant.image) ?? recent.find((restaurant) => restaurant.image && !restaurant.imageNote) ?? recent.find((restaurant) => restaurant.image) ?? upcoming.find((restaurant) => restaurant.image);
  const matches = (restaurant: Pick<Restaurant, 'neighborhood'>) => neighborhood === 'all' || restaurant.neighborhood === neighborhood;
  const shownUpcoming = status === 'new' || top ? [] : status === 'upcoming' ? sortRestaurants(upcoming.filter(matches), (r) => details[r.id], upcomingSort.sort, upcomingSort.origin, (r) => r.day) : upcoming.filter(matches);
  const shownRecent = status === 'upcoming' || top ? [] : status === 'new' ? sortRestaurants(recent.filter(matches), (r) => details[r.id], recentSort.sort, recentSort.origin) : recent.filter(matches);
  const shownTop = top ? sortRestaurants(topRestaurants.filter(matches), (r) => details[r.pinId], topSort.sort, topSort.origin) : topRestaurants.filter(matches);
  const selectedSort = top ? topSort : status === 'upcoming' ? upcomingSort : recentSort;
  const selectedIds = top ? shownTop.map((r) => r.pinId) : (status === 'upcoming' ? shownUpcoming : shownRecent).map((r) => r.id);
  const selectedMapParams = new URLSearchParams({ show: 'restaurants', fit: 'results', past: 'all', future: 'all', q: `pin:${selectedIds.join(',')}`, returnTo: `${pathname}${top ? '#top-restaurants' : status === 'upcoming' ? '#upcoming' : '#new'}` });
  const shown = top ? shownTop.length : shownUpcoming.length + shownRecent.length;
  const href = (restaurant: Restaurant) => pinPath(restaurant);
  const reset = () => { setNeighborhood('all'); };

  useEffect(() => {
    const nav = countryNav.current;
    const selected = nav?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (nav && selected) nav.scrollLeft = selected.offsetLeft - (nav.clientWidth - selected.clientWidth) / 2;
  }, [selectedCountry]);

  useEffect(() => {
    const revealSelected = () => {
      const nav = viewNav.current;
      const selected = nav?.querySelector<HTMLElement>('[aria-current="location"]');
      if (nav && selected && window.matchMedia('(max-width:600px)').matches) nav.scrollLeft = selected.offsetLeft - (nav.clientWidth - selected.clientWidth) / 2;
    };
    revealSelected();
    window.addEventListener('resize', revealSelected);
    return () => window.removeEventListener('resize', revealSelected);
  }, [status]);

  useEffect(() => {
    if (!VIEWS.some((view) => view.hash === hash)) return;
    // A filtered section may only mount after the hash selects its view.
    const frame = requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' }));
    return () => cancelAnimationFrame(frame);
  }, [hash]);

  return (
    <main className={styles.guide} lang="en">
      <div className={styles.container}>
        <div className={styles.guideNav}>
          <Link href="/restaurants" className={styles.wordmark}><span aria-hidden="true">✳</span> The opening guide</Link>
          <nav ref={countryNav} className={styles.countryNav} aria-label="Restaurant guide country">
            {countries.map((country) => (
              <button key={country} type="button" aria-pressed={country === selectedCountry} onClick={() => setCountrySelection({ regionSlug: region.slug, country })}>{country}</button>
            ))}
          </nav>
        </div>

        <nav className={styles.cityNav} aria-label={`${selectedCountry} restaurant guide cities`}>
          {cities.map((city) => <Link key={city.slug} href={`/restaurants/${city.slug}`} aria-current={city.slug === region.slug ? 'page' : undefined}>{city.name}</Link>)}
        </nav>

        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>GOOD FOOD. NEW BEGINNINGS.</p>
            <h1>{region.name}’s<br />next great <em>table.</em></h1>
            <p className={styles.lead}>The places about to open. The ones that just did. Your guide to what’s new on the local dining scene.</p>
          </div>
          {featured ? (
            <Link href={href(featured)} className={styles.featured} aria-label={`Explore ${featured.name}'s opening`}>
              <Image src={featured.image!} alt={`${featured.name} · ${featured.imageNote ?? 'restaurant photo'}`} fill sizes="(max-width: 760px) 100vw, 50vw" priority className={styles.featuredImage} />
              <div className={styles.featuredShade} />
              <span className={styles.featuredBadge}>{openingGroup(featured, today) === 'new' ? 'RECENTLY OPENED' : 'ON THE HORIZON'}</span>
              <div className={styles.featuredCopy}><p>{featured.neighborhood} · {featured.cuisine}</p><h2>{featured.name}</h2><span>Discover the opening <span aria-hidden="true">↗</span></span></div>
              {featured.imageNote && <span className={styles.featuredNote}>{featured.imageNote}</span>}
            </Link>
          ) : <div className={styles.noFeature}><span aria-hidden="true">✳</span><p>A new chapter<br />for local dining.</p></div>}
        </header>

        <div className={styles.digest}>
          <p>A little discovery.<br /><strong>A lot to look forward to.</strong></p>
          {upcoming.length > 0 && <Anchor href="#upcoming" onClick={() => setNeighborhood('all')}><strong>{upcoming.length.toString().padStart(2, '0')}</strong><span>Upcoming openings <span aria-hidden="true">↗</span></span></Anchor>}
          {recent.length > 0 && <Anchor href="#new" onClick={() => setNeighborhood('all')}><strong>{recent.length.toString().padStart(2, '0')}</strong><span>New in the last 90 days <span aria-hidden="true">↗</span></span></Anchor>}
          {shownOffers.offers.length > 0 && <Anchor href="#available-now" onClick={() => setNeighborhood('all')}><strong>{shownOffers.offers.length.toString().padStart(2, '0')}</strong><span>Specials <span aria-hidden="true">↗</span></span></Anchor>}
        </div>

        <section id="openings" className={styles.openings} aria-label="Browse restaurants">
          <div className={styles.browseHeading}><div><p className={styles.eyebrow}>THE LOCAL LINEUP</p><h2>{top ? 'Great tables, already here.' : 'Something new on the menu.'}</h2></div><span>{region.name} edition</span></div>
          <div className={styles.filters}>
            <nav ref={viewNav} className={styles.statusFilters} aria-label="Restaurant view">
              {views.map((item) => <Anchor key={item.key} href={item.hash} aria-label={item.label} aria-current={status === item.key ? 'location' : undefined} onClick={() => { if ((item.key === 'top') !== top || (item.key === 'discounts') !== discounts) setNeighborhood('all'); }}><span className={styles.viewLabel} aria-hidden="true">{item.label}</span><span className={styles.mobileViewLabel} aria-hidden="true">{item.mobileLabel}</span></Anchor>)}
            </nav>
            <div className={styles.filterFields}>
              <label className={styles.neighborhoodField}><span className="sr-only">Neighborhood</span><select aria-label="Neighborhood" value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)}><option value="all">All neighborhoods</option>{neighborhoods.map((name) => <option key={name} value={name}>{name}</option>)}</select><Icon name="chevron" className={styles.selectChevron} /></label>
            </div>
          </div>
          {discounts ? <AvailableRestaurantOffers key={region.slug} offers={offers.filter(matches)} timeZone={timeZone} now={now} city={region.name} /> : <>
          <p className={styles.results} aria-live="polite">{shown} {top ? (shown === 1 ? 'restaurant' : 'restaurants') : (shown === 1 ? 'opening' : 'openings')} to explore{neighborhood !== 'all' ? ` in ${neighborhood}` : ''}</p>
          {!shown ? <div className={styles.empty}><h3>{top ? 'No top restaurants match those filters.' : active.length ? 'No openings match those filters.' : 'The next opening is still on its way.'}</h3><p>{top || active.length ? 'Try another neighborhood.' : 'Check back for newly announced restaurants in this region.'}</p>{(top || active.length > 0) && <button type="button" onClick={top ? () => { setNeighborhood('all'); } : reset}>Clear filters ↗</button>}</div> : top ? <TopRestaurantSection restaurants={shownTop} details={details} sortState={selectedSort} mapHref={`/map?${selectedMapParams}`} /> : (
            <>
              {shownUpcoming.length > 0 && <OpeningSection id="upcoming" title="On the horizon" subtitle="Announced openings worth keeping an eye on." restaurants={shownUpcoming} group="upcoming" today={today} href={href} details={details} sortState={status === 'upcoming' ? upcomingSort : undefined} mapHref={status === 'upcoming' ? `/map?${selectedMapParams}` : undefined} />}
              {shownRecent.length > 0 && <OpeningSection id="new" title="Freshly opened" subtitle="New tables, new flavors. Opened within the last 90 days." restaurants={shownRecent} group="new" today={today} href={href} details={details} sortState={status === 'new' ? recentSort : undefined} mapHref={status === 'new' ? `/map?${selectedMapParams}` : undefined} />}
            </>
          )}
          </>}
        </section>

        <aside className={styles.editorialNote}><span aria-hidden="true">✳</span><div><h2>A date is a starting point.</h2><p>Opening plans can change. Month and season dates are estimates, and a passed estimate never means a restaurant is confirmed open. Each pin links to the reporting behind it—check the latest details before making plans.</p>{previewSnapshot && <p className={styles.previewNote}>Local preview: published {region.name} pins from October 6, 2026.</p>}</div><Anchor href={views.find((view) => view.key === status)?.hash ?? '#openings'} onClick={() => setNeighborhood('all')}>Back to restaurants ↗</Anchor></aside>
      </div>
    </main>
  );
}

type SortState = ReturnType<typeof useRestaurantSort>;
function RestaurantSortFeedback({ state }: { state: SortState }) {
  return <div className={styles.restaurantSortNotes}><RestaurantSortNote state={state} />{state.sort === 'rating' && <p className={styles.offerSortNote}>Highest published rating first. Restaurants without ratings retain their guide order and appear last.</p>}</div>;
}
function RestaurantFacts({ details, sortState }: { details?: RestaurantDetails; sortState?: SortState }) {
  const rating = details?.rating;
  const distance = restaurantDistance(details, sortState?.origin);
  return <>
    {rating && <p className={styles.offerReview}>{rating.url ? <Anchor href={rating.url} target="_blank" rel="noopener noreferrer">★ {rating.score}/{rating.scoreMax} · {rating.source} ↗</Anchor> : <>★ {rating.score}/{rating.scoreMax} · {rating.source}</>}</p>}
    {sortState?.sort === 'distance' && <p className={styles.offerDistance} title="Approximate straight-line distance">{distance === undefined ? 'Distance unavailable' : `${formatDistance(distance, usesImperial())} away`}</p>}
  </>;
}

function TopRestaurantSection({ restaurants, details = {}, sortState, mapHref }: { restaurants: TopRestaurant[]; details?: Record<number, RestaurantDetails>; sortState?: SortState; mapHref?: string }) {
  return <section id="top-restaurants" className={styles.section} aria-labelledby="top-restaurants-title">
    <div className={`${styles.sectionHeading} ${sortState ? styles.sortedSectionHeading : ''}`}><div><h2 id="top-restaurants-title">Top restaurants <span>{restaurants.length.toString().padStart(2, '0')}</span></h2><p>Established favorites for your next meal.</p></div>{sortState && mapHref ? <RestaurantControls state={sortState} label="top restaurants" mapHref={mapHref} /> : <span className={styles.sectionSymbol} aria-hidden="true">✳</span>}</div>
    {sortState && <RestaurantSortFeedback state={sortState} />}
    <p className={styles.topNote}>{restaurants.every((restaurant) => restaurant.recognition.startsWith('MICHELIN')) ? 'A curated selection from the MICHELIN Guide, covering starred dining, Bib Gourmand value picks, and selected restaurants. Each card links to its recognition. Dollar signs are the guide’s price ranges.' : 'A Chronopin editorial selection of established restaurants. Each card links to the restaurant’s information; this selection is not an external award.'} Checked {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${restaurants[0].checkedAt}T00:00:00Z`))}.</p>
    <div className={styles.cardGrid}>{restaurants.map((restaurant) => (
      <article key={restaurant.slug} className={styles.card}>
        <Link href={pinPath({ id: restaurant.pinId, title: restaurant.pinTitle })} className={styles.photoLink} aria-label={`See ${restaurant.name}'s restaurant details`}>
          {restaurant.image ? <Image src={restaurant.image} alt={restaurant.name} fill sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 33vw" className={styles.cardImage} /> : <span className={styles.photoPlaceholder} aria-hidden="true">✳</span>}
          <span className={`${styles.cardBadge} ${styles.openBadge}`}>{restaurant.recognition}</span>
          <span className={styles.imageNote}>{restaurant.imageCredit}</span>
        </Link>
        <div className={styles.cardBody}>
          <p className={styles.cardMeta}>{restaurant.neighborhood}<span aria-hidden="true">·</span>{restaurant.cuisine}{restaurant.priceRange && <><span aria-hidden="true">·</span><span aria-label={`Guide price range ${restaurant.priceRange.length} of 4`}>{restaurant.priceRange}</span></>}</p>
          <h3><Link href={pinPath({ id: restaurant.pinId, title: restaurant.pinTitle })}>{restaurant.name}</Link></h3>
          <RestaurantFacts details={details[restaurant.pinId]} sortState={sortState} />
          <p className={styles.cardDescription}>{restaurant.description}</p>
          <p className={styles.topAddress}>{restaurant.address}</p>
          <div className={styles.topLinks}><Link href={pinPath({ id: restaurant.pinId, title: restaurant.pinTitle })}>View restaurant ↗</Link><Anchor href={restaurant.websiteUrl} target="_blank" rel="noopener noreferrer">Visit website ↗</Anchor></div>
        </div>
      </article>
    ))}</div>
  </section>;
}

function OpeningSection({ id, title, subtitle, restaurants, group, today, href, details = {}, sortState, mapHref }: { id: string; title: string; subtitle: string; restaurants: Restaurant[]; group: OpeningGroup; today: string; href: (restaurant: Restaurant) => string; details?: Record<number, RestaurantDetails>; sortState?: SortState; mapHref?: string }) {
  return <section id={id} className={styles.section} aria-labelledby={`${id}-title`}>
    <div className={`${styles.sectionHeading} ${sortState ? styles.sortedSectionHeading : ''}`}><div><h2 id={`${id}-title`}>{title} <span>{restaurants.length.toString().padStart(2, '0')}</span></h2><p>{subtitle}</p></div>{sortState && mapHref ? <RestaurantControls state={sortState} label={group === 'upcoming' ? 'coming soon restaurants' : 'just opened restaurants'} mapHref={mapHref} openingDate={group === 'upcoming'} /> : <span className={styles.sectionSymbol} aria-hidden="true">{group === 'new' ? '↗' : '✳'}</span>}</div>
    {sortState && <RestaurantSortFeedback state={sortState} />}
    {restaurants.length ? <div className={styles.cardGrid}>{restaurants.map((restaurant) => (
      <article key={restaurant.id} className={styles.card}>
        <Link href={href(restaurant)} className={styles.photoLink} aria-label={`See ${restaurant.name}'s opening details`}>
          {restaurant.image ? <Image src={restaurant.image} alt={`${restaurant.name} · ${restaurant.imageNote ?? 'restaurant photo'}`} fill sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 33vw" className={styles.cardImage} /> : <div className={styles.photoPlaceholder}><span aria-hidden="true">✳</span></div>}
          <span className={`${styles.cardBadge} ${group === 'new' ? styles.openBadge : ''}`}>{group === 'new' ? 'JUST OPENED' : restaurant.day <= today ? 'AWAITING UPDATE' : 'COMING SOON'}</span>
          {restaurant.imageNote && <span className={styles.imageNote}>{restaurant.imageNote}</span>}
        </Link>
        <div className={styles.cardBody}>
          <p className={styles.cardMeta}>{restaurant.neighborhood}<span aria-hidden="true">·</span>{restaurant.cuisine}{restaurant.priceRange && <><span aria-hidden="true">·</span><span aria-label={`Restaurant price range ${restaurant.priceRange.length} of 4`}>{restaurant.priceRange}</span></>}</p>
          <h3><Link href={href(restaurant)}>{restaurant.name}</Link></h3>
          <RestaurantFacts details={details[restaurant.id]} sortState={sortState} />
          <p className={styles.cardDescription}>{restaurant.description}</p>
          <div className={styles.cardFoot}><div><span>{group === 'new' ? 'OPENED' : restaurant.day <= today ? 'LAST ANNOUNCED TARGET' : 'EXPECTED OPENING'}</span><strong><time dateTime={restaurant.day}>{restaurant.dateLabel}</time>{restaurant.estimated && <small>Estimated</small>}</strong></div><Link href={href(restaurant)} aria-label={`Read about ${restaurant.name}`} className={styles.cardArrow}>↗</Link></div>
        </div>
      </article>
    ))}</div> : <p className={styles.sectionEmpty}>No {group === 'new' ? 'recent' : 'upcoming'} openings match this selection.</p>}
  </section>;
}
