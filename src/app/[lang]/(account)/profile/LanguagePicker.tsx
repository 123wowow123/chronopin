'use client';

import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/client/api';
import { switchLocale, useLocale, useT } from '@/lib/client/i18n';
import { LOCALE_NAMES, LOCALES, isLocale, type Locale } from '@/lib/i18n/config';

// The page in another language. Saved to the account, so other devices open
// in it too (LocaleSync), and kept in a cookie, so plain links and the next
// visit on this browser open in it (src/proxy.ts).
export function LanguagePicker({ userId, locales = LOCALES, className = '' }: { userId: number; locales?: readonly Locale[]; className?: string }) {
  const locale = useLocale();
  const t = useT();
  return (
    // The whole field is the select, drawn as the page's other selects are
    // (.field: full width, its own chevron), with the globe inside its left
    // edge. It was a bare select the width of its word inside a styled label,
    // so most of what looked like the control did not open it.
    <label className={`relative block ${className}`}>
      <Icon name="globe" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
      <span className="sr-only">{t('nav.language')}</span>
      <select
        value={locale}
        onChange={async (event) => {
          const next = event.target.value;
          if (!isLocale(next)) return;
          // Switch even when the save fails: this browser still remembers it.
          await api.put(`/api/users/${userId}/preferences`, { localePreference: next }).catch(() => {});
          switchLocale(next, locale);
        }}
        className="field pl-9 font-medium"
      >
        {locales.map((l) => (
          <option key={l} value={l} lang={l}>
            {LOCALE_NAMES[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
