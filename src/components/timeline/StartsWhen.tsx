'use client';

import { useNow } from '@/lib/client/now';
import { startsWhen } from '@/lib/format';
import { useT } from '@/lib/client/i18n';

// "Starts in 3 days" / "Started in 2 hours", after a trending pin's views or
// a new pin's age.
// An all-day pin is read on the viewer's own calendar, which the server does
// not know, so the line stays blank until the page runs in the browser; it
// still takes its height, so the rows do not jump when it fills.
export function StartsWhen({ utcStartDateTime, allDay }: { utcStartDateTime: string; allDay?: boolean }) {
  const now = useNow(60_000);
  const t = useT();
  if (!now) return <span className="text-xs">&nbsp;</span>;
  const { started, when } = startsWhen(utcStartDateTime, allDay, now, t.locale);
  return (
    <time dateTime={utcStartDateTime} className={`truncate text-xs ${started ? 'text-subtle' : 'text-future'}`}>
      {started ? t('countdown.startedIn', { when }) : t('countdown.startsWhen', { when })}
    </time>
  );
}
