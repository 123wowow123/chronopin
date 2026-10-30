import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { dayKeyIn, monthDayOf } from '@/lib/format';
import { localizePath } from '@/lib/i18n/config';
import { getT } from '@/lib/i18n/server';
import { onThisDayPath } from '@/lib/onThisDay';
import { viewerTimeZone } from '@/server/viewer';

// /on-this-day is today's page: a redirect to the viewer's date, so the URL
// someone shares is the one date it shows.
export default function OnThisDayIndex() {
  return (
    <Suspense fallback={<div className="mx-auto h-[70vh] max-w-7xl animate-pulse rounded-xl bg-panel" aria-busy="true" />}>
      <Today />
    </Suspense>
  );
}

async function Today() {
  await connection();
  const [t, timeZone] = await Promise.all([getT(), viewerTimeZone()]);
  return redirect(localizePath(onThisDayPath(monthDayOf(dayKeyIn(new Date(), timeZone))), t.locale));
}
