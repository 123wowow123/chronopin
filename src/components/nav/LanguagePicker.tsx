'use client';

import { Icon } from '@/components/ui/Icon';
import { useLocale, useT } from '@/lib/client/i18n';
import { LOCALE_COOKIE, LOCALE_NAMES, LOCALES, localizePath, splitLocale, isLocale } from '@/lib/i18n/config';

// The page in another language. The choice is kept in a cookie, so plain links
// and the next visit open in it too (src/proxy.ts). A full load: each
// language is its own page tree, with its own messages.
export function LanguagePicker({ className = '' }: { className?: string }) {
  const locale = useLocale();
  const t = useT();
  return (
    <label className={`relative flex items-center gap-1.5 text-sm text-muted ${className}`}>
      <Icon name="globe" className="pointer-events-none size-4 shrink-0 text-subtle" />
      <span className="sr-only">{t('nav.language')}</span>
      <select
        value={locale}
        onChange={(event) => {
          const next = event.target.value;
          if (!isLocale(next)) return;
          document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
          const { path } = splitLocale(window.location.pathname);
          window.location.assign(localizePath(path, next) + window.location.search + window.location.hash);
        }}
        className="cursor-pointer appearance-none bg-transparent pr-1 font-medium text-inherit outline-none hover:text-ink"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l} lang={l}>
            {LOCALE_NAMES[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
