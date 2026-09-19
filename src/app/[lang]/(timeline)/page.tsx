import type { Metadata } from 'next';
import Link from '@/components/ui/Link';
import { JsonLd } from '@/components/JsonLd';
import { Timeline } from '@/components/timeline/Timeline';
import { siteName } from '@/lib/appConfig';
import { dayKeyIn, formatDayKey, monthDayOf } from '@/lib/format';
import { DEFAULT_POSTED_WITHIN, isSpan, spanFromParam, spanToParam } from '@/lib/postedSpan';
import { toCardPins } from '@/lib/sanitize';
import { websiteJsonLd } from '@/lib/seo';
import { pinDayKey } from '@/lib/timeline';
import specialtyDays from '@/server/data/specialtyDays.json';
import { newPins, pinById, TRENDING_DAYS, timelinePage, timelineVideo, trendingPins, viewerPreference } from '@/server/services/pages';
import { resolveCreatedSince } from '@/server/util/createdFilter';
import { viewerTimeZone, viewerUser } from '@/server/viewer';
import { alternates, getT, redirect } from '@/lib/i18n/server';
import { connection } from 'next/server';

type Props = PageProps<'/[lang]'>;

// Allowed to wait for its data when navigated to: the timeline and search
// share one loading boundary in ../layout.tsx on purpose, so moving between
// them keeps the page on screen until the new one is ready rather than
// flashing a skeleton. Next's instant-navigation check would otherwise flag
// that deliberate wait. The first load still streams from the static shell.
export const instant = false;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const cursor = first(params.from_date_time) || first(params.pin);
  return {
    alternates: await alternates('/'),
    // Paged views help crawlers reach every pin but duplicate the timeline,
    // so they are followed, not indexed. The sitemap lists every pin too.
    ...(cursor ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function HomePage({ searchParams }: Props) {
  const t = await getT();
  return (
    <main>
      <h1 className="sr-only">{t('meta.homeHeading', { site: siteName })}</h1>
      <JsonLd data={websiteJsonLd()} />
      <HomeTimeline searchParams={searchParams} />
    </main>
  );
}

async function HomeTimeline({ searchParams }: Pick<Props, 'searchParams'>) {
  // Per request: the timeline opens on today, which it reads off the clock.
  await connection();
  const params = await searchParams;
  const [user, timeZone, t] = await Promise.all([viewerUser(), viewerTimeZone(), getT()]);
  const preference = user?.defaultFilterSpanPreference;
  const defaultPostedWithin = preference && isSpan(preference) ? preference : DEFAULT_POSTED_WITHIN;
  let postedWithin = spanFromParam(first(params.posted), defaultPostedWithin);
  // ?pin=<id> (the pin page's "To timeline") opens on that pin instead of now.
  const focusId = Number(first(params.pin));
  const focusPin = Number.isInteger(focusId) && focusId > 0 ? await pinById(focusId, t.locale) : null;
  // The pin is what was asked for: a posting window that would hide it opens
  // as All instead (the slider and the URL say so).
  const since = focusPin && postedWithin ? resolveCreatedSince({ created_within: postedWithin }) : null;
  if (since && focusPin?.utcCreatedDateTime && new Date(focusPin.utcCreatedDateTime) < since) {
    postedWithin = null;
  }
  // Opened on a pin, the URL must already say the posting window the timeline
  // will write into it: rewritten after the jump, the router takes it as a
  // navigation, scrolls to the top and lets go of the pin.
  const posted = spanToParam(postedWithin, defaultPostedWithin);
  if (focusPin && (first(params.posted) ?? null) !== posted) {
    const query = new URLSearchParams();
    for (const [name, value] of Object.entries(params)) {
      if (name === 'posted' || value === undefined) continue;
      for (const v of Array.isArray(value) ? value : [value]) query.append(name, v);
    }
    if (posted) query.set('posted', posted);
    await redirect(`/?${query}`);
  }
  const fromDateTime = focusPin ? null : first(params.from_date_time) || null;

  const [page, video, trending, added, personal] = await Promise.all([
    timelinePage(
      {
        fromDateTime,
        lastPinId: Number(first(params.last_pin_id)) || 0,
        around: focusPin ? { dateTime: focusPin.utcStartDateTime, pinId: focusPin.id } : null,
      },
      postedWithin,
      t.locale,
    ),
    timelineVideo(),
    trendingPins(t.locale),
    newPins(t.locale),
    viewerPreference(user?.id),
  ]);

  // Only the specialty days this page shows; the rest load when scrolled to.
  const days: Record<string, string[]> = {};
  const all = specialtyDays as Record<string, string[]>;
  for (const key of [
    ...page.pins.map((p) => monthDayOf(pinDayKey(p, timeZone))),
    ...page.dateTimes.map((d) => monthDayOf(dayKeyIn(d.utcStartDateTime, 'UTC'))),
    new Intl.DateTimeFormat('en-CA', { timeZone, month: '2-digit', day: '2-digit' }).format(new Date()).replace('/', '-'),
  ]) {
    days[key] = all[key] || [];
  }

  const firstDay = page.pins[0] && pinDayKey(page.pins[0], timeZone);
  const lastDay = page.pins.at(-1) && pinDayKey(page.pins.at(-1)!, timeZone);

  return (
    <>
      <Timeline
        // A new focus is a new timeline: its state starts from this page.
        key={focusPin ? `pin-${focusPin.id}` : 'today'}
        focus={focusPin ? { id: focusPin.id, utcStartDateTime: focusPin.utcStartDateTime, allDay: focusPin.allDay } : null}
        initialPins={toCardPins(page.pins)}
        initialDateTimes={page.dateTimes}
        initialLinks={page.links}
        serverTimeZone={timeZone}
        initialPostedWithin={postedWithin}
        defaultPostedWithin={defaultPostedWithin}
        defaultSpan={preference || '1d'}
        initialSpecialtyDays={days}
        serverNow={new Date().toISOString()}
        minConfidence={page.minConfidence}
        video={video}
        trending={{ pins: trending, days: TRENDING_DAYS }}
        newPins={added}
        preference={personal}
      />
      {/* Plain links through the timeline, for crawlers and anyone without JavaScript. */}
      <nav aria-label={t('timeline.pagesLabel')} className="flex flex-wrap justify-between gap-x-4 gap-y-2 px-4 pb-20 text-sm lg:ml-[190px] lg:max-w-[906px]">
        {page.links.previous ? (
          <Link href={`/${page.links.previous}`} prefetch={false} rel="prev" className="whitespace-nowrap">
            ← {t('timeline.pinsBefore', { date: firstDay ? formatDayKey(firstDay, t.locale) : '' })}
          </Link>
        ) : (
          <span />
        )}
        {page.links.next ? (
          <Link href={`/${page.links.next}`} prefetch={false} rel="next" className="ml-auto whitespace-nowrap">
            {t('timeline.pinsAfter', { date: lastDay ? formatDayKey(lastDay, t.locale) : '' })} →
          </Link>
        ) : null}
      </nav>
    </>
  );
}
