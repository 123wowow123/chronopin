'use client';

import Anchor from '@/components/ui/Anchor';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import { Icon } from '@/components/ui/Icon';
import Link from '@/components/ui/Link';
import { RESTAURANT_COUNTRIES, RESTAURANT_REGIONS, openingGroup, type Restaurant, type OpeningGroup, type TopRestaurant } from '@/lib/restaurants';
import type { ScheduledRestaurantOffer } from '@/lib/restaurantOffers';
import { guidePageHref, type GuideItem, type GuidePage, type GuideSummary, type GuideView } from '@/lib/restaurantGuide';
import { pinPath } from '@/lib/seo';
import styles from './RestaurantGuide.module.css';
import { AvailableRestaurantOffers } from './AvailableRestaurantOffers';
import { restaurantDistance, type RestaurantDetails } from '@/lib/restaurantSort';
import { formatDistance } from '@/lib/distance';
import { usesImperial } from '@/lib/weather';
import { usePathname } from '@/lib/client/navigation';
import { RestaurantControls, RestaurantSortNote, useRestaurantSort } from './RestaurantControls';
import { CityGuideLink } from './CityGuideLink';
import { PagedCardGrid, useGuidePages, type GuidePages } from './PagedCardGrid';

type Props = {
  summary: GuideSummary;
  // The view a ?view= URL asked for, shown until the reader picks another.
  initialView: GuideView;
  // The first page of the view the guide opens on, by guideKey; the rest is fetched.
  initialPages: Record<string, GuidePage<GuideItem>>;
  availableRegionSlugs: string[];
  region: { name: string; state: string; slug: string; country: string };
  today: string;
  previewSnapshot: boolean;
  timeZone: string;
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

export function RestaurantGuide({ summary, initialView, initialPages, availableRegionSlugs, region, today, previewSnapshot, timeZone }: Props) {
  const pathname = usePathname();
  const recentSort = useRestaurantSort('Restaurants');
  const topSort = useRestaurantSort('Restaurants');
  const upcomingSort = useRestaurantSort('Restaurants', 'opening-date');
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
  const { counts } = summary;
  const specialCount = counts.discounts;
  const views = VIEWS.filter((view) => counts[view.key] > 0);
  // Old bookmarks and links from another city can point to an empty view.
  const status: GuideView = views.find((view) => view.hash === hash || (view.key === 'discounts' && hash === '#next-specials'))?.key ?? views.find((view) => view.key === initialView)?.key ?? views[0]?.key ?? 'upcoming';
  const top = status === 'top';
  const discounts = status === 'discounts';
  const neighborhoods = summary.neighborhoods[status];
  const neighborhood = neighborhoods.includes(selectedNeighborhood) ? selectedNeighborhood : 'all';
  const featured = summary.featured;
  const selectedSort = top ? topSort : status === 'upcoming' ? upcomingSort : recentSort;
  const pages = useGuidePages<Restaurant | TopRestaurant>(discounts ? null : { region: region.slug, view: status, neighborhood, sort: selectedSort.sort, origin: selectedSort.origin }, initialPages as Record<string, GuidePage<Restaurant | TopRestaurant>>);
  const selectedMapParams = new URLSearchParams({ show: 'restaurants', fit: 'results', past: 'all', future: 'all', q: `pin:${pages.ids.join(',')}`, returnTo: `${pathname}${top ? '#top-restaurants' : status === 'upcoming' ? '#upcoming' : '#new'}` });
  const shown = pages.total;
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
    if (!VIEWS.some((view) => view.hash === hash) && hash !== '#next-specials') return;
    // A filtered section may only mount after the hash selects its view.
    const frame = requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' }));
    return () => cancelAnimationFrame(frame);
  }, [hash]);

  return (
    <main className={styles.guide} data-landing lang="en">
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
          {cities.map((city) => <CityGuideLink key={city.slug} slug={city.slug} name={city.name} current={city.slug === region.slug} />)}
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
          {counts.upcoming > 0 && <Anchor href="#upcoming" onClick={() => setNeighborhood('all')}><strong>{counts.upcoming.toString().padStart(2, '0')}</strong><span>Upcoming openings <span aria-hidden="true">↗</span></span></Anchor>}
          {counts.new > 0 && <Anchor href="#new" onClick={() => setNeighborhood('all')}><strong>{counts.new.toString().padStart(2, '0')}</strong><span>New in the last 90 days <span aria-hidden="true">↗</span></span></Anchor>}
          {specialCount > 0 && <Anchor href="#available-now" onClick={() => setNeighborhood('all')}><strong>{specialCount.toString().padStart(2, '0')}</strong><span>Specials <span aria-hidden="true">↗</span></span></Anchor>}
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
          {discounts ? <AvailableRestaurantOffers key={region.slug} regionSlug={region.slug} neighborhood={neighborhood} initialPages={initialPages as Record<string, GuidePage<ScheduledRestaurantOffer>>} timeZone={timeZone} city={region.name} /> : <>
          {pages.ready && <p className={styles.results} aria-live="polite">{shown} {top ? (shown === 1 ? 'restaurant' : 'restaurants') : (shown === 1 ? 'opening' : 'openings')} to explore{neighborhood !== 'all' ? ` in ${neighborhood}` : ''}</p>}
          {pages.ready && !shown ? <div className={styles.empty}><h3>{top ? 'No top restaurants match those filters.' : counts.upcoming + counts.new ? 'No openings match those filters.' : 'The next opening is still on its way.'}</h3><p>{top || counts.upcoming + counts.new ? 'Try another neighborhood.' : 'Check back for newly announced restaurants in this region.'}</p>{(top || counts.upcoming + counts.new > 0) && <button type="button" onClick={top ? () => { setNeighborhood('all'); } : reset}>Clear filters ↗</button>}</div> : top ? <TopRestaurantSection pageHref={(page) => guidePageHref(pathname, 'top', page, '#top-restaurants')} pages={pages as GuidePages<TopRestaurant>} sortState={selectedSort} mapHref={`/map?${selectedMapParams}`} /> : status === 'upcoming'
            ? <OpeningSection pageHref={(page) => guidePageHref(pathname, 'upcoming', page, '#upcoming')} id="upcoming" title="On the horizon" subtitle="Announced openings worth keeping an eye on." pages={pages as GuidePages<Restaurant>} group="upcoming" today={today} href={href} sortState={upcomingSort} mapHref={`/map?${selectedMapParams}`} />
            : <OpeningSection pageHref={(page) => guidePageHref(pathname, 'new', page, '#new')} id="new" title="Freshly opened" subtitle="New tables, new flavors. Opened within the last 90 days." pages={pages as GuidePages<Restaurant>} group="new" today={today} href={href} sortState={recentSort} mapHref={`/map?${selectedMapParams}`} />}
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

function TopRestaurantSection({ pages, pageHref, sortState, mapHref }: { pages: GuidePages<TopRestaurant>; pageHref: (page: number) => string; sortState?: SortState; mapHref?: string }) {
  const restaurants = pages.items;
  const details = pages.details;
  return <section id="top-restaurants" className={styles.section} aria-labelledby="top-restaurants-title">
    <div className={`${styles.sectionHeading} ${sortState ? styles.sortedSectionHeading : ''}`}><div><h2 id="top-restaurants-title">Top restaurants <span>{pages.total.toString().padStart(2, '0')}</span></h2><p>Established favorites for your next meal.</p></div>{sortState && mapHref ? <RestaurantControls state={sortState} label="top restaurants" mapHref={mapHref} /> : <span className={styles.sectionSymbol} aria-hidden="true">✳</span>}</div>
    {sortState && <RestaurantSortFeedback state={sortState} />}
    {restaurants.length > 0 && <p className={styles.topNote}>{restaurants.every((restaurant) => restaurant.recognition.startsWith('MICHELIN')) ? 'A curated selection from the MICHELIN Guide, covering starred dining, Bib Gourmand value picks, and selected restaurants. Each card links to its recognition. Dollar signs are the guide’s price ranges.' : 'A Chronopin editorial selection of established restaurants. Each card links to the restaurant’s information; this selection is not an external award.'} Checked {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${restaurants[0].checkedAt}T00:00:00Z`))}.</p>}
    <PagedCardGrid pages={pages} pageHref={pageHref}>{(restaurant) => (
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
    )}</PagedCardGrid>
  </section>;
}

function OpeningSection({ pageHref, id, title, subtitle, pages, group, today, href, sortState, mapHref }: { pageHref: (page: number) => string; id: string; title: string; subtitle: string; pages: GuidePages<Restaurant>; group: OpeningGroup; today: string; href: (restaurant: Restaurant) => string; sortState?: SortState; mapHref?: string }) {
  const details = pages.details;
  return <section id={id} className={styles.section} aria-labelledby={`${id}-title`}>
    <div className={`${styles.sectionHeading} ${sortState ? styles.sortedSectionHeading : ''}`}><div><h2 id={`${id}-title`}>{title} <span>{pages.total.toString().padStart(2, '0')}</span></h2><p>{subtitle}</p></div>{sortState && mapHref ? <RestaurantControls state={sortState} label={group === 'upcoming' ? 'coming soon restaurants' : 'just opened restaurants'} mapHref={mapHref} openingDate={group === 'upcoming'} /> : <span className={styles.sectionSymbol} aria-hidden="true">{group === 'new' ? '↗' : '✳'}</span>}</div>
    {sortState && <RestaurantSortFeedback state={sortState} />}
    <PagedCardGrid pages={pages} pageHref={pageHref}>{(restaurant) => (
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
    )}</PagedCardGrid>
  </section>;
}
