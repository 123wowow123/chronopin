import type { Metadata } from 'next';
import { SearchResults } from '@/components/timeline/SearchResults';
import { monthDayOf } from '@/lib/format';
import { DEFAULT_POSTED_WITHIN, spanFromParam } from '@/lib/postedSpan';
import { toCardPins } from '@/lib/sanitize';
import { pinDayKey } from '@/lib/timeline';
import specialtyDays from '@/server/data/specialtyDays.json';
import { searchPage, timelineVideo } from '@/server/services/pages';
import { parseSearchQuery } from '@/server/util/searchQuery';
import { viewerTimeZone, viewerUser } from '@/server/viewer';

type Props = PageProps<'/search'>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) || '';

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = first((await searchParams).q);
  return {
    title: q ? `Search: ${q}` : 'Search',
    // Internal search results are thin, ever-changing pages: crawlers follow
    // them to pins but do not index them.
    robots: { index: false, follow: true },
  };
}

export default function SearchPage({ searchParams }: Props) {
  return (
    <main>
      <Results searchParams={searchParams} />
    </main>
  );
}

async function Results({ searchParams }: Pick<Props, 'searchParams'>) {
  const params = await searchParams;
  const q = first(params.q);
  const onlyWatched = first(params.f).toLowerCase() === 'watch';
  const [user, timeZone] = await Promise.all([viewerUser(), viewerTimeZone()]);
  // Only text typed into the search has an order of relevance, and when it is
  // there that order leads: the best matches first, the timeline a click away.
  // A filter-only search (category:, user:) has no scores, so it opens by date.
  const defaultSort = parseSearchQuery(q).text ? ('relevance' as const) : ('date' as const);
  const asked = first(params.sort);
  const view = {
    sort: q.trim() && (asked === 'relevance' || (asked !== 'date' && defaultSort === 'relevance')) ? ('relevance' as const) : ('date' as const),
    posted: spanFromParam(first(params.posted), DEFAULT_POSTED_WITHIN),
    past: spanFromParam(first(params.past), null),
    future: spanFromParam(first(params.future), null),
  };
  const [page, video] = await Promise.all([searchPage(q, user?.id ?? null, onlyWatched && !!user, view), timelineVideo()]);

  const all = specialtyDays as Record<string, string[]>;
  const days: Record<string, string[]> = {};
  for (const pin of page.pins) {
    const key = monthDayOf(pinDayKey(pin, timeZone));
    days[key] = all[key] || [];
  }
  const now = new Date();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone, month: '2-digit', day: '2-digit' }).format(now).replace('/', '-');
  days[today] = all[today] || [];

  return (
    <>
      <h1 className="sr-only">{q ? `Pins matching ${q}` : 'Search pins'}</h1>
      <SearchResults
        key={`${q}|${onlyWatched}|${page.watchVersion ?? ''}`}
        initialPage={{ sort: view.sort, pins: toCardPins(page.pins), links: page.links ?? {} }}
        serverTimeZone={timeZone}
        serverNow={now.toISOString()}
        searchedUser={page.user}
        specialtyDays={days}
        error={page.error}
        query={q}
        onlyWatched={onlyWatched && !!user}
        initialView={{ sort: view.sort, postedWithin: view.posted, past: view.past, future: view.future }}
        defaultSort={defaultSort}
        video={video}
      />
    </>
  );
}
