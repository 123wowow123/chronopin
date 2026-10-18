'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { JsonLd } from '@/components/JsonLd';
import { LandingMark } from '@/components/ui/LandingMark';
import { Icon } from '@/components/ui/Icon';
import Anchor from '@/components/ui/Anchor';
import Link from '@/components/ui/Link';
import {
  CONTINENTS,
  filterAndGroupMusicRankings,
  getAvailableYears,
  originOf,
  type MusicRankingEntry,
} from '@/lib/music';
import { useMusicPlayer } from './MusicPlayerContext';
import { AlbumTracklist } from './AlbumTracklist';
import { absoluteUrl, pinPath } from '@/lib/seo';
import styles from '@/components/restaurants/RestaurantGuide.module.css';

interface Props {
  initialRankings: MusicRankingEntry[];
  title: string;
  description: string;
  path?: string;
}

// One label per year the song ranked, best rank that year, newest first.
function yearLabels(song: MusicRankingEntry): { year: number; rank: number }[] {
  const best = new Map<number, number>();
  for (const c of [song, ...(song.alsoCharted ?? [])]) {
    best.set(c.year, Math.min(best.get(c.year) ?? Infinity, c.rank));
  }
  return [...best].map(([year, rank]) => ({ year, rank })).sort((a, b) => b.year - a.year);
}

