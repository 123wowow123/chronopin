'use client';

import { useEffect } from 'react';

// A citation link (#source-3) points into a collapsed references list. Handle
// the click here, without navigating: open the list that holds the target,
// scroll to it and mark it (data-hit, styled by the list item). A page opened
// on a #source-n link gets the same treatment.
export function OpenSourceOnHash() {
  useEffect(() => {
    function reveal(id: string) {
      const el = document.getElementById(id);
      if (!el) return false;
      const details = el.closest('details');
      if (details) details.open = true;
      document.querySelectorAll('[data-hit]').forEach((x) => x.removeAttribute('data-hit'));
      el.setAttribute('data-hit', '');
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return true;
    }
    function fromHash() {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (id.startsWith('source-')) reveal(id);
    }
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href^="#source-"]');
      if (!a) return;
      const id = a.getAttribute('href')!.slice(1);
      if (!reveal(id)) return;
      e.preventDefault();
      e.stopPropagation();
      history.replaceState(history.state, '', `#${id}`);
    }
    // Closing the list drops the #source-n it was opened on, and the mark.
    function onToggle(e: Event) {
      const details = e.target as HTMLDetailsElement | null;
      if (!details || details.tagName !== 'DETAILS' || details.open) return;
      details.querySelectorAll('[data-hit]').forEach((x) => x.removeAttribute('data-hit'));
      if (window.location.hash.startsWith('#source-') && details.querySelector(window.location.hash)) {
        history.replaceState(history.state, '', window.location.pathname + window.location.search);
      }
    }
    fromHash();
    document.addEventListener('toggle', onToggle, true);
    window.addEventListener('hashchange', fromHash);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('hashchange', fromHash);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('toggle', onToggle, true);
    };
  }, []);
  return null;
}
