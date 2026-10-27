import type { Metadata } from 'next';
import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ActivitiesView } from '@/components/activities/ActivitiesView';
import { activityCity } from '@/lib/activities';
import { getT } from '@/lib/i18n/server';
import { activityPins } from '@/server/services/activities';
import { activityDescription, activityMetadata } from '../shared';

type Params = Promise<{ city: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { city } = await params;
  if (!activityCity(city)) return {};
  return activityMetadata(city);
}

export default async function ActivityCityPage({ params }: { params: Params }) {
  if (!activityCity((await params).city)) notFound();
  return (
    <Suspense fallback={<div className="mx-auto h-[70vh] max-w-7xl animate-pulse rounded-xl bg-panel" aria-busy="true" />}>
      <ActivityCity params={params} />
    </Suspense>
  );
}

async function ActivityCity({ params }: { params: Params }) {
  const { city } = await params;
  const known = activityCity(city);
  if (!known) notFound();
  await connection();
  const t = await getT();
  const pins = await activityPins(t.locale);
  return <ActivitiesView pins={pins} cityFilter={known.slug} serverNow={new Date().toISOString()} title={t('guides.activities.titleCity', { city: known.name })} description={activityDescription(t, known.slug)} path={`/activities/${known.slug}`} />;
}
