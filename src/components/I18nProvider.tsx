'use client';

import { useMemo } from 'react';
import { I18nContext } from '@/lib/client/i18n';
import type { Locale } from '@/lib/i18n/config';
import type { Messages } from '@/lib/i18n/translate';

export function I18nProvider({ locale, messages, children }: { locale: Locale; messages: Messages; children: React.ReactNode }) {
  const value = useMemo(() => ({ locale, messages }), [locale, messages]);
  return <I18nContext value={value}>{children}</I18nContext>;
}
