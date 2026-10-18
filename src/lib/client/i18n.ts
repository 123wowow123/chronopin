'use client';

import { createContext, useContext, useMemo } from 'react';
import { DEFAULT_LOCALE, INTL_LOCALES, LOCALE_COOKIE, localizePath, splitLocale, type Locale } from '@/lib/i18n/config';
import { createTranslator, type Messages, type Translator } from '@/lib/i18n/translate';

// The page's language and its messages, from the root layout (I18nProvider).
export const I18nContext = createContext<{ locale: Locale; messages: Messages } | null>(null);

export function useLocale(): Locale {
  return useContext(I18nContext)?.locale ?? DEFAULT_LOCALE;
}

// The tag to hand Intl for dates and numbers ("en-US", "zh-CN").
export function useIntlLocale(): string {
  return INTL_LOCALES[useLocale()];
}

export function useT(): Translator {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useT outside I18nProvider');
  const { messages, locale } = context;
  return useMemo(() => createTranslator(messages, locale), [messages, locale]);
}

// The language this browser opens plain links in (src/proxy.ts), if chosen.
export function localeCookie(): string | undefined {
  return document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`))?.[1];
}

// Remember the language on this browser, and reload the page in it unless it
// is already showing. A full load: each language is its own page tree, with
// its own messages.
export function switchLocale(next: Locale, current: Locale, replace = false) {
  document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  if (next === current) return;
  const { path } = splitLocale(window.location.pathname);
  const url = localizePath(path, next) + window.location.search + window.location.hash;
  if (replace) window.location.replace(url);
  else window.location.assign(url);
}
