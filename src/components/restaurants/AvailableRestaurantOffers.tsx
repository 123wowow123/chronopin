'use client';

import Image from 'next/image';
import Anchor from '@/components/ui/Anchor';
import Link from '@/components/ui/Link';
import { usePathname } from '@/lib/client/navigation';
import { HIGH_REVIEW_COUNT, HIGH_REVIEW_SCORE, restaurantOfferDistance, offerEndLabel, type ScheduledRestaurantOffer } from '@/lib/restaurantOffers';
import { formatDistance } from '@/lib/distance';
import { usesImperial } from '@/lib/weather';
import { RestaurantControls, RestaurantSortNote, useRestaurantSort } from './RestaurantControls';
import type { GuidePage } from '@/lib/restaurantGuide';
import { PagedCardGrid, useGuidePages } from './PagedCardGrid';
import { RestaurantOfferMenu } from './RestaurantOfferMenu';
import styles from './RestaurantGuide.module.css';

type Props = { regionSlug: string; neighborhood: string; initialPages: Record<string, GuidePage<ScheduledRestaurantOffer>>; timeZone: string; city: string };

export function AvailableRestaurantOffers(props: Props) {
  return <><RestaurantOfferSection {...props} upcoming={false} /><RestaurantOfferSection {...props} upcoming /></>;
}

function RestaurantOfferSection({ regionSlug, neighborhood, initialPages, timeZone, city, upcoming }: Props & { upcoming: boolean }) {
  const pathname = usePathname();
  const sortState = useRestaurantSort('Specials');
  const { sort, origin } = sortState;
  const pages = useGuidePages<ScheduledRestaurantOffer>({ region: regionSlug, view: 'discounts', section: upcoming ? 'next' : 'available', neighborhood, sort, origin }, initialPages);
  const sectionId = upcoming ? 'next-specials' : 'available-now';
  const mapParams = new URLSearchParams({ show: 'restaurants', fit: 'results', past: 'all', future: 'all', specials: JSON.stringify(pages.ids), returnTo: `${pathname}#${sectionId}` });
  if (pages.bounds) mapParams.set('bounds', pages.bounds);
  const nextTime = (startsAt: string) => new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(startsAt));
  return <section id={sectionId} className={styles.offers} aria-labelledby={`${sectionId}-title`}>
    <div className={styles.browseHeading}>
      <div><p className={styles.eyebrow}>GOOD FOOD. BETTER PRICES.</p><h2 id={`${sectionId}-title`}>{upcoming ? 'Next specials at highly rated restaurants' : 'Discounted menus available now'}</h2></div>
      {pages.total > 0 && <RestaurantControls state={sortState} label="specials" mapHref={`/map?${mapParams}`} lunch={!upcoming} />}
    </div>
    <p className={styles.offerIntro}>Happy hours, daily specials, and limited offers during published service hours in {city}. Times follow the restaurant’s local clock.</p>
    <p className={styles.results} role="status">{!pages.ready ? 'Loading…' : upcoming ? `${pages.total} upcoming ${pages.total === 1 ? 'special' : 'specials'}.` : `${pages.total} ${pages.total === 1 ? 'offer' : 'offers'} available now`}</p>
    {upcoming && pages.total > 0 && <p className={styles.offerIntro}>Rated {HIGH_REVIEW_SCORE}/5 or higher from at least {HIGH_REVIEW_COUNT} reviews. Each restaurant’s next special is shown.</p>}
    {pages.total > 0 && <RestaurantSortNote state={sortState} />}
    {sortState.sort === 'lunch' && pages.total > 0 && <p className={styles.offerSortNote}>Lunch specials first. Each group is ordered by rating.</p>}
    {pages.total ? <PagedCardGrid pages={pages}>{(offer) => <article key={offer.id} className={styles.card}>
      {offer.photo && <Link href={offer.restaurantHref} className={styles.photoLink} aria-label={`See ${offer.name}'s restaurant details`}>
        <Image src={offer.photo.src} alt={offer.photo.alt} fill unoptimized className={styles.cardImage} />
        <span className={styles.imageNote}>{offer.photo.credit}</span>
      </Link>}
      <div className={styles.cardBody}>
        <div className={styles.offerStatus}><span>{upcoming ? 'Up next' : 'Available now'}</span><strong>{offer.startsAt ? <time dateTime={offer.startsAt}>Starts {nextTime(offer.startsAt)}</time> : `Until ${offerEndLabel(offer.end)}`}</strong></div>
        <p className={styles.cardMeta}>{offer.neighborhood}</p>
        {origin && restaurantOfferDistance(offer, origin) != null ? <p className={styles.offerDistance} title="Approximate straight-line distance">{formatDistance(restaurantOfferDistance(offer, origin)!, usesImperial())} {origin.source !== 'device' && origin.name ? `from ${origin.name}` : 'away'}</p> : sort === 'distance' ? <p className={styles.offerDistance}>Distance unavailable</p> : null}
        <h3><Link href={offer.restaurantHref}>{offer.name}</Link></h3>
        {offer.review && <p className={styles.offerReview}><Anchor href={offer.review.sourceUrl} target="_blank" rel="noopener noreferrer">★ {offer.review.score.toFixed(1)}/5 · {offer.review.count.toLocaleString('en-US')} {offer.review.provider} reviews ↗</Anchor><small>Rating checked {offer.review.checkedAt}</small></p>}
        <h4 className={styles.offerTitle}>{offer.special.title}</h4>
        {offer.special.description && <p className={styles.cardDescription}>{offer.special.description}</p>}
        <RestaurantOfferMenu menu={offer.menu} restaurant={offer.name} />
        <p className={styles.offerSchedule}>{offer.special.schedule}</p>
        {offer.special.conditions?.length ? <ul className={styles.offerConditions}>{offer.special.conditions.map((condition) => <li key={condition}>{condition}</li>)}</ul> : null}
        {offer.menu?.note && <p className={styles.offerSchedule}>{offer.menu.note}</p>}
        <p className={styles.topAddress}>{offer.address}</p>
        <div className={styles.topLinks}><Anchor href={offer.special.sourceUrl} target="_blank" rel="noopener noreferrer">{upcoming ? 'View upcoming offer' : 'View offer at restaurant'} ↗</Anchor><Link href={offer.restaurantHref}>Restaurant details ↗</Link></div>
        <p className={styles.offerSchedule}>Menu checked {offer.checkedAt}</p>
      </div>
    </article>}</PagedCardGrid> : pages.ready ? <div className={styles.empty}><h3>{upcoming ? 'No upcoming specials at highly rated restaurants yet.' : 'No discounted menus available right now.'}</h3><p>{upcoming ? 'Try another neighborhood or check back for new offers.' : 'See the next published specials below.'}</p></div> : null}
    <p className={styles.offerIntro}>Offers follow published schedules; item availability can change. Order or redeem directly with the restaurant. Seating restrictions and extra charges are shown with each offer.</p>
  </section>;
}
