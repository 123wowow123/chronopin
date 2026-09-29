'use client';

// next/navigation in the page's language: push('/map') goes to /es/map on a
// Spanish page, and usePathname() answers '/map' there, so code comparing
// paths never needs to know about the language prefix.

import {
  usePathname as useNextPathname,
  useRouter as useNextRouter,
} from 'next/navigation';
import { useMemo } from 'react';
import { DEFAULT_LOCALE, localizePath, splitLocale } from '@/lib/i18n/config';
import { useLocale } from './i18n';

export { notFound, redirect, useParams, useSearchParams, useSelectedLayoutSegment } from 'next/navigation';

export function usePathname(): string {
  return splitLocale(useNextPathname()).path;
}

export function useRouter() {
  const router = useNextRouter();
  const locale = useLocale();
  return useMemo(
    () => ({
      ...router,
      push: (href: string, options?: Parameters<typeof router.push>[1]) => router.push(localizePath(href, locale), options),
      replace: (href: string, options?: Parameters<typeof router.replace>[1]) => router.replace(localizePath(href, locale), options),
      prefetch: (href: string, options?: Parameters<typeof router.prefetch>[1]) => router.prefetch(localizePath(href, locale), options),
    }),
    [router, locale],
  );
}

// For hrefs built outside React (window.location, history.replaceState).
export function useLocalize(): (href: string) => string {
  const locale = useLocale();
  return useMemo(() => (href: string) => localizePath(href, locale), [locale]);
}

// The same for markup built outside React (a map popup): the language is the
// page's, read from its URL.
export function localizeHere(href: string): string {
  return localizePath(href, splitLocale(window.location.pathname).locale ?? DEFAULT_LOCALE);
}

// An API URL asking for the page's language (?lang=), for answers with pins
// in them: the pins come back translated, like the page they join.
export function withPageLang(url: string): string {
  const { locale } = splitLocale(window.location.pathname);
  if (!locale || locale === DEFAULT_LOCALE) return url;
  return `${url}${url.includes('?') ? '&' : '?'}lang=${locale}`;
}
