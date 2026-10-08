'use client';

import { useEffect, useRef, useState } from 'react';
import Link from '@/components/ui/Link';
import { Icon } from '@/components/ui/Icon';
import { viewerPlace, type ViewerPlace } from '@/lib/client/viewerPlace';
import type { RestaurantSort } from '@/lib/restaurantSort';
import styles from './RestaurantGuide.module.css';

export function useRestaurantSort(label: string, defaultSort: 'rating' | 'opening-date' = 'rating') {
  const [sort, setSort] = useState<RestaurantSort>(defaultSort);
  const [origin, setOrigin] = useState<ViewerPlace>();
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const request = useRef(0);
  useEffect(() => {
    const pending = request; const id = pending.current;
    void viewerPlace().then((place) => { if (place && id === pending.current) setOrigin(place); }).catch(() => {});
    return () => { pending.current++; };
  }, []);
  const selectSort = (value: RestaurantSort) => {
    const id = ++request.current;
    setLocationError(''); setLocating(false);
    if (value !== 'distance' || origin?.source === 'device') { setSort(value); return; }
    const fallback = defaultSort === 'opening-date' ? 'expected opening date' : 'rating';
    if (!navigator.geolocation) { setLocationError(`Location is unavailable in this browser. ${label} are sorted by ${fallback}.`); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      if (id !== request.current) return;
      setOrigin({ latitude: coords.latitude, longitude: coords.longitude, source: 'device' });
      setSort('distance'); setLocating(false);
    }, (error) => {
      if (id !== request.current) return;
      setLocating(false);
      setLocationError(error.code === 1 ? `Allow location access in your browser to sort by distance. ${label} are sorted by ${fallback}.` : `Couldn’t find your location. Try distance again. ${label} are sorted by ${fallback}.`);
    }, { maximumAge: 5 * 60 * 1000, timeout: 10000 });
  };
  return { sort, origin, locating, locationError, selectSort };
}

export function RestaurantControls({ state, label, mapHref, openingDate = false }: { state: ReturnType<typeof useRestaurantSort>; label: string; mapHref: string; openingDate?: boolean }) {
  return <div className={styles.offerSort}>
    <div role="group" aria-label={`Sort ${label}`}><span>Sort by</span>{!openingDate && <button type="button" aria-pressed={state.sort === 'rating'} onClick={() => state.selectSort('rating')}>Rating</button>}<button type="button" aria-pressed={state.sort === 'distance'} disabled={state.locating} onClick={() => state.selectSort('distance')}>Distance</button>{openingDate && <button type="button" aria-pressed={state.sort === 'opening-date'} onClick={() => state.selectSort('opening-date')}>Expected opening date</button>}</div>
    <Link href={mapHref} className={styles.offerMapButton} prefetch={false}><Icon name="map" />Map</Link>
  </div>;
}

export function RestaurantSortNote({ state }: { state: ReturnType<typeof useRestaurantSort> }) {
  return state.locating || state.locationError || state.sort === 'distance' ? <p className={styles.offerSortNote} role="status">{state.locating ? 'Finding your location…' : state.locationError || 'Nearest first · Approximate straight-line distance from your location. Unknown distances shown last.'}</p> : null;
}
