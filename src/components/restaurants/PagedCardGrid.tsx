'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from '@/components/ui/Link';
import { GUIDE_PAGE_SIZE, guideKey, guideSearchParams, type GuidePage, type GuideQuery } from '@/lib/restaurantGuide';
import styles from './RestaurantGuide.module.css';

type Loaded<T> = GuidePage<T> & { key: string };
export type GuidePages<T> = {
  // The server-rendered first page is showing: the list is unfiltered and in its default order.
  seeded: boolean;
  // Where the list began (more than 0 on a ?page=N URL).
  offset: number;
  // False until the first page of this query is here.
  ready: boolean;
  items: T[];
  total: number;
  ids: (number | string)[];
  bounds?: string;
  details: GuidePage<T>['details'];
  failed: boolean;
  loadMore: () => void;
};

// The list for `query` from /api/restaurants/guide, 25 cards at a time. The
// pages the server already rendered come in `initial`, by guideKey; any other
// query (another sort, neighborhood or location) is fetched. A null query
// fetches nothing.
export function useGuidePages<T>(query: GuideQuery | null, initial: Record<string, GuidePage<T>> = {}): GuidePages<T> {
  const key = query ? guideKey(query) : '';
  const [state, setState] = useState<Loaded<T> | null>(null);
  const [failedId, setFailedId] = useState('');
  const inflight = useRef('');
  const seeded = initial[key];
  const current: Loaded<T> | null = state?.key === key ? state : seeded ? { key, ...seeded } : null;

  const load = (offset: number, base: Loaded<T> | null) => {
    if (!query) return;
    const id = `${key}:${offset}`;
    if (inflight.current === id) return;
    inflight.current = id;
    setFailedId('');
    fetch(`/api/restaurants/guide?${guideSearchParams(query, offset)}`)
      .then((res) => (res.ok ? (res.json() as Promise<GuidePage<T>>) : Promise.reject(new Error(String(res.status)))))
      .then((page) => setState((prev) => {
        const from = offset === 0 ? null : prev?.key === key ? prev : base;
        return { key, ...page, offset: from?.offset ?? 0, items: [...(from?.items ?? []), ...page.items], details: { ...from?.details, ...page.details } };
      }))
      .catch(() => setFailedId(id))
      .finally(() => { if (inflight.current === id) inflight.current = ''; });
  };

  useEffect(() => {
    if (query && !current) load(0, null);
    // A new key is a new list; `load` and `current` are derived from it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const loadMore = () => {
    if (!current) load(0, null);
    else if (current.offset + current.items.length < current.total) load(current.offset + current.items.length, current);
  };
  return {
    seeded: !!seeded, offset: current?.offset ?? 0, ready: !!current, items: current?.items ?? [], total: current?.total ?? 0, ids: current?.ids ?? [], bounds: current?.bounds, details: current?.details ?? {},
    failed: !!failedId && failedId.startsWith(`${key}:`), loadMore,
  };
}

// The cards of a paged list; the next 25 load as the reader nears the end.
// `pageHref` makes the plain page links under the list that crawlers (and
// readers without scripts) follow.
export function PagedCardGrid<T>({ pages, pageHref, children }: { pages: GuidePages<T>; pageHref?: (page: number) => string; children: (item: T) => ReactNode }) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [retry, setRetry] = useState(0);
  const more = pages.offset + pages.items.length < pages.total;
  const { loadMore, failed } = pages;
  const loaded = pages.items.length;
  useEffect(() => {
    const node = sentinel.current;
    if (!more || !node || failed) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadMore();
    }, { rootMargin: '800px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
    // loadMore is rebuilt each render; the list length and retries are what re-arm it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [more, loaded, failed, retry]);
  const pageCount = Math.ceil(pages.total / GUIDE_PAGE_SIZE);
  const current = Math.floor(pages.offset / GUIDE_PAGE_SIZE) + 1;
  return <>
    {!pages.ready && !pages.failed && <p className={styles.results} role="status">Loading…</p>}
    <div className={styles.cardGrid}>{pages.items.map(children)}</div>
    {pages.ready && more && !pages.failed && <div ref={sentinel} aria-hidden="true" style={{ height: 1 }} />}
    {pageHref && pages.seeded && pageCount > 1 && <nav className={styles.results} aria-label="More pages">{Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => <Link key={page} href={pageHref(page)} prefetch={false} rel={page === current + 1 ? 'next' : page === current - 1 ? 'prev' : undefined} aria-current={page === current ? 'page' : undefined} style={{ marginRight: '0.75rem' }}>{page}</Link>)}</nav>}
    {pages.failed && <p className={styles.results} role="status">Couldn’t load more. <button type="button" onClick={() => { setRetry((n) => n + 1); loadMore(); }}>Try again ↗</button></p>}
  </>;
}
