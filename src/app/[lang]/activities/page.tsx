import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { ActivitiesView } from '@/components/activities/ActivitiesView';
import { activityDescription, activityMetadata } from './shared';
import { activityPins } from '@/server/services/activities';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  return activityMetadata(null);
}

export default function ActivitiesPage() {
  return (
    <Suspense fallback={<div className="mx-auto h-[70vh] max-w-7xl animate-pulse rounded-xl bg-panel" aria-busy="true" />}>
      <Activities />
    </Suspense>
  );
}

async function Activities() {
  await connection();
  const t = await getT();
  const pins = await activityPins(t.locale);
  return <ActivitiesView pins={pins} cityFilter={null} serverNow={new Date().toISOString()} title={t('guides.activities.title')} description={activityDescription(t, null)} path="/activities" />;
}