export function MusicRankingView({
  initialRankings,
  title,
  description,
  path = '/music',
}: Props) {
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [selectedContinent, setSelectedContinent] = useState<string>('all');
  const [selectedCountryRaw, setSelectedCountry] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const continentNavRef = useRef<HTMLDivElement>(null);

  const { currentTrack, isPlaying, togglePlay, playbackMode, currentTime, pause, setPlaylist } =
    useMusicPlayer();

  // Persist the year / continent tabs in the URL hash (#year=2024&continent=Asia)
  const hashReady = useRef(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [focusNonce, setFocusNonce] = useState(0);
  useEffect(() => {
    const readHash = () => {
      const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const yr = params.get('year');
      const parsed = yr && yr !== 'all' ? Number(yr) : NaN;
      setSelectedYear(Number.isFinite(parsed) ? parsed : 'all');
      setSelectedContinent(params.get('continent') || 'all');
      setSelectedCountry(params.get('country') || 'all');
      const track = params.get('track');
      if (track) {
        setFocusId(track);
        setFocusNonce((n) => n + 1);
      }
    };
    readHash();
    hashReady.current = true;
    window.addEventListener('hashchange', readHash);
    return () => window.removeEventListener('hashchange', readHash);
  }, []);

  useEffect(() => {
    if (!hashReady.current) return;
    const params = new URLSearchParams();
    if (selectedYear !== 'all') params.set('year', String(selectedYear));
    if (selectedContinent !== 'all') params.set('continent', selectedContinent);
    if (selectedCountryRaw !== 'all') params.set('country', selectedCountryRaw);
    const hash = params.toString();
    const url = window.location.pathname + window.location.search + (hash ? `#${hash}` : '');
    if (url !== window.location.pathname + window.location.search + window.location.hash) {
      window.history.replaceState(null, '', url);
    }
  }, [selectedYear, selectedContinent, selectedCountryRaw]);

  const availableYears = useMemo(() => getAvailableYears(initialRankings), [initialRankings]);

  // Countries on offer for the chosen year and continent, west to east within each continent
  const countryOptions = useMemo(() => {
    return filterAndGroupMusicRankings(initialRankings, {
      year: selectedYear,
      continent: selectedContinent,
    }).flatMap((g) => g.countries.map((c) => ({ name: c.country, flag: c.countryFlag })));
  }, [initialRankings, selectedYear, selectedContinent]);

  // A country that the year / continent no longer offers falls back to all
  const selectedCountry = countryOptions.some((c) => c.name === selectedCountryRaw) ? selectedCountryRaw : 'all';

  const continentGroups = useMemo(() => {
    return filterAndGroupMusicRankings(initialRankings, {
      year: selectedYear,
      continent: selectedContinent,
      country: selectedCountry,
      query: searchQuery,
    });
  }, [initialRankings, selectedYear, selectedContinent, selectedCountry, searchQuery]);

  // Keep the song in view when the phone rotates: remember the card nearest the top while scrolling,
  // then put it back at the same offset once the new layout has settled.
  useEffect(() => {
    let anchor: { id: string; top: number } | null = null;
    let resizing = false;
    let frame = 0;
    let settle: ReturnType<typeof setTimeout> | undefined;
    let lastWidth = window.innerWidth;

    const remember = () => {
      frame = 0;
      if (resizing) return;
      const cards = document.querySelectorAll<HTMLElement>('[id^="track-"]');
      for (const el of cards) {
        const rect = el.getBoundingClientRect();
        if (rect.bottom > 80) {
          anchor = { id: el.id, top: Math.min(Math.max(rect.top, 0), window.innerHeight / 2) };
          return;
        }
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(remember);
    };
    const onResize = () => {
      if (window.innerWidth === lastWidth) return;
      resizing = true;
      clearTimeout(settle);
      settle = setTimeout(() => {
        lastWidth = window.innerWidth;
        const el = anchor ? document.getElementById(anchor.id) : null;
        if (el && anchor) window.scrollBy(0, el.getBoundingClientRect().top - anchor.top);
        resizing = false;
        remember();
      }, 250);
    };

    remember();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      clearTimeout(settle);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!focusId) return;
    const el = document.getElementById(`track-${focusId}`);
    if (!el) return;
    el.scrollIntoView({ block: 'center' });
  }, [focusId, focusNonce, continentGroups]);

  // Flattened ordered list of tracks currently displayed on the landing page
  const landingPageQueue = useMemo(() => {
    return continentGroups.flatMap((g) => g.countries.flatMap((c) => c.rankings));
  }, [continentGroups]);

  // Synchronize playback queue so clicking Next / Auto-play follows the visual landing page order
  useEffect(() => {
    if (landingPageQueue.length > 0) {
      setPlaylist(landingPageQueue);
    }
  }, [landingPageQueue, setPlaylist]);

  const totalResults = useMemo(() => {
    return continentGroups.reduce(
      (sum, group) => sum + group.countries.reduce((cSum, country) => cSum + country.rankings.length, 0),
      0,
    );
  }, [continentGroups]);

  // Featured highlight item for hero banner
  const featured = useMemo(() => {
    return initialRankings.find((r) => r.rank === 1 && r.artworkUrl) ?? initialRankings[0];
  }, [initialRankings]);

  const totalCountries = useMemo(() => {
    const set = new Set<string>();
    for (const r of initialRankings) set.add(originOf(r).name);
    return set.size;
  }, [initialRankings]);

  // Horizontal mouse-wheel scroll on continent nav
  useEffect(() => {
    const nav = continentNavRef.current;
    if (!nav) return;
    const onWheel = (e: WheelEvent) => {
      if (nav.scrollWidth <= nav.clientWidth || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
      e.preventDefault();
      nav.scrollLeft += e.deltaY;
    };
    nav.addEventListener('wheel', onWheel, { passive: false });
    return () => nav.removeEventListener('wheel', onWheel);
  }, []);

  // JSON-LD structured data for Google & SEO
  const jsonLd = useMemo(() => {
    return {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      description,
      url: absoluteUrl(path),
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: initialRankings.length,
        itemListElement: initialRankings.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: item.pinId ? absoluteUrl(pinPath({ id: item.pinId, title: item.title })) : item.sourceUrl,
          name: `${item.title} by ${item.artist} (#${item.rank} in ${item.country})`,
        })),
      },
    };
  }, [initialRankings, title, description, path]);

  return (
    <main className={styles.guide} data-landing>
      <LandingMark />
      <JsonLd data={jsonLd} />

      <div className={styles.container}>
        {/* Navigation Wordmark */}
        <div className={styles.guideNav}>
          <Link href={path} className={styles.wordmark}>
            <span aria-hidden="true">✳</span> The music guide
          </Link>
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--soft)]">
            <Icon name="music" className="size-3.5 text-[var(--green)]" />
            <span>Official Global Year-End Charts</span>
          </div>
        </div>

        {/* Hero Section with Editorial Copy & Featured Card */}
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>ANNUAL MUSIC CHARTS · RANKED WEST TO EAST</p>
            <h1>
              The songs that <em>defined the world.</em>
            </h1>
            <p className={styles.lead}>{description}</p>
          </div>

          {featured ? (
            <div className="relative group">
              <Link
                href={featured.pinId ? pinPath({ id: featured.pinId, title: featured.title }) : featured.sourceUrl}
                className={styles.featured}
                aria-label={`Explore ${featured.title} by ${featured.artist}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- external music artwork images */}
                <img
                  src={featured.artworkUrl || undefined}
                  alt={`${featured.title} artwork`}
                  className={styles.featuredImage}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div className={styles.featuredShade} />
                <span className={styles.featuredBadge}>GLOBAL #1 SELECTION</span>
                <div className={styles.featuredCopy}>
                  <p>
                    {featured.countryFlag} {featured.country} · {featured.chartName} · #{featured.rank} ({featured.year})
                  </p>
                  <h2>{featured.title}</h2>
                  <span>
                    <span>{featured.artist}</span>
                    <span aria-hidden="true">↗</span>
                  </span>
                </div>
              </Link>

              {/* Featured Audio & Full Playback Buttons */}
              <div className="absolute top-5 right-5 z-20 flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    togglePlay(featured, landingPageQueue);
                  }}
                  className="flex items-center gap-1.5 rounded-full bg-[var(--green)]/90 hover:bg-[var(--green)] text-[#fffef0] px-3.5 py-1.5 text-xs font-semibold shadow-lg backdrop-blur-xs transition-transform active:scale-95 cursor-pointer"
                  aria-label={
                    currentTrack?.id === featured.id && isPlaying && playbackMode === 'preview'
                      ? `Pause ${featured.title}`
                      : `Play ${featured.title} preview`
                  }
                  title="Play 30s preview"
                >
                  {currentTrack?.id === featured.id && isPlaying && playbackMode === 'preview' ? (
                    <>
                      <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                      </svg>
                      <span>Pause</span>
                      <span className="flex items-end gap-0.5 h-3">
                        <span className="w-0.5 bg-white animate-pulse" style={{ height: '70%', animationDuration: '0.6s' }} />
                        <span className="w-0.5 bg-white animate-pulse" style={{ height: '100%', animationDuration: '0.4s' }} />
                        <span className="w-0.5 bg-white animate-pulse" style={{ height: '40%', animationDuration: '0.5s' }} />
                      </span>
                    </>
                  ) : (
                    <>
                      <svg className="size-3.5 translate-x-0.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      <span>Preview</span>
                    </>
                  )}
                </button>

                {featured.youtubeId ? (
                  <Link
                    href={`${featured.pinId ? pinPath({ id: featured.pinId, title: featured.title }) : featured.sourceUrl}${featured.pinId ? '?autoplay=1' : ''}`}
                    onClick={() => pause()}
                    className="flex items-center gap-1.5 rounded-full bg-red-600/90 hover:bg-red-600 text-white px-3.5 py-1.5 text-xs font-semibold shadow-lg backdrop-blur-xs transition-transform active:scale-95 cursor-pointer hover:no-underline"
                    title={`Play ${featured.title} full song on pin page`}
                  >
                    <svg className="size-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    <span>Full Song</span>
                  </Link>
                ) : null}
              </div>
            </div>
          ) : (
            <div className={styles.noFeature}>
              <span aria-hidden="true">✳</span>
              <p>
                The world&apos;s biggest songs.<br />Tracked across history.
              </p>
            </div>
          )}
        </header>

        {/* Digest Statistics Ribbon */}
        <div className={styles.digest}>
          <div className="flex flex-col gap-1">
            <strong className="font-serif text-3xl font-normal text-[var(--text)]">{initialRankings.length}</strong>
            <span className="text-xs text-[var(--soft)]">Tracked Rankings</span>
          </div>
          <div className="flex flex-col gap-1 border-l border-[var(--rule)] pl-6">
            <strong className="font-serif text-3xl font-normal text-[var(--text)]">6</strong>
            <span className="text-xs text-[var(--soft)]">Continents (W → E)</span>
          </div>
          <div className="flex flex-col gap-1 min-[761px]:border-l min-[761px]:border-[var(--rule)] min-[761px]:pl-6">
            <strong className="font-serif text-3xl font-normal text-[var(--text)]">{totalCountries}</strong>
            <span className="text-xs text-[var(--soft)]">National Music Charts</span>
          </div>
          <div className="flex flex-col gap-1 border-l border-[var(--rule)] pl-6">
            <strong className="font-serif text-3xl font-normal text-[var(--text)]">100%</strong>
            <span className="text-xs text-[var(--soft)]">Backed by Native Pins</span>
          </div>
        </div>

        {/* Interactive Filter Panel (Year, Continent & Live Search) */}
        <section className="my-8 rounded-xl border border-[var(--rule)] bg-[var(--paper-raised)] p-6 shadow-xs">
          <div className="space-y-5">
            {/* Year Selector Row */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--rule)] pb-4">
              <div className="flex min-w-0 max-w-full items-center gap-3">
                <span className="shrink-0 text-[11px] font-bold tracking-wider uppercase text-[var(--soft)]">
                  Year:
                </span>
                <div className="flex min-w-0 flex-nowrap gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                  <button
                    type="button"
                    onClick={() => setSelectedYear('all')}
                    className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      selectedYear === 'all'
                        ? 'bg-[var(--green)] text-[#fffef0] shadow-xs border border-[var(--green)]'
                        : 'border border-[var(--rule)] bg-[var(--paper)] text-[var(--text)] hover:border-[var(--green)] hover:bg-[var(--rule)]'
                    }`}
                  >
                    All Years
                  </button>
                  {availableYears.map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => setSelectedYear(yr)}
                      className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                        selectedYear === yr
                          ? 'bg-[var(--green)] text-[#fffef0] shadow-xs border border-[var(--green)]'
                          : 'border border-[var(--rule)] bg-[var(--paper)] text-[var(--text)] hover:border-[var(--green)] hover:bg-[var(--rule)]'
                      }`}
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              </div>

              {/* Real-time search box */}
              <div className="relative min-w-[240px] max-w-sm flex-1 sm:flex-initial">
                <Icon
                  name="search"
                  className="pointer-events-none absolute top-1/2 start-3.5 size-3.5 -translate-y-1/2 text-[var(--soft)]"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search song, artist, chart..."
                  className="w-full rounded-full border border-[var(--rule)] bg-[var(--paper)] py-1.5 pe-8 ps-9 text-xs text-[var(--text)] placeholder:text-[var(--soft)] transition-colors focus:border-[var(--green)] focus:outline-none"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute top-1/2 end-3 -translate-y-1/2 text-[var(--soft)] hover:text-[var(--text)] cursor-pointer"
                    title="Clear search"
                  >
                    ✕
                  </button>
                ) : null}
              </div>
            </div>

            {/* Continent Tabs Row (West to East) */}
            <div className="flex items-center gap-3">
              <span className="shrink-0 text-[11px] font-bold tracking-wider uppercase text-[var(--soft)]">
                Continent:
              </span>
              <div
                ref={continentNavRef}
                className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1 scrollbar-thin"
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedContinent('all');
                    setSelectedCountry('all');
                  }}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    selectedContinent === 'all'
                      ? 'bg-[var(--green)] text-[#fffef0] shadow-xs border border-[var(--green)]'
                      : 'border border-[var(--rule)] bg-[var(--paper)] text-[var(--text)] hover:border-[var(--green)] hover:bg-[var(--rule)]'
                  }`}
                >
                  All Continents
                </button>
                {CONTINENTS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setSelectedContinent(c);
                      setSelectedCountry('all');
                    }}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      selectedContinent === c
                        ? 'bg-[var(--green)] text-[#fffef0] shadow-xs border border-[var(--green)]'
                        : 'border border-[var(--rule)] bg-[var(--paper)] text-[var(--text)] hover:border-[var(--green)] hover:bg-[var(--rule)]'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Country Row (West to East within the chosen continent) */}
            <div className="flex min-w-0 items-center gap-3">
              <span className="shrink-0 text-[11px] font-bold tracking-wider uppercase text-[var(--soft)]">
                Country:
              </span>
              <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {[{ name: 'all', flag: '', label: 'All Countries' }, ...countryOptions.map((c) => ({ ...c, label: c.name }))].map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setSelectedCountry(c.name)}
                    className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      selectedCountry === c.name
                        ? 'bg-[var(--green)] text-[#fffef0] shadow-xs border border-[var(--green)]'
                        : 'border border-[var(--rule)] bg-[var(--paper)] text-[var(--text)] hover:border-[var(--green)] hover:bg-[var(--rule)]'
                    }`}
                  >
                    {c.flag ? <span aria-hidden="true">{c.flag} </span> : null}
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Results Counter & Reset Filter Link */}
        <div className="mb-8 flex items-center justify-between text-xs text-[var(--soft)]">
          <span>
            Showing <strong className="text-[var(--text)]">{totalResults}</strong> ranking{totalResults === 1 ? '' : 's'} across{' '}
            <strong className="text-[var(--text)]">{continentGroups.length}</strong> continent{continentGroups.length === 1 ? '' : 's'}
          </span>
          {searchQuery || selectedYear !== 'all' || selectedContinent !== 'all' || selectedCountry !== 'all' ? (
            <button
              type="button"
              onClick={() => {
                setSelectedYear('all');
                setSelectedContinent('all');
                setSelectedCountry('all');
                setSearchQuery('');
              }}
              className="font-semibold text-[var(--green)] hover:underline cursor-pointer"
            >
              Reset all filters
            </button>
          ) : null}
        </div>

        {/* Empty state when filters return 0 results */}
        {continentGroups.length === 0 ? (
          <div className="my-16 rounded-xl border border-dashed border-[var(--rule)] bg-[var(--paper-raised)] p-12 text-center">
            <Icon name="music" className="mx-auto size-10 text-[var(--soft)]" />
            <h3 className="mt-4 font-serif text-2xl font-normal text-[var(--text)]">No music rankings found</h3>
            <p className="mt-2 text-xs text-[var(--soft)]">
              No chart entries match your active filters. Try picking another year, continent, or clearing your search.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedYear('all');
                setSelectedContinent('all');
                setSelectedCountry('all');
                setSearchQuery('');
              }}
              className="mt-5 rounded-full bg-[var(--green)] px-5 py-2 text-xs font-semibold text-[#fffef0] shadow-xs hover:opacity-90 cursor-pointer"
            >
              Reset filters
            </button>
          </div>
        ) : null}

        {/* Hierarchical Grouping: By Continent, then by Country (West to East) */}
        <div className="space-y-20">
          {continentGroups.map((continentGroup) => (
            <section key={continentGroup.name} className="scroll-mt-20">
              {/* Continent Section Heading */}
              <div className="flex items-baseline justify-between border-b border-[var(--rule)] pb-4 mb-8">
                <div className="flex items-center gap-3">
                  <Icon name="globe" className="size-6 text-[var(--green)]" />
                  <h2 className="font-serif text-3xl font-normal text-[var(--text)] tracking-tight">
                    {continentGroup.name}
                  </h2>
                  <span className="rounded-full border border-[var(--rule)] bg-[var(--paper-raised)] px-2.5 py-0.5 text-xs font-semibold text-[var(--soft)]">
                    {continentGroup.countries.reduce((acc, c) => acc + c.rankings.length, 0)} songs
                  </span>
                </div>
                <span className="text-xs italic text-[var(--soft)] hidden sm:inline">
                  West to East geographic order
                </span>
              </div>

              {/* Countries within this Continent */}
              <div className="space-y-14">
                {continentGroup.countries.map((countryGroup) => (
                  <div key={countryGroup.country}>
                    {/* Country Header Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--rule)] pb-3 mb-6">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl" role="img" aria-label={countryGroup.country}>
                          {countryGroup.countryFlag}
                        </span>
                        <h3 className="font-serif text-2xl font-normal text-[var(--text)]">
                          {countryGroup.country}
                        </h3>
                        <span className="text-[var(--soft)]">·</span>
                        <span className="text-sm font-semibold text-[var(--green)]">
                          Music produced here
                        </span>
                      </div>
                      <span className="rounded-md border border-[var(--rule)] bg-[var(--paper-raised)] px-2.5 py-1 text-xs text-[var(--soft)]">
                        Charted on: <strong className="font-semibold text-[var(--text)]">{countryGroup.chartName}</strong>
                      </span>
                    </div>

                    {/* Grid of Editorial Music Ranking Cards */}
                    <div className={styles.cardGrid}>
                      {countryGroup.rankings.map((song) => {
                        const pinHref = song.pinId
                          ? pinPath({ id: song.pinId, title: song.title })
                          : song.sourceUrl;
                        const isThisPlaying = currentTrack?.id === song.id && isPlaying;
                        const origin = originOf(song);

                        return (
                          <article
                            key={song.id}
                            id={`track-${song.id}`}
                            className={`${styles.card} scroll-mt-24 transition-shadow ${
                              isThisPlaying || focusId === song.id ? 'ring-2 ring-[var(--green)] shadow-md' : ''
                            }`}
                          >
                            {/* Photo / Artwork with Play Button Overlay */}
                            <div className="relative group/art aspect-[1.6] overflow-hidden bg-[var(--rule)]">
                              <Link
                                href={pinHref}
                                className="block size-full"
                                aria-label={`See ${song.title} by ${song.artist}`}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element -- external music artwork images */}
                                <img
                                  src={song.artworkUrl || undefined}
                                  alt={`${song.title} by ${song.artist}`}
                                  className={`${styles.cardImage} transition-transform duration-300 group-hover/art:scale-105`}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  loading="lazy"
                                />
                                {/* Card Rank Badge */}
                                <div className="absolute start-3.5 top-3.5 flex max-w-[calc(100%-28px)] flex-wrap gap-1.5">
                                  {yearLabels(song).map((l) => (
                                    <span key={l.year} className={styles.cardBadge} style={{ position: 'static' }}>
                                      #{l.rank} YEAR-END · {l.year}
                                    </span>
                                  ))}
                                </div>

                                {/* Weeks at #1 image note */}
                                {song.weeksAtNumberOne ? (
                                  <span className={styles.imageNote}>
                                    {song.weeksAtNumberOne} WEEKS AT #1
                                  </span>
                                ) : null}
                              </Link>

                              {/* Play / Pause Overlay Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  togglePlay(song, landingPageQueue);
                                }}
                                className={`absolute bottom-3 right-3 z-10 flex size-11 items-center justify-center rounded-full bg-[var(--green)] text-[#fffef0] shadow-md transition-all duration-200 cursor-pointer ${
                                  isThisPlaying
                                    ? 'opacity-100 scale-100 ring-2 ring-white/80'
                                    : 'opacity-90 group-hover/art:opacity-100 group-hover/art:scale-110'
                                }`}
                                aria-label={
                                  isThisPlaying
                                    ? `Pause ${song.title}`
                                    : `Play ${song.title} preview`
                                }
                                title={isThisPlaying ? 'Pause preview' : 'Play 30s preview'}
                              >
                                {isThisPlaying ? (
                                  <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                                  </svg>
                                ) : (
                                  <svg className="size-5 translate-x-0.5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                )}
                              </button>
                            </div>

                            {/* Card Body */}
                            <div className={styles.cardBody}>
                              {/* Meta: Artist & Country */}
                              <p className={styles.cardMeta}>
                                <Link
                                  href={`/search?q=${encodeURIComponent(song.artist)}`}
                                  className="hover:underline hover:text-[var(--text)] transition-colors"
                                  title={`Search for pins by ${song.artist}`}
                                >
                                  {song.artist}
                                </Link>
                                <span aria-hidden="true">·</span>
                                <Link
                                  href={`/search?q=${encodeURIComponent(origin.name)}`}
                                  className="hover:underline hover:text-[var(--text)] transition-colors"
                                  title={`Music produced in ${origin.name}`}
                                >
                                  {origin.flag} {origin.name}
                                </Link>
                              </p>

                              {/* Title */}
                              <h3>
                                <Link
                                  href={pinHref}
                                  className="text-[var(--text)] hover:text-[var(--green)]"
                                >
                                  {song.title}
                                </Link>
                              </h3>

                              {/* Commercial Performance */}
                              {song.streamsOrUnits ? (
                                <p className="mt-1.5 text-xs font-semibold text-[var(--green)]">
                                  {song.streamsOrUnits}
                                </p>
                              ) : null}

                              {song.songStats?.peak != null || song.songStats?.weeksOnChart != null ? (
                                <p className="mt-1 text-[11px] text-[var(--soft)]">
                                  {song.songStats?.peak != null ? <>Peak <strong className="text-[var(--text)]">{song.songStats.peak}</strong></> : null}
                                  {song.songStats?.peak != null && song.songStats?.weeksOnChart != null ? ' · ' : null}
                                  {song.songStats?.weeksOnChart != null ? <><strong className="text-[var(--text)]">{song.songStats.weeksOnChart}</strong> wks on chart</> : null}
                                  {song.album?.stats?.certifications?.[0] ? <> · Album {song.album.stats.certifications[0].level}</> : null}
                                </p>
                              ) : null}

                              {/* Interactive Audio Preview & Full Song Trigger Strip */}
                              <div className="mt-3 mb-2 flex items-center justify-between gap-2 rounded-lg border border-[var(--rule)]/60 bg-[var(--paper)]/80 px-2.5 py-1.5 text-xs">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => togglePlay(song, landingPageQueue)}
                                    className="flex items-center gap-1.5 text-xs font-semibold text-[var(--green)] hover:underline cursor-pointer"
                                  >
                                    {isThisPlaying && playbackMode === 'preview' ? (
                                      <>
                                        <span className="flex items-end gap-0.5 h-3">
                                          <span className="w-0.5 bg-[var(--green)] animate-pulse" style={{ height: '70%', animationDuration: '0.6s' }} />
                                          <span className="w-0.5 bg-[var(--green)] animate-pulse" style={{ height: '100%', animationDuration: '0.4s' }} />
                                          <span className="w-0.5 bg-[var(--green)] animate-pulse" style={{ height: '50%', animationDuration: '0.5s' }} />
                                        </span>
                                        <span>Preview</span>
                                      </>
                                    ) : (
                                      <>
                                        <svg className="size-3.5 fill-current" viewBox="0 0 24 24">
                                          <path d="M8 5v14l11-7z" />
                                        </svg>
                                        <span>Preview</span>
                                      </>
                                    )}
                                  </button>

                                  {song.youtubeId ? (
                                    <>
                                      <span className="text-[var(--rule)]">|</span>
                                      <Link
                                        href={`${pinHref}${pinHref.includes('?') ? '&' : '?'}autoplay=1`}
                                        onClick={() => pause()}
                                        className="flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:underline cursor-pointer"
                                        title={`Play ${song.title} full song on pin page`}
                                      >
                                        <svg className="size-3 fill-current" viewBox="0 0 24 24">
                                          <path d="M8 5v14l11-7z" />
                                        </svg>
                                        <span>Full Song</span>
                                      </Link>
                                    </>
                                  ) : null}
                                </div>

                                <span className="text-[10px] font-mono tabular-nums text-[var(--soft)]">
                                  {isThisPlaying && playbackMode === 'preview' ? `${Math.floor(currentTime)}s / 30s` : '0:30'}
                                </span>
                              </div>

                              {song.album ? (
                                <AlbumTracklist
                                  song={song}
                                  pinHref={pinHref}
                                  queue={landingPageQueue}
                                />
                              ) : null}

                              {/* Description / Summary */}
                              <p className={styles.cardDescription}>
                                {song.summary}
                              </p>

                              {/* Card Footer */}
                              <div className={styles.cardFoot}>
                                <div>
                                  <span>GENRES</span>
                                  <span className="flex flex-wrap gap-1">
                                    {song.genres.slice(0, 3).map((g) => (
                                      <Link
                                        key={g}
                                        href={`/search?q=${encodeURIComponent(g)}`}
                                        className="rounded-full border border-[var(--rule)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text)] hover:border-[var(--green)]"
                                      >
                                        {g}
                                      </Link>
                                    ))}
                                  </span>
                                </div>

                                <Anchor
                                  href={song.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={styles.cardArrow}
                                  aria-label={`View source link for ${song.title} on ${song.chartAuthority}`}
                                  title={`Source chart: ${song.chartName} (${song.chartAuthority})`}
                                >
                                  ↗
                                </Anchor>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
