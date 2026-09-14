import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SearchResults } from '@/components/timeline/SearchResults';
import { toCardPins } from '@/lib/sanitize';
import { pinDayKey } from '@/lib/timeline';
import specialtyDays from '@/server/data/specialtyDays.json';
import { searchPage } from '@/server/services/pages';
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
      <Suspense fallback={<p className="mt-16 text-center text-lg text-subtle">Searching…</p>}>
        <Results searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Results({ searchParams }: Pick<Props, 'searchParams'>) {
  const params = await searchParams;
  const q = first(params.q);
  const onlyWatched = first(params.f).toLowerCase() === 'watch';
  const [user, timeZone] = await Promise.all([viewerUser(), viewerTimeZone()]);
  const page = await searchPage(q, user?.id ?? null, onlyWatched && !!user);

  const all = specialtyDays as Record<string, string[]>;
  const days: Record<string, string[]> = {};
  for (const pin of page.pins) {
    const key = pinDayKey(pin, timeZone).slice(5);
    days[key] = all[key] || [];
  }
  const now = new Date();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone, month: '2-digit', day: '2-digit' }).format(now).replace('/', '-');
  days[today] = all[today] || [];

  return (
    <>
      <h1 className="sr-only">{q ? `Pins matching ${q}` : 'Search pins'}</h1>
      <SearchResults
        key={`${q}|${onlyWatched}`}
        pins={toCardPins(page.pins)}
        serverTimeZone={timeZone}
        serverNow={now.toISOString()}
        searchedUser={page.user}
        specialtyDays={days}
        error={page.error}
      />
    </>
  );
}
