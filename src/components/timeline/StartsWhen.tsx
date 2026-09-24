'use client';

import { useNow } from '@/lib/client/now';
import { startsWhen } from '@/lib/format';
import { useT } from '@/lib/client/i18n';

// "Starts in 3 days" / "Started 2 hours ago", a line of its own under a
// trending or new pin's details - the side column is too narrow to share one.
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
      {started ? t('countdown.startedAgo', { ago: when }) : t('countdown.startsWhen', { when })}
    </time>
  );
}
