'use client';

import Anchor from '@/components/ui/Anchor';
import { useEffect, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import { Icon } from '@/components/ui/Icon';
import Link from '@/components/ui/Link';
import { openingGroup, type Restaurant, type OpeningGroup, type TopRestaurant } from '@/lib/restaurants';
import { pinPath } from '@/lib/seo';
import styles from './RestaurantGuide.module.css';

type Props = {
  restaurants: Restaurant[];
  topRestaurants: TopRestaurant[];
  region: { name: string; state: string; slug: string };
  today: string;
  previewSnapshot: boolean;
};

const VIEWS = [
  { key: 'all', label: 'All openings', hash: '#openings' },
  { key: 'upcoming', label: 'Coming soon', hash: '#upcoming' },
  { key: 'new', label: 'Just opened', hash: '#new' },
  { key: 'top', label: 'Top restaurants', hash: '#top-restaurants' },
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

export function RestaurantGuide({ restaurants, topRestaurants, region, today, previewSnapshot }: Props) {
  const hash = useSyncExternalStore(subscribeToHash, currentHash, serverHash);
  const status = VIEWS.find((view) => view.hash === hash)?.key ?? 'all';
  const [selectedNeighborhood, setNeighborhood] = useState('all');
  const active = restaurants.filter((restaurant) => openingGroup(restaurant, today));
  const upcoming = active.filter((restaurant) => openingGroup(restaurant, today) === 'upcoming').sort((a, b) => a.day.localeCompare(b.day));
  const recent = active.filter((restaurant) => openingGroup(restaurant, today) === 'new').sort((a, b) => b.day.localeCompare(a.day));
  const top = status === 'top';
  const neighborhoods = [...new Set((top ? topRestaurants : status === 'all' ? [...active, ...topRestaurants] : active).map((restaurant) => restaurant.neighborhood))].sort();
  const neighborhood = neighborhoods.includes(selectedNeighborhood) ? selectedNeighborhood : 'all';
  const featured = recent.find((restaurant) => restaurant.id === 6434 && restaurant.image) ?? recent.find((restaurant) => restaurant.image) ?? upcoming.find((restaurant) => restaurant.image);
  const matches = (restaurant: Pick<Restaurant, 'neighborhood'>) => neighborhood === 'all' || restaurant.neighborhood === neighborhood;
  const shownUpcoming = status === 'new' || top ? [] : upcoming.filter(matches);
  const shownRecent = status === 'upcoming' || top ? [] : recent.filter(matches);
  const shownTop = topRestaurants.filter(matches);
  const shown = top ? shownTop.length : shownUpcoming.length + shownRecent.length;
  const href = (restaurant: Restaurant) => pinPath(restaurant);
  const mapIds = [...new Set([...active.map((restaurant) => restaurant.id), ...topRestaurants.map((restaurant) => restaurant.pinId)])];
  const mapHref = `/map?fit=results&past=all&future=all&q=${encodeURIComponent(mapIds.length ? `pin:${mapIds.join(',')}` : `place:"${region.name}" tag:"Restaurant"`)}`;
  const reset = () => { setNeighborhood('all'); window.location.hash = 'openings'; };

  useEffect(() => {
    if (!VIEWS.some((view) => view.hash === hash)) return;
    // A filtered section may only mount after the hash selects its view.
    const frame = requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' }));
    return () => cancelAnimationFrame(frame);
  }, [hash]);

  return (
    <main className={styles.guide} lang="en">
      <div className={styles.container}>
        <nav className={styles.guideNav} aria-label="Restaurant guide">
          <Link href="/restaurants" className={styles.wordmark}><span aria-hidden="true">✳</span> The opening guide</Link>
          <span className={styles.region}><span aria-hidden="true">↗</span> {region.name}, {region.state}</span>
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
          <Anchor href="#upcoming" onClick={() => setNeighborhood('all')}><strong>{upcoming.length.toString().padStart(2, '0')}</strong><span>Upcoming openings <span aria-hidden="true">↗</span></span></Anchor>
          <Anchor href="#new" onClick={() => setNeighborhood('all')}><strong>{recent.length.toString().padStart(2, '0')}</strong><span>New in the last 90 days <span aria-hidden="true">↗</span></span></Anchor>
          <Anchor href={mapHref} className={styles.mapLink}><span aria-hidden="true">⌖</span><span>Find your next stop<br /><strong>Explore the map ↗</strong></span></Anchor>
        </div>

        <section id="openings" className={styles.openings} aria-label="Browse restaurant openings">
          <div className={styles.browseHeading}><div><p className={styles.eyebrow}>THE LOCAL LINEUP</p><h2>{top ? 'Great tables, already here.' : 'Something new on the menu.'}</h2></div><span>{region.name} edition</span></div>
          <div className={styles.filters}>
            <nav className={styles.statusFilters} aria-label="Restaurant view">
              {VIEWS.map((item) => <Anchor key={item.key} href={item.hash} aria-current={status === item.key ? 'location' : undefined} onClick={() => { if ((item.key === 'top') !== top) setNeighborhood('all'); }}>{item.label}</Anchor>)}
            </nav>
            <div className={styles.filterFields}>
              <label className={styles.neighborhoodField}><span className="sr-only">Neighborhood</span><select aria-label="Neighborhood" value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)}><option value="all">All neighborhoods</option>{neighborhoods.map((name) => <option key={name} value={name}>{name}</option>)}</select><Icon name="chevron" className={styles.selectChevron} /></label>
            </div>
          </div>
          <p className={styles.results} aria-live="polite">{shown} {top ? (shown === 1 ? 'restaurant' : 'restaurants') : (shown === 1 ? 'opening' : 'openings')} to explore{neighborhood !== 'all' ? ` in ${neighborhood}` : ''}</p>
          {!shown ? <div className={styles.empty}><h3>{top ? 'No top restaurants match those filters.' : active.length ? 'No openings match those filters.' : 'The next opening is still on its way.'}</h3><p>{top || active.length ? 'Try another neighborhood.' : 'Check back for newly announced restaurants in this region.'}</p>{(top || active.length > 0) && <button type="button" onClick={top ? () => { setNeighborhood('all'); } : reset}>Clear filters ↗</button>}</div> : top ? <TopRestaurantSection restaurants={shownTop} /> : (
            <>
              {status !== 'new' && <OpeningSection id="upcoming" title="On the horizon" subtitle="Announced openings worth keeping an eye on." restaurants={shownUpcoming} group="upcoming" today={today} href={href} />}
              {status !== 'upcoming' && <OpeningSection id="new" title="Freshly opened" subtitle="New tables, new flavors. Opened within the last 90 days." restaurants={shownRecent} group="new" today={today} href={href} />}
            </>
          )}
          {status === 'all' && shownTop.length > 0 && <TopRestaurantSection restaurants={shownTop} />}
        </section>

        <aside className={styles.editorialNote}><span aria-hidden="true">✳</span><div><h2>A date is a starting point.</h2><p>Opening plans can change. Month and season dates are estimates, and a passed estimate never means a restaurant is confirmed open. Each pin links to the reporting behind it—check the latest details before making plans.</p>{previewSnapshot && <p className={styles.previewNote}>Local preview: published San Diego pins from October 6, 2026.</p>}</div><Anchor href="#openings" onClick={() => setNeighborhood('all')}>Back to openings ↗</Anchor></aside>
      </div>
    </main>
  );
}

