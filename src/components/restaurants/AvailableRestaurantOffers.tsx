'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import Anchor from '@/components/ui/Anchor';
import Link from '@/components/ui/Link';
import { Icon } from '@/components/ui/Icon';
import { usePathname } from '@/lib/client/navigation';
import { HIGH_REVIEW_COUNT, HIGH_REVIEW_SCORE, restaurantOffersToShow, restaurantOfferDistance, offerEndLabel, type RestaurantOffer, type RestaurantOfferSort } from '@/lib/restaurantOffers';
import { formatDistance } from '@/lib/distance';
import { usesImperial } from '@/lib/weather';
import { viewerPlace, type ViewerPlace } from '@/lib/client/viewerPlace';
import styles from './RestaurantGuide.module.css';

export function AvailableRestaurantOffers({ offers, timeZone, now, city }: { offers: RestaurantOffer[]; timeZone: string; now: string; city: string }) {
  const pathname = usePathname();
  const [sort, setSort] = useState<RestaurantOfferSort>('rating');
  const [origin, setOrigin] = useState<ViewerPlace>();
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const request = useRef(0);
  useEffect(() => {
    const pendingRequests = request;
    const id = pendingRequests.current;
    // Reuse the location available to other pin cards without prompting.
    void viewerPlace().then((place) => {
      if (place && id === pendingRequests.current) setOrigin(place);
    }).catch(() => {});
    return () => { pendingRequests.current++; };
  }, []);
  const selectSort = (value: RestaurantOfferSort) => {
    const id = ++request.current;
    setLocationError('');
    setLocating(false);
    if (value === 'rating' || origin?.source === 'device') {
      setSort(value);
      return;
    }
    if (!navigator.geolocation) {
      setLocationError('Location is unavailable in this browser. Specials are sorted by rating.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      if (id !== request.current) return;
      setOrigin({ latitude: coords.latitude, longitude: coords.longitude, source: 'device' });
      setSort('distance');
      setLocating(false);
    }, (error) => {
      if (id !== request.current) return;
      setLocating(false);
      setLocationError(error.code === 1 ? 'Allow location access in your browser to sort by distance. Specials are sorted by rating.' : 'Couldn’t find your location. Try distance again. Specials are sorted by rating.');
    }, { maximumAge: 5 * 60 * 1000, timeout: 10000 });
  };
  const date = new Date(now);
  const { upcoming, offers: shown } = restaurantOffersToShow(offers, date, timeZone, { sort, origin });
  const mapParams = new URLSearchParams({ show: 'restaurants', fit: 'results', past: 'all', future: 'all', specials: JSON.stringify(shown.map((offer) => offer.id)), returnTo: `${pathname}#available-now` });
  const locations = shown.flatMap((offer) => {
    const place = offer.location;
    return place && Number.isFinite(place.latitude) && Math.abs(place.latitude) <= 90 && Number.isFinite(place.longitude) && Math.abs(place.longitude) <= 180 ? [place] : [];
  });
  if (locations.length) mapParams.set('bounds', [Math.min(...locations.map((place) => place.latitude)), Math.min(...locations.map((place) => place.longitude)), Math.max(...locations.map((place) => place.latitude)), Math.max(...locations.map((place) => place.longitude))].join(','));
  const nextTime = (startsAt: string) => new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(startsAt));
  return <section id="available-now" className={styles.offers} aria-labelledby="available-now-title">
    <div className={styles.browseHeading}>
      <div><p className={styles.eyebrow}>GOOD FOOD. BETTER PRICES.</p><h2 id="available-now-title">{upcoming ? 'Next specials at highly rated restaurants' : 'Discounted menus available now'}</h2></div>
      {shown.length > 0 && <div className={styles.offerSort}>
        <div role="group" aria-label="Sort specials"><span>Sort by</span><button type="button" aria-pressed={sort === 'rating'} onClick={() => selectSort('rating')}>Rating</button><button type="button" aria-pressed={sort === 'distance'} disabled={locating} onClick={() => selectSort('distance')}>Distance</button></div>
        <Link href={`/map?${mapParams}`} className={styles.offerMapButton} prefetch={false}><Icon name="map" />Map</Link>
      </div>}
    </div>
    <p className={styles.offerIntro}>Happy hours, daily specials, and limited offers during published service hours in {city}. Times follow the restaurant’s local clock.</p>
    <p className={styles.results} role="status">{upcoming ? `No offers available now. ${shown.length} upcoming ${shown.length === 1 ? 'special' : 'specials'}.` : `${shown.length} ${shown.length === 1 ? 'offer' : 'offers'} available now`}</p>
    {upcoming && shown.length > 0 && <p className={styles.offerIntro}>Rated {HIGH_REVIEW_SCORE}/5 or higher from at least {HIGH_REVIEW_COUNT} reviews. Each restaurant’s next special is shown.</p>}
    {shown.length > 0 && (locating || locationError || sort === 'distance') && <p className={styles.offerSortNote} role="status">{locating ? 'Finding your location…' : locationError || 'Nearest first · Approximate straight-line distance from your location. Unknown distances shown last.'}</p>}
    {shown.length ? <div className={styles.cardGrid}>{shown.map((offer) => <article key={offer.id} className={styles.card}>
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
        <p className={styles.cardDescription}>{offer.special.description}</p>
        {offer.menu?.items.length ? <ul className={styles.offerMenu}>{offer.menu.items.map((item, index) => <li key={`${item.name}-${index}`}><span>{item.name}{item.note && <small>{item.note}</small>}</span><strong>{item.priceLabel ?? (item.price != null ? `$${item.price}` : 'Ask restaurant')}</strong></li>)}</ul> : null}
        <p className={styles.offerSchedule}>{offer.special.schedule}</p>
        {offer.special.conditions?.length ? <ul className={styles.offerConditions}>{offer.special.conditions.map((condition) => <li key={condition}>{condition}</li>)}</ul> : null}
        {offer.menu?.note && <p className={styles.offerSchedule}>{offer.menu.note}</p>}
        <p className={styles.topAddress}>{offer.address}</p>
        <div className={styles.topLinks}><Anchor href={offer.special.sourceUrl} target="_blank" rel="noopener noreferrer">{upcoming ? 'View upcoming offer' : 'View offer at restaurant'} ↗</Anchor><Link href={offer.restaurantHref}>Restaurant details ↗</Link></div>
        <p className={styles.offerSchedule}>Menu checked {offer.checkedAt}</p>
      </div>
    </article>)}</div> : <div className={styles.empty}><h3>No upcoming specials at highly rated restaurants yet.</h3><p>We’re looking for more published specials in this area. Try another neighborhood or check back for new offers.</p></div>}
    <p className={styles.offerIntro}>Offers follow published schedules; item availability can change. Order or redeem directly with the restaurant. Seating restrictions and extra charges are shown with each offer.</p>
  </section>;
}
