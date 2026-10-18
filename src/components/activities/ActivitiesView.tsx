'use client';

import { useEffect, useMemo, useState } from 'react';
import { JsonLd } from '@/components/JsonLd';
import Link from '@/components/ui/Link';
import { LandingMark } from '@/components/ui/LandingMark';
import { CardImage } from '@/components/pin/CardImage';
import { pinTextDir } from '@/lib/i18n/config';
import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_CATEGORY_LABELS,
  ACTIVITY_CITIES,
  SEASONS,
  SEASON_LABELS,
  activityCity,
  formatWindow,
  isActiveOn,
  localDay,
  seasonOfMonth,
  windowEnd,
  windowStart,
  type ActivityCategoryId,
  type Season,
} from '@/lib/activities';
import { absoluteUrl, pinPath } from '@/lib/seo';
import type { ActivityPin } from '@/server/services/activities';
import styles from '@/components/restaurants/RestaurantGuide.module.css';

type Tab = 'today' | Season;

function picture(media: ActivityPin['media']) {
  const medium = media?.find((m) => String(m.type) === '1' && m.thumbName) ?? media?.find((m) => m.thumbName) ?? media?.[0];
  return { thumbName: medium?.thumbName, originalUrl: medium?.originalUrl ?? undefined };
}

function longDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
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

  const city = cityFilter ? activityCity(cityFilter) : undefined;
  const scoped = useMemo(() => (city ? pins.filter((p) => p.activity.citySlug === city.slug) : pins), [pins, city]);

  const todayIn = (pin: ActivityPin) => localDay(now, activityCity(pin.activity.citySlug)?.timeZone ?? 'America/New_York');
  const today = useMemo(() => localDay(now, city?.timeZone ?? 'America/New_York'), [now, city]);
  const currentSeason = seasonOfMonth(today.month);

  const active = useMemo(
    () =>
      scoped
        .filter((p) => isActiveOn(p.activity, todayIn(p)))
        .sort((a, b) => {
          const endA = windowEnd(a.activity, windowStart(a.activity, todayIn(a)));
          const endB = windowEnd(b.activity, windowStart(b.activity, todayIn(b)));
          return endA.localeCompare(endB) || a.activity.name.localeCompare(b.activity.name);
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scoped, now],
  );

  const bySeason = useMemo(() => {
    const map = new Map<Season, ActivityPin[]>();
    for (const season of SEASONS) map.set(season, scoped.filter((p) => p.activity.seasons.includes(season)));
    return map;
  }, [scoped]);

  const allTabs: { id: Tab; label: string; count: number }[] = [
    { id: 'today', label: 'Today', count: active.length },
    ...SEASONS.map((season): { id: Tab; label: string; count: number } => ({ id: season, label: SEASON_LABELS[season], count: bySeason.get(season)!.length })),
  ];
  const tabs = allTabs.filter((tab) => tab.count > 0);

  const [requested, setRequested] = useState<Tab>('today');
  // Hidden or empty tabs fall back to a populated view.
  const tab: Tab = tabs.some((t) => t.id === requested) ? requested : (tabs[0]?.id ?? 'today');
  const [category, setCategory] = useState<ActivityCategoryId | 'all'>('all');

  const base = tab === 'today' ? active : (bySeason.get(tab) ?? []);
  const shown = category === 'all' ? base : base.filter((p) => p.activity.category === category);
  const categories = ACTIVITY_CATEGORIES.filter((id) => base.some((p) => p.activity.category === id));

  const cityTabs = ACTIVITY_CITIES.filter((c) => pins.some((p) => p.activity.citySlug === c.slug));
  const placeName = city ? city.name : 'major US cities';

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
          <nav className={styles.countryNav} aria-label="Cities">
            <Link href="/activities" aria-current={city ? undefined : 'page'} className="shrink-0 rounded px-2.5 py-1.5 font-semibold whitespace-nowrap aria-[current=page]:bg-[var(--text)] aria-[current=page]:text-[var(--paper)]">
              All cities
            </Link>
            {cityTabs.map((c) => (
              <Link
                key={c.slug}
                href={`/activities/${c.slug}`}
                aria-current={city?.slug === c.slug ? 'page' : undefined}
                className="shrink-0 rounded px-2.5 py-1.5 whitespace-nowrap text-[var(--soft)] aria-[current=page]:bg-[var(--text)] aria-[current=page]:text-[var(--paper)]"
              >
                {c.name}
              </Link>
            ))}
          </nav>
        </div>

        <header className="py-10">
          <p className={styles.eyebrow}>WHAT TO DO. WHEN TO DO IT.</p>
          <h1 className="font-serif text-4xl font-normal leading-tight text-[var(--text)]">
            {city ? <>Seasonal things to do in <em>{city.name}.</em></> : <>The season&rsquo;s best things to do, <em>city by city.</em></>}
          </h1>
          <p className={`${styles.lead} mt-4`}>{description}</p>
        </header>

        <section id="activities" aria-label="Browse activities">
          <div className={styles.filters}>
            <nav className={`${styles.statusFilters} flex items-center gap-1.5`} aria-label="Seasons">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setRequested(t.id)}
                  aria-current={tab === t.id ? 'location' : undefined}
                  className={`shrink-0 rounded px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                    tab === t.id ? 'bg-[var(--text)] text-[var(--paper)]' : 'text-[var(--soft)] hover:bg-[var(--rule)]'
                  }`}
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
                  ? `Happening today in ${placeName}`
                  : `${SEASON_LABELS[tab]} in ${placeName}`}
              </h2>
              <p className="mt-1 text-sm text-[var(--soft)]">
                {tab === 'today'
                  ? `${longDate(today.iso)} · ${SEASON_LABELS[currentSeason]}. Activities in season right now, ending soonest first.`
                  : `Everything that runs in ${SEASON_LABELS[tab].toLowerCase()}, with the season window from each organizer.`}
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
                  aria-pressed={category === id}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                    category === id ? 'bg-[var(--green)] text-[var(--paper)]' : 'border border-[var(--rule)] bg-[var(--paper)] text-[var(--text)] hover:border-[var(--green)]'
                  }`}
                >
                  {id === 'all' ? 'All types' : ACTIVITY_CATEGORY_LABELS[id]}
                </button>
              ))}
            </div>
          )}

          {shown.length === 0 ? (
            <p className="py-10 text-sm text-[var(--soft)]">No activities match yet.</p>
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
                      </p>
                      <h3 dir={pinTextDir(pin)}>
                        <Link href={pinPath(pin)} className="text-[var(--text)] hover:text-[var(--green)]">{a.name}</Link>
                      </h3>
                      <p className={styles.cardDescription} dir={pinTextDir(pin)}>{a.description}</p>
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
