'use client';

import { useSyncExternalStore, type MouseEvent } from 'react';

// Tabs kept in the URL's query string (?view=top), not its hash, so each tab
// is a URL of its own that a crawler, a share and the back button all keep.
// Picking one rewrites the query in place with history.pushState - no round
// trip to the server, as every tab's content is already on the page or fetched
// by the page - and tells the tabs through an event, since pushState does not.
const CHANGED = 'chronopin:querychange';

function subscribe(listener: () => void) {
  window.addEventListener('popstate', listener);
  window.addEventListener(CHANGED, listener);
  return () => {
    window.removeEventListener('popstate', listener);
    window.removeEventListener(CHANGED, listener);
  };
}

// The query parameter's value, '' on the server and when it is absent.
export function useQueryParam(name: string): string {
  return useSyncExternalStore(
    subscribe,
    () => new URLSearchParams(window.location.search).get(name) ?? '',
    () => '',
  );
}

// A tab's own URL, for its link: the path with the tab as its only query.
export function queryTabHref(pathname: string, name: string, value: string): string {
  return `${pathname}?${name}=${encodeURIComponent(value)}`;
}

// The click handler of a tab's link: a plain click switches the tab without
// navigating; a modified click (new tab, new window) follows the link.
export function selectQueryTab(name: string, value: string, after?: () => void) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const url = new URL(window.location.href);
    url.searchParams.set(name, value);
    // A page number and a hash belong to the tab being left.
    url.searchParams.delete('page');
    url.hash = '';
    window.history.pushState(null, '', url);
    window.dispatchEvent(new Event(CHANGED));
    after?.();
  };
}
