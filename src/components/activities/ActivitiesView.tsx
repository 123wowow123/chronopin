'use client';

import { useEffect, useMemo, useState } from 'react';
import { JsonLd } from '@/components/JsonLd';
import Link from '@/components/ui/Link';
import { LandingMark } from '@/components/ui/LandingMark';
import { CardImage } from '@/components/pin/CardImage';
import { useRouter } from '@/lib/client/navigation';
import { viewerPlace } from '@/lib/client/viewerPlace';
import { distanceKm, formatDistance } from '@/lib/distance';
import { pinTextDir } from '@/lib/i18n/config';
import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_CATEGORY_LABELS,
  ACTIVITY_CITIES,
  ACTIVITY_RADII_KM,
  DEFAULT_ACTIVITY_RADIUS_KM,
  SEASONS,
  SEASON_LABELS,
  TRIP_LABELS,
  activityCity,
  activitiesNearCity,
  activitiesForTrip,
  nearestActivityCity,
  formatWindow,
  isActiveOn,
  localDay,
  seasonOfMonth,
  windowEnd,
  windowStart,
  type ActivityCategoryId,
  type ActivityTripTab,
  type Season,
} from '@/lib/activities';
import { absoluteUrl, pinPath } from '@/lib/seo';
import type { ActivityPin } from '@/server/services/activities';
import styles from '@/components/restaurants/RestaurantGuide.module.css';

type Tab = 'today' | Season | ActivityTripTab;

// Within this distance of a guide city the viewer is "in" it.
const LOCAL_KM = 100;
const STAY_KEY = 'activities-stay-all-cities';

function picture(media: ActivityPin['media']) {
  const medium = media?.find((m) => String(m.type) === '1' && m.thumbName) ?? media?.find((m) => m.thumbName) ?? media?.[0];
  return { thumbName: medium?.thumbName, originalUrl: medium?.originalUrl ?? undefined };
}

function longDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function stayOnAllCities() {
  try { sessionStorage.setItem(STAY_KEY, '1'); } catch { /* storage blocked */ }
}

// Prompts for the device's position where permission is still undecided.
// Prior refusals are left alone.
async function askDevicePosition(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    if (!navigator.geolocation) return null;
    if ((await navigator.permissions.query({ name: 'geolocation' })).state !== 'prompt') return null;
    const coords = await new Promise<GeolocationCoordinates>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition((p) => resolve(p.coords), reject, { maximumAge: 15 * 60 * 1000, timeout: 15000 }),
    );
    // Rounded to about a kilometre, as viewerPlace does.
    return { latitude: Math.round(coords.latitude * 100) / 100, longitude: Math.round(coords.longitude * 100) / 100 };
  } catch {
    return null;
  }
}

