import type { Metadata } from 'next';
import { SearchResults } from '@/components/timeline/SearchResults';
import { monthDayOf } from '@/lib/format';
import { DEFAULT_POSTED_WITHIN, spanFromParam } from '@/lib/postedSpan';
import { toCardPins } from '@/lib/sanitize';
import { pinDayKey } from '@/lib/timeline';
import specialtyDays from '@/server/data/specialtyDays.json';
import { searchPage, sliderTyping, tagList, timelineVideo } from '@/server/services/pages';
import { parseSearchQuery } from '@/server/util/searchQuery';
import { viewerTimeZone, viewerUser } from '@/server/viewer';
import { getT } from '@/lib/i18n/server';
import { connection } from 'next/server';

type Props = PageProps<'/[lang]/search'>;

// Allowed to wait for its data when navigated to: the timeline and search
// share one loading boundary in ../layout.tsx on purpose, so moving between
// them keeps the page on screen until the new one is ready rather than
// flashing a skeleton. Next's instant-navigation check would otherwise flag
// that deliberate wait. The first load still streams from the static shell.
export const instant = false;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) || '';

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = first((await searchParams).q);
  const t = await getT();
  return {
    title: q ? t('meta.searchTitleFor', { query: q }) : t('meta.searchTitle'),
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
  // Per request: results by date open on today, which they read off the clock.
  await connection();
  const params = await searchParams;
  const q = first(params.q);
  const onlyWatched = first(params.f).toLowerCase() === 'watch';
  const [user, timeZone, t] = await Promise.all([viewerUser(), viewerTimeZone(), getT()]);
  // Only text typed into the search has an order of relevance, and when it is
  // there that order leads: the best matches first, the timeline a click away.
  // A filter-only search (tag:, user:) has no scores, so it opens by date.
  const defaultSort = parseSearchQuery(q).text ? ('relevance' as const) : ('date' as const);
  const asked = first(params.sort);
  const view = {
    sort: q.trim() && (asked === 'relevance' || (asked !== 'date' && defaultSort === 'relevance')) ? ('relevance' as const) : ('date' as const),
    posted: spanFromParam(first(params.posted), DEFAULT_POSTED_WITHIN),
    past: spanFromParam(first(params.past), null),
    future: spanFromParam(first(params.future), null),
    timeZone,
  };
  const [page, video, typing, listing] = await Promise.all([
    searchPage(q, user?.id ?? null, onlyWatched && !!user, view, t.locale),
    timelineVideo(),
    sliderTyping(),
    tagList(),
  ]);

  const all = specialtyDays as Record<string, string[]>;
  const days: Record<string, string[]> = {};
  for (const pin of page.pins) {
    const key = monthDayOf(pinDayKey(pin, timeZone));
    days[key] = all[key] || [];
  }
  const now = new Date();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone, month: '2-digit', day: '2-digit' }).format(now).replace('/', '-');
  days[today] = all[today] || [];
  const searchedDays = parseSearchQuery(q).dates;

  return (
    <>
      <h1 className="sr-only">{q ? t('search.pinsMatching', { query: q }) : t('search.searchPins')}</h1>
      <SearchResults
        key={`${q}|${onlyWatched}|${page.watchVersion ?? ''}`}
        initialPage={{ sort: view.sort, pins: toCardPins(page.pins), links: page.links ?? {} }}
        serverTimeZone={timeZone}
        serverNow={now.toISOString()}
        searchedUser={page.user}
        searchedCompany={page.company}
        specialtyDays={days}
        searchedDays={searchedDays}
        error={page.error}
        query={q}
        onlyWatched={onlyWatched && !!user}
        initialView={{ sort: view.sort, postedWithin: view.posted, past: view.past, future: view.future }}
        defaultSort={defaultSort}
        video={video}
        sliderTyping={typing.enabled}
        tagList={listing.enabled}
      />
    </>
  );
}
