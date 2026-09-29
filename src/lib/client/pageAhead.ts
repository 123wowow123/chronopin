// Pages of an endless list fetched before the reader reaches them, keyed by
// the link that asks for each. The timeline and the search results keep the
// page past each end of what is on screen in memory, so the sentinel that
// asks for it gets it at once instead of waiting on the network (a page is
// ~25 pins, ~70KB, and 0.2-0.3s away in production - long enough to scroll
// into the end of the list and stall there).
//
// A page held longer than maxAgeMs is fetched again when asked for, so one
// fetched ahead and scrolled to much later is not stale.
export function createPageAhead<T>(fetcher: (query: string) => Promise<T>, maxAgeMs = 60_000) {
  const pages = new Map<string, { at: number; page: Promise<T> }>();
  return {
    // The page for this link: the one fetched ahead when it is fresh (or still
    // on its way), else fetched now. Either way it is handed over once.
    take(query: string): Promise<T> {
      const held = pages.get(query);
      pages.delete(query);
      return held && Date.now() - held.at < maxAgeMs ? held.page : fetcher(query);
    },
    // Starts fetching a page the reader is heading for, unless it is already
    // held. A failed one is forgotten, so take() asks again.
    warm(query: string | undefined) {
      if (!query || pages.has(query)) return;
      const page = fetcher(query);
      page.catch(() => pages.delete(query));
      pages.set(query, { at: Date.now(), page });
    },
    clear() {
      pages.clear();
    },
  };
}