export function ActivitiesView({
  pins,
  cityFilter,
  serverNow,
  title,
  description,
  path,
}: {
  pins: ActivityPin[];
  cityFilter: string | null;
  serverNow: string;
  title: string;
  description: string;
  path: string;
}) {
  // Start from the server's clock so hydration matches, then follow the viewer's.
  const [now, setNow] = useState(() => new Date(serverNow));
  useEffect(() => {
    const id = setTimeout(() => setNow(new Date()), 0);
    return () => clearTimeout(id);
  }, []);

  const router = useRouter();
  const cityTabSlugs = useMemo(() => new Set(pins.map((p) => p.activity.citySlug)), [pins]);
  // Landing on the all-cities page opens the viewer's own city when there is a
  // guide for it, every visit. Choosing "All cities" in the nav sets STAY_KEY,
  // which skips the redirect for that one visit.
  useEffect(() => {
    if (cityFilter) return;
    try {
      if (sessionStorage.getItem(STAY_KEY)) {
        sessionStorage.removeItem(STAY_KEY);
        return;
      }
    } catch {
      return;
    }
    let active = true;
    const open = (place: { latitude: number; longitude: number } | null) => {
      if (!active || !place) return;
      const near = nearestActivityCity(place);
      if (cityTabSlugs.has(near.slug) && distanceKm(place, near) <= LOCAL_KM) router.replace(`/activities/${near.slug}`);
    };
    viewerPlace().then(async (place) => {
      // With no device position yet, ask for it once: the
      // browser remembers the answer, and a refusal falls back to the
      // account or time-zone place as before.
      if (place?.source !== 'device') {
        const device = await askDevicePosition();
        if (device) return open(device);
      }
      open(place);
    }).catch(() => {});
    return () => { active = false; };
  }, [cityFilter, cityTabSlugs, router]);

  const city = cityFilter ? activityCity(cityFilter) : undefined;
  const [radiusKm, setRadiusKm] = useState<number>(DEFAULT_ACTIVITY_RADIUS_KM);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'season' | 'nearest' | 'name'>('season');
  const scoped = useMemo(() => city ? activitiesNearCity(pins, city, radiusKm) : pins, [pins, city, radiusKm]);
  const searched = useMemo(() => {
    const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return scoped.filter(({ activity: a }) => {
      const text = [a.name, a.venue, a.neighborhood, a.description, activityCity(a.citySlug)?.name, ACTIVITY_CATEGORY_LABELS[a.category]].join(' ').toLowerCase();
      return words.every((word) => text.includes(word));
    });
  }, [scoped, search]);

  const todayIn = (pin: ActivityPin) => localDay(now, activityCity(pin.activity.citySlug)?.timeZone ?? 'America/New_York');
  const today = useMemo(() => localDay(now, city?.timeZone ?? 'America/New_York'), [now, city]);
  const currentSeason = seasonOfMonth(today.month);

  const active = useMemo(
    () =>
      searched
        .filter((p) => isActiveOn(p.activity, todayIn(p)))
        .sort((a, b) => {
          const endA = windowEnd(a.activity, windowStart(a.activity, todayIn(a)));
          const endB = windowEnd(b.activity, windowStart(b.activity, todayIn(b)));
          return endA.localeCompare(endB) || a.activity.name.localeCompare(b.activity.name);
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searched, now],
  );

  const bySeason = useMemo(() => {
    const map = new Map<Season, ActivityPin[]>();
    for (const season of SEASONS) map.set(season, searched.filter((p) => p.activity.seasons.includes(season)));
    return map;
  }, [searched]);

  const trips = useMemo(() => ({
    'day-trips': activitiesForTrip(searched, 1),
    'two-day-trips': activitiesForTrip(searched, 2),
  }), [searched]);

  const allTabs: { id: Tab; label: string; count: number }[] = [
    { id: 'today', label: 'Today', count: active.length },
    { id: 'day-trips', label: TRIP_LABELS['day-trips'], count: trips['day-trips'].length },
    { id: 'two-day-trips', label: TRIP_LABELS['two-day-trips'], count: trips['two-day-trips'].length },
    ...SEASONS.map((season): { id: Tab; label: string; count: number } => ({ id: season, label: SEASON_LABELS[season], count: bySeason.get(season)!.length })),
  ];
  const tabs = allTabs.filter((tab) => tab.count > 0);

  const [requested, setRequested] = useState<Tab>('today');
  // Hidden or empty tabs fall back to a populated view.
  const tab: Tab = tabs.some((t) => t.id === requested) ? requested : (tabs[0]?.id ?? 'today');
  const [category, setCategory] = useState<ActivityCategoryId | 'all'>('all');

  const tripTab = tab === 'day-trips' || tab === 'two-day-trips' ? tab : null;
  const base = tab === 'today' ? active : tripTab ? trips[tripTab] : (bySeason.get(tab as Season) ?? []);
  const categories = ACTIVITY_CATEGORIES.filter((id) => base.some((p) => p.activity.category === id));
  const effectiveCategory = category !== 'all' && categories.includes(category) ? category : 'all';
  const shown = (effectiveCategory === 'all' ? [...base] : base.filter((p) => p.activity.category === effectiveCategory)).sort((a, b) => {
    if (sort === 'nearest' && city) return distanceKm(city, a.activity) - distanceKm(city, b.activity) || a.activity.name.localeCompare(b.activity.name);
    if (sort === 'name') return a.activity.name.localeCompare(b.activity.name);
    return 0;
  });

  const cityTabs = ACTIVITY_CITIES.filter((c) => pins.some((p) => p.activity.citySlug === c.slug));
  const placeName = city ? `and around ${city.name}` : 'major US cities';

  const collection = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url: absoluteUrl(path),
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: scoped.length,
      itemListElement: scoped.map((pin, index) => ({ '@type': 'ListItem', position: index + 1, url: absoluteUrl(pinPath(pin)), name: pin.productName ?? pin.title })),
    },
  };

  return (
    <main className={styles.guide} data-landing>
      <LandingMark />
      <JsonLd data={collection} />
      <div className={styles.container}>
        <div className={styles.guideNav}>
          <Link href="/activities" className={styles.wordmark}>
            <span aria-hidden="true">✳</span> The activities guide
          </Link>
          <nav className={styles.countryNav} aria-label="Activities guide">
            <Link href="/activities" aria-current="location">United States</Link>
          </nav>
        </div>

        <nav className={styles.cityNav} aria-label="Activities guide cities">
          <Link href="/activities" aria-current={city ? undefined : 'page'} onClick={city ? stayOnAllCities : undefined}>All cities</Link>
          {cityTabs.map((c) => (
            <Link key={c.slug} href={`/activities/${c.slug}`} aria-current={city?.slug === c.slug ? 'page' : undefined}>
              {c.name}
            </Link>
          ))}
        </nav>

        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>WHAT TO DO. WHEN TO DO IT.</p>
            <h1>
              {city ? <>Seasonal things to do in and around <em>{city.name}.</em></> : <>The season&rsquo;s best things to do, <em>city by city.</em></>}
            </h1>
            <p className={styles.lead}>{description}</p>
          </div>
        </header>

        <section id="activities" aria-label="Browse activities">
          <div className="mb-6 flex flex-wrap items-end gap-4 rounded-lg border border-[var(--rule)] p-4">
            <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs font-semibold">
              Search activities
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Try hiking, museums, or a nearby town" className="rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--text)]" />
            </label>
            {city && (
              <label className="flex flex-col gap-1 text-xs font-semibold">
                Distance from {city.name}
                <select value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))} className="rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--text)]">
                  {ACTIVITY_RADII_KM.map((km) => <option key={km} value={km}>Within {formatDistance(km, true)} / {km} km</option>)}
                </select>
              </label>
            )}
            <label className="flex flex-col gap-1 text-xs font-semibold">
              Sort by
              <select value={sort === 'nearest' && !city ? 'season' : sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--text)]">
                <option value="season">Seasonal order</option>
                {city && <option value="nearest">Nearest first</option>}
                <option value="name">Name A–Z</option>
              </select>
            </label>
          </div>
          <div className={styles.filters}>
            <nav className={styles.statusFilters} aria-label="Activity sections">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setRequested(t.id)}
                  aria-current={tab === t.id ? 'location' : undefined}
                >
                  {t.label} <span>· {String(t.count).padStart(2, '0')}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className={`${styles.sectionHeading} mt-8 mb-4`}>
            <div>
              <h2 className="font-serif text-2xl font-normal text-[var(--text)]">
                {tab === 'today'
                  ? `In season today in ${placeName}`
                  : `${tripTab ? TRIP_LABELS[tripTab] : SEASON_LABELS[tab as Season]} in ${placeName}`}
              </h2>
              <p className="mt-1 text-sm text-[var(--soft)]">
                {tab === 'today'
                  ? `${longDate(today.iso)} · ${SEASON_LABELS[currentSeason]}. Seasonal windows; check the organizer for opening hours and exact dates.`
                  : tripTab === 'day-trips'
                    ? 'Ideas for a full day out, across all seasons. Trip lengths are suggestions; check seasonal dates, opening hours and transport before setting off.'
                    : tripTab === 'two-day-trips'
                      ? 'Destinations for a two-day getaway with one overnight stay, across all seasons. Suggested trip lengths; arrange accommodation and transport separately and check seasonal availability.'
                      : `Everything that runs in ${SEASON_LABELS[tab as Season].toLowerCase()}, with the season window from each organizer.`}
              </p>
              <p className="mt-2 text-xs text-[var(--soft)]" role="status">
                {shown.length} {shown.length === 1 ? 'activity' : 'activities'}{city ? ` within ${formatDistance(radiusKm, true)} (${radiusKm} km) of the city center · straight-line distances` : ' across all cities'}
              </p>
            </div>
          </div>

          {categories.length > 1 && (
            <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Activity type">
              {(['all', ...categories] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCategory(id)}
                  aria-pressed={effectiveCategory === id}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                    effectiveCategory === id ? 'bg-[var(--green)] text-[var(--paper)]' : 'border border-[var(--rule)] bg-[var(--paper)] text-[var(--text)] hover:border-[var(--green)]'
                  }`}
                >
                  {id === 'all' ? 'All types' : ACTIVITY_CATEGORY_LABELS[id]}
                </button>
              ))}
            </div>
          )}

          {shown.length === 0 ? (
            <div className="py-10 text-sm text-[var(--soft)]">
              <p>No activities match these filters. Try another search{city ? ' or a wider radius' : ''}.</p>
              <button type="button" className="mt-3 underline" onClick={() => { setSearch(''); setCategory('all'); setRadiusKm(DEFAULT_ACTIVITY_RADIUS_KM); setRequested('today'); }}>Reset filters</button>
            </div>
          ) : (
            <div className={styles.cardGrid}>
              {shown.map((pin) => {
                const a = pin.activity;
                const pic = picture(pin.media);
                const aCity = activityCity(a.citySlug);
                const dayHere = todayIn(pin);
                const running = isActiveOn(a, dayHere);
                const start = windowStart(a, dayHere);
                const end = windowEnd(a, start);
                return (
                  <article key={pin.id} className={styles.card} id={`activity-${pin.id}`}>
                    <Link href={pinPath(pin)} className={styles.photoLink} aria-label={`View ${a.name}`}>
                      {pic.thumbName || pic.originalUrl ? (
                        <CardImage thumbName={pic.thumbName} originalUrl={pic.originalUrl} alt={a.name} className={styles.cardImage} />
                      ) : (
                        <span className={styles.photoPlaceholder} aria-hidden="true">✳</span>
                      )}
                      <span className={`${styles.cardBadge} ${running ? styles.openBadge : ''}`}>
                        {running ? 'IN SEASON NOW' : `STARTS ${longDate(start).toUpperCase()}`}
                      </span>
                    </Link>
                    <div className={styles.cardBody}>
                      <p className={styles.cardMeta}>
                        <span>{aCity?.name ?? a.citySlug}</span>
                        <span>· {a.neighborhood}</span>
                        <span>· {ACTIVITY_CATEGORY_LABELS[a.category]}</span>
                        {city && <span>· {formatDistance(distanceKm(city, a), true)} / {formatDistance(distanceKm(city, a), false)} from {city.name}</span>}
                      </p>
                      <h3 dir={pinTextDir(pin)}>
                        <Link href={pinPath(pin)} className="text-[var(--text)] hover:text-[var(--green)]">{a.name}</Link>
                      </h3>
                      <p className={styles.cardDescription} dir={pinTextDir(pin)}>{a.description}</p>
                      {a.tripDays?.length ? (
                        <p className="mb-2 text-xs font-semibold text-[var(--green)]">
                          Suggested trip: {tripTab === 'two-day-trips' ? '2 days · 1 night' : tripTab === 'day-trips' ? '1 day' : a.tripDays.map((days) => days === 1 ? '1 day' : '2 days · 1 night').join(' or ')}
                        </p>
                      ) : null}
                      <p className="mb-3 text-[11px] text-[var(--soft)]">
                        {a.venue} · {a.startDate && a.endDate ? `${longDate(a.startDate)} – ${longDate(a.endDate)}` : formatWindow(a)}
                        {running ? ` · until ${longDate(end)}` : ''}
                        {a.dateConfidence === 'estimated' ? ' · typical season' : ''}
                      </p>
                      <div className={styles.cardFoot}>
                        <span className="text-[11px] font-semibold text-[var(--green)]">{a.costNote ?? 'See details'}</span>
                        <Link href={pinPath(pin)} className={styles.cardArrow} aria-label={`Details for ${a.name}`}>→</Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
