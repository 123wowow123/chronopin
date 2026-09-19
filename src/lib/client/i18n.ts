'use client';

import { createContext, useContext, useMemo } from 'react';
import { DEFAULT_LOCALE, INTL_LOCALES, type Locale } from '@/lib/i18n/config';
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
