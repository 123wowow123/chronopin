'use client';

import { usePathname } from '@/lib/client/navigation';
import { restaurantOfferVenueKey, type ScheduledRestaurantOffer } from '@/lib/restaurantOffers';
import { RestaurantControls, RestaurantSortNote, useRestaurantSort } from './RestaurantControls';
import type { GuidePage } from '@/lib/restaurantGuide';
import { PagedCardGrid, useGuidePages } from './PagedCardGrid';
import { RestaurantOfferCard } from './RestaurantOfferCard';
import styles from './RestaurantGuide.module.css';

type Props = { regionSlug: string; neighborhood: string; initialPages: Record<string, GuidePage<ScheduledRestaurantOffer>>; timeZone: string; city: string };

export function AvailableRestaurantOffers(props: Props) {
  return <><RestaurantOfferSection {...props} upcoming={false} /><RestaurantOfferSection {...props} upcoming /></>;
}

function RestaurantOfferSection({ regionSlug, neighborhood, initialPages, timeZone, city, upcoming }: Props & { upcoming: boolean }) {
  const pathname = usePathname();
  const sortState = useRestaurantSort('Specials', upcoming ? 'starts' : 'rating');
  const { sort, origin } = sortState;
  const pages = useGuidePages<ScheduledRestaurantOffer>({ region: regionSlug, view: 'discounts', section: upcoming ? 'next' : 'available', neighborhood, sort, origin }, initialPages);
  const sectionId = upcoming ? 'next-specials' : 'available-now';
  const mapParams = new URLSearchParams({ show: 'restaurants', fit: 'results', past: 'all', future: 'all', specials: JSON.stringify(pages.ids), returnTo: `${pathname}#${sectionId}` });
  if (pages.bounds) mapParams.set('bounds', pages.bounds);
  return <section id={sectionId} className={styles.offers} aria-labelledby={`${sectionId}-title`}>
    <div className={styles.browseHeading}>
      <div><p className={styles.eyebrow}>GOOD FOOD. SPECIALS.</p><h2 id={`${sectionId}-title`}>{upcoming ? 'Upcoming specials' : 'Specials available now'}</h2></div>
      {pages.total > 0 && <RestaurantControls state={sortState} label="specials" mapHref={`/map?${mapParams}`} lunch={!upcoming} starts={upcoming} />}
    </div>
    <p className={styles.offerIntro}>Happy hours, daily specials, and limited offers during published service hours in {city}. Times follow the restaurant’s local clock.</p>
    <p className={styles.results} role="status">{!pages.ready ? 'Loading…' : upcoming ? `${pages.total} ${pages.total === 1 ? 'restaurant' : 'restaurants'} with upcoming specials.` : `${pages.total} ${pages.total === 1 ? 'restaurant' : 'restaurants'} with offers available now`}</p>
    {upcoming && pages.total > 0 && <p className={styles.offerIntro}>Each restaurant’s specials are shown in tabs with their next local start times.</p>}
    {pages.total > 0 && <RestaurantSortNote state={sortState} />}
    {sortState.sort === 'starts' && pages.total > 0 && <p className={styles.offerSortNote}>Soonest start first. Ties are ordered by rating.</p>}
    {sortState.sort === 'lunch' && pages.total > 0 && <p className={styles.offerSortNote}>Lunch specials first. Each group is ordered by rating.</p>}
    {pages.total ? <PagedCardGrid pages={pages}>{(offer) => <RestaurantOfferCard key={restaurantOfferVenueKey(offer)} card={offer} origin={origin} sort={sort} timeZone={timeZone} />}</PagedCardGrid> : pages.ready ? <div className={styles.empty}><h3>{upcoming ? 'No upcoming specials yet.' : 'No specials available right now.'}</h3><p>{upcoming ? 'Try another neighborhood or check back for new offers.' : 'See the next published specials below.'}</p></div> : null}
    <p className={styles.offerIntro}>Offers follow published schedules; item availability can change. Order or redeem directly with the restaurant. Seating restrictions and extra charges are shown with each offer.</p>
  </section>;
}
