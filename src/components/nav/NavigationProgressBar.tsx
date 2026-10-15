'use client';

import { Suspense, useEffect, useSyncExternalStore } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  finishNavigationProgress,
  getNavigationProgress,
  startNavigationProgress,
  subscribeNavigationProgress,
} from '@/lib/client/navigationProgress';

const getServerSnapshot = () => ({ progress: 0, visible: false });

function RouteWatcher() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    finishNavigationProgress();
  }, [pathname, searchParams]);

  return null;
}

export function NavigationProgressBar() {
  const { progress, visible } = useSyncExternalStore(
    subscribeNavigationProgress,
    getNavigationProgress,
    getServerSnapshot,
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as Element)?.closest('a');
      if (!anchor || !anchor.href) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      const rawHref = anchor.getAttribute('href');
      if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:')) return;

      try {
        const targetUrl = new URL(anchor.href, window.location.href);
        const currentUrl = new URL(window.location.href);

        // Ignore external navigation
        if (targetUrl.origin !== currentUrl.origin) return;

        // Ignore clicks to identical URL (pathname + search)
        if (
          targetUrl.pathname === currentUrl.pathname &&
          targetUrl.search === currentUrl.search
        ) {
          return;
        }

        startNavigationProgress();
      } catch {
        // Ignore invalid URLs
      }
    }

    function handlePopState() {
      startNavigationProgress();
    }

    window.addEventListener('click', handleClick, { capture: true });
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('click', handleClick, { capture: true });
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <RouteWatcher />
      </Suspense>
      <div
        role="progressbar"
        aria-hidden={!visible}
        aria-label="Loading page"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        className={`fixed inset-x-0 top-0 z-[100] h-[3px] pointer-events-none transition-opacity duration-200 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div
          className="relative h-full bg-accent shadow-[0_0_8px_var(--color-accent)] transition-all ease-out motion-reduce:transition-none"
          style={{
            width: `${progress}%`,
            transitionDuration: progress === 100 ? '150ms' : '220ms',
          }}
        >
          {/* Glowing leading tip */}
          <div className="absolute top-0 end-0 h-full w-24 bg-gradient-to-r from-transparent to-white/35 shadow-[0_0_12px_var(--color-accent)] rtl:rotate-180" />
        </div>
      </div>
    </>
  );
}
