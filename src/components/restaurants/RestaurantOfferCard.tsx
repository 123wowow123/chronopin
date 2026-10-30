'use client';

import { useId, useState, type KeyboardEvent } from 'react';
import Image from 'next/image';
import Anchor from '@/components/ui/Anchor';
import Link from '@/components/ui/Link';
import { CardLike } from '@/components/pin/CardLike';
import { deduplicateRestaurantOffers, restaurantOfferDistance, offerEndLabel, type ScheduledRestaurantOffer } from '@/lib/restaurantOffers';
import { formatDistance } from '@/lib/distance';
import type { ViewerPlace } from '@/lib/client/viewerPlace';
import type { RestaurantSort } from '@/lib/restaurantSort';
import { usesImperial } from '@/lib/weather';
import { RestaurantOfferMenu } from './RestaurantOfferMenu';
import styles from './RestaurantGuide.module.css';

const DRINKS = /drink|happy hour|cocktail|\bwine\b|\bbeer\b|\bsake\b|\bbar\b|beverage|spirits|highball/i;

export function RestaurantOfferCard({ card, origin, sort, timeZone }: { card: ScheduledRestaurantOffer; origin?: ViewerPlace; sort: RestaurantSort; timeZone: string }) {
  const id = useId();
  const [selected, setSelected] = useState<string | null>(null);
  // Food (lunch) menus lead the tabs, so they sit on the left and open selected; drinks go last, on the right.
  const rank = (offer: ScheduledRestaurantOffer) => offer.special.kind === 'lunch' ? 0 : DRINKS.test(`${offer.special.title}`) && !/\bfood\b/i.test(offer.special.title) ? 2 : 1;
  const offers = deduplicateRestaurantOffers(card.offers ?? [card]).sort((a, b) => rank(a) - rank(b));
  const offer = offers.find((item) => item.id === selected) ?? offers[0];
  const index = offers.indexOf(offer);
  const pinId = Number(/^\/pin\/(\d+)\//.exec(card.restaurantHref)?.[1]) || null;
  const upcoming = !!offer.startsAt;
  const distance = restaurantOfferDistance(card, origin);
  const nextTime = (startsAt: string) => new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(startsAt));
  const navigateTabs = (event: KeyboardEvent<HTMLButtonElement>, current: number) => {
    const target = event.key === 'ArrowRight' ? (current + 1) % offers.length
      : event.key === 'ArrowLeft' ? (current + offers.length - 1) % offers.length
      : event.key === 'Home' ? 0 : event.key === 'End' ? offers.length - 1 : null;
    if (target === null) return;
    event.preventDefault();
    setSelected(offers[target].id);
    event.currentTarget.parentElement?.querySelectorAll('button')[target]?.focus();
  };

  return <article className={styles.card}>
    {pinId ? <CardLike pin={{ id: pinId }} /> : null}
    <Link href={card.restaurantHref} className={styles.photoLink} aria-label={`See ${card.name}'s restaurant details`}>
      {card.photo ? (
        <>
          <Image src={card.photo.src} alt={card.photo.alt} fill unoptimized className={styles.cardImage} />
          <span className={styles.imageNote}>{card.photo.credit}</span>
        </>
      ) : (
        <span className={styles.photoPlaceholder} aria-hidden="true">✳</span>
      )}
    </Link>
    <div className={styles.cardBody}>
      <p className={styles.cardMeta}>{card.neighborhood}{card.kidsFriendly && <><span aria-hidden="true">·</span><span className={styles.kidsBadge}>Kids friendly</span></>}</p>
      {origin && distance != null ? <p className={styles.offerDistance} title="Approximate straight-line distance">{formatDistance(distance, usesImperial())} {origin.source !== 'device' && origin.name ? `from ${origin.name}` : 'away'}</p> : sort === 'distance' ? <p className={styles.offerDistance}>Distance unavailable</p> : null}
      <h3><Link href={card.restaurantHref}>{card.name}</Link></h3>
      {card.review && <p className={styles.offerReview}><Anchor href={card.review.sourceUrl} target="_blank" rel="noopener noreferrer">★ {card.review.score.toFixed(1)}/5 · {card.review.count.toLocaleString('en-US')} {card.review.provider} reviews ↗</Anchor><small>Rating checked {card.review.checkedAt}</small></p>}
      {offers.length > 1 && <div className={styles.offerTabs} role="tablist" aria-label={`${card.name} special offers`}>
        {offers.map((item, tabIndex) => <button key={item.id} id={`${id}-tab-${tabIndex}`} type="button" role="tab" aria-selected={item.id === offer.id} aria-controls={`${id}-panel`} tabIndex={item.id === offer.id ? 0 : -1} onClick={() => setSelected(item.id)} onKeyDown={(event) => navigateTabs(event, tabIndex)}>{item.special.title}</button>)}
      </div>}
      <div key={offer.id} id={`${id}-panel`} role={offers.length > 1 ? 'tabpanel' : undefined} aria-labelledby={offers.length > 1 ? `${id}-tab-${index}` : undefined} tabIndex={offers.length > 1 ? 0 : undefined} className={styles.offerPanel}>
        <h4 className={styles.offerTitle}>{offer.special.title}</h4>
        <div className={styles.offerStatus}><span>{upcoming ? 'Up next' : 'Available now'}</span><strong>{offer.startsAt ? <time dateTime={offer.startsAt}>Starts {nextTime(offer.startsAt)}</time> : `Until ${offerEndLabel(offer.end)}`}</strong></div>
        {offer.special.description && <p className={styles.cardDescription}>{offer.special.description}</p>}
        <RestaurantOfferMenu menu={offer.menu} restaurant={card.name} />
        <p className={styles.offerSchedule}>{offer.special.schedule}</p>
        {offer.special.conditions?.length ? <ul className={styles.offerConditions}>{offer.special.conditions.map((condition) => <li key={condition}>{condition}</li>)}</ul> : null}
        {offer.menu?.note && <p className={styles.offerSchedule}>{offer.menu.note}</p>}
        <p className={styles.topAddress}>{card.address}</p>
        <div className={styles.topLinks}><Anchor href={offer.special.sourceUrl} target="_blank" rel="noopener noreferrer">{upcoming ? 'View upcoming offer' : 'View offer at restaurant'} ↗</Anchor></div>
        <p className={styles.offerSchedule}>Menu checked {offer.checkedAt}</p>
      </div>
    </div>
  </article>;
}