function TopRestaurantSection({ restaurants }: { restaurants: TopRestaurant[] }) {
  return <section id="top-restaurants" className={styles.section} aria-labelledby="top-restaurants-title">
    <div className={styles.sectionHeading}><div><h2 id="top-restaurants-title">Top restaurants <span>{restaurants.length.toString().padStart(2, '0')}</span></h2><p>Established favorites for your next meal.</p></div><span className={styles.sectionSymbol} aria-hidden="true">✳</span></div>
    <p className={styles.topNote}>A curated selection from the MICHELIN Guide, covering starred dining, Bib Gourmand value picks, and selected restaurants. Each card links to its recognition. Dollar signs are the guide’s price ranges. Checked {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${restaurants[0].checkedAt}T00:00:00Z`))}.</p>
    <div className={styles.cardGrid}>{restaurants.map((restaurant) => (
      <article key={restaurant.slug} className={styles.card}>
        <Link href={pinPath({ id: restaurant.pinId, title: restaurant.pinTitle })} className={styles.photoLink} aria-label={`See ${restaurant.name}'s restaurant details`}>
          <Image src={restaurant.image} alt={restaurant.name} fill sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 33vw" className={styles.cardImage} />
          <span className={`${styles.cardBadge} ${styles.openBadge}`}>{restaurant.recognition}</span>
          <span className={styles.imageNote}>{restaurant.imageCredit}</span>
        </Link>
        <div className={styles.cardBody}>
          <p className={styles.cardMeta}>{restaurant.neighborhood}<span aria-hidden="true">·</span>{restaurant.cuisine}<span aria-hidden="true">·</span><span aria-label={`MICHELIN price range ${restaurant.priceRange.length} of 4`}>{restaurant.priceRange}</span></p>
          <h3><Link href={pinPath({ id: restaurant.pinId, title: restaurant.pinTitle })}>{restaurant.name}</Link></h3>
          <p className={styles.cardDescription}>{restaurant.description}</p>
          <p className={styles.topAddress}>{restaurant.address}</p>
          <div className={styles.topLinks}><Link href={pinPath({ id: restaurant.pinId, title: restaurant.pinTitle })}>View restaurant ↗</Link><Anchor href={restaurant.websiteUrl} target="_blank" rel="noopener noreferrer">Visit website ↗</Anchor></div>
        </div>
      </article>
    ))}</div>
  </section>;
}

