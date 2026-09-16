import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/JsonLd';
import { Timeline } from '@/components/timeline/Timeline';
import { siteName } from '@/lib/appConfig';
import { formatDayKey } from '@/lib/format';
import { DEFAULT_POSTED_WITHIN, isSpan, spanFromParam } from '@/lib/postedSpan';
import { toCardPins } from '@/lib/sanitize';
import { websiteJsonLd } from '@/lib/seo';
import { pinDayKey } from '@/lib/timeline';
import specialtyDays from '@/server/data/specialtyDays.json';
import { newPins, TRENDING_DAYS, timelinePage, timelineVideo, trendingPins } from '@/server/services/pages';
import { viewerTimeZone, viewerUser } from '@/server/viewer';

type Props = PageProps<'/'>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const cursor = first((await searchParams).from_date_time);
  return {
    alternates: { canonical: '/' },
    // Paged views help crawlers reach every pin but duplicate the timeline,
    // so they are followed, not indexed. The sitemap lists every pin too.
    ...(cursor ? { robots: { index: false, follow: true } } : {}),
  };
}

export default function HomePage({ searchParams }: Props) {
  return (
    <main>
      <h1 className="sr-only">{siteName}: upcoming release dates, events and other important dates</h1>
      <JsonLd data={websiteJsonLd()} />
      <HomeTimeline searchParams={searchParams} />
    </main>
  );
}

async function HomeTimeline({ searchParams }: Pick<Props, 'searchParams'>) {
  const params = await searchParams;
  const [user, timeZone] = await Promise.all([viewerUser(), viewerTimeZone()]);
  const preference = user?.defaultFilterSpanPreference;
  const defaultPostedWithin = preference && isSpan(preference) ? preference : DEFAULT_POSTED_WITHIN;
  const postedWithin = spanFromParam(first(params.posted), defaultPostedWithin);
  const fromDateTime = first(params.from_date_time) || null;

  const [page, video, trending, added] = await Promise.all([
    timelinePage({ fromDateTime, lastPinId: Number(first(params.last_pin_id)) || 0 }, postedWithin),
    timelineVideo(),
    trendingPins(),
    newPins(),
  ]);

  // Only the specialty days this page shows; the rest load when scrolled to.
  const days: Record<string, string[]> = {};
  const all = specialtyDays as Record<string, string[]>;
  for (const key of [
    ...page.pins.map((p) => pinDayKey(p, timeZone).slice(5)),
    ...page.dateTimes.map((d) => d.utcStartDateTime.slice(5, 10)),
    new Intl.DateTimeFormat('en-CA', { timeZone, month: '2-digit', day: '2-digit' }).format(new Date()).replace('/', '-'),
  ]) {
    days[key] = all[key] || [];
  }

  const firstDay = page.pins[0] && pinDayKey(page.pins[0], timeZone);
  const lastDay = page.pins.at(-1) && pinDayKey(page.pins.at(-1)!, timeZone);

  return (
    <>
      <Timeline
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
      />
      {/* Plain links through the timeline, for crawlers and anyone without JavaScript. */}
      <nav aria-label="Timeline pages" className="flex justify-between px-4 pb-20 text-sm lg:ml-[190px] lg:max-w-[906px]">
        {page.links.previous ? (
          <Link href={`/${page.links.previous}`} prefetch={false} rel="prev">
            ← Pins before {firstDay ? formatDayKey(firstDay) : ''}
          </Link>
        ) : (
          <span />
        )}
        {page.links.next ? (
          <Link href={`/${page.links.next}`} prefetch={false} rel="next">
            Pins after {lastDay ? formatDayKey(lastDay) : ''} →
          </Link>
        ) : null}
      </nav>
    </>
  );
}
