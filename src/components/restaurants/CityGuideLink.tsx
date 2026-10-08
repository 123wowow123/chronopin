'use client';

import { useLinkStatus } from 'next/link';
import Link from '@/components/ui/Link';
import styles from './RestaurantGuide.module.css';

function CityLoadingStatus({ city }: { city: string }) {
  const { pending } = useLinkStatus();
  return pending ? <span className={styles.cityLoading} role="status" aria-live="polite"><span className={styles.citySpinner} aria-hidden="true" /> Loading {city}…</span> : null;
}

export function CityGuideLink({ slug, name, current }: { slug: string; name: string; current: boolean }) {
  return <Link href={`/restaurants/${slug}`} aria-current={current ? 'page' : undefined}>
    {name}
    <CityLoadingStatus city={name} />
  </Link>;
}