function OpeningSection({ id, title, subtitle, restaurants, group, today, href }: { id: string; title: string; subtitle: string; restaurants: Restaurant[]; group: OpeningGroup; today: string; href: (restaurant: Restaurant) => string }) {
  return <section id={id} className={styles.section} aria-labelledby={`${id}-title`}>
    <div className={styles.sectionHeading}><div><h2 id={`${id}-title`}>{title} <span>{restaurants.length.toString().padStart(2, '0')}</span></h2><p>{subtitle}</p></div><span className={styles.sectionSymbol} aria-hidden="true">{group === 'new' ? '↗' : '✳'}</span></div>
    {restaurants.length ? <div className={styles.cardGrid}>{restaurants.map((restaurant) => (
      <article key={restaurant.id} className={styles.card}>
        <Link href={href(restaurant)} className={styles.photoLink} aria-label={`See ${restaurant.name}'s opening details`}>
          {restaurant.image ? <Image src={restaurant.image} alt={`${restaurant.name} · ${restaurant.imageNote ?? 'restaurant photo'}`} fill sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 33vw" className={styles.cardImage} /> : <div className={styles.photoPlaceholder}><span aria-hidden="true">✳</span></div>}
          <span className={`${styles.cardBadge} ${group === 'new' ? styles.openBadge : ''}`}>{group === 'new' ? 'JUST OPENED' : restaurant.day <= today ? 'AWAITING UPDATE' : 'COMING SOON'}</span>
          {restaurant.imageNote && <span className={styles.imageNote}>{restaurant.imageNote}</span>}
        </Link>
        <div className={styles.cardBody}>
          <p className={styles.cardMeta}>{restaurant.neighborhood}<span aria-hidden="true">·</span>{restaurant.cuisine}</p>
          <h3><Link href={href(restaurant)}>{restaurant.name}</Link></h3>
          <p className={styles.cardDescription}>{restaurant.description}</p>
          <div className={styles.cardFoot}><div><span>{group === 'new' ? 'OPENED' : restaurant.day <= today ? 'LAST ANNOUNCED TARGET' : 'EXPECTED OPENING'}</span><strong><time dateTime={restaurant.day}>{restaurant.dateLabel}</time>{restaurant.estimated && <small>Estimated</small>}</strong></div><Link href={href(restaurant)} aria-label={`Read about ${restaurant.name}`} className={styles.cardArrow}>↗</Link></div>
        </div>
      </article>
    ))}</div> : <p className={styles.sectionEmpty}>No {group === 'new' ? 'recent' : 'upcoming'} openings match this selection.</p>}
  </section>;
}
