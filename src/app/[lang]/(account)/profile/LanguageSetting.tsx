'use client';

import { LanguagePicker } from './LanguagePicker';
import { useT } from '@/lib/client/i18n';
import { DEFAULT_LOCALE } from '@/lib/i18n/config';
import type { OtherLocale } from '@/lib/multilingual';

// The language picker, in the profile's preferences beside the theme (the
// only place it lives, not the navbar). Saved to the account. Offers English
// and the other languages offered (src/lib/multilingual.ts).
export function LanguageSetting({ userId, offered }: { userId: number; offered: OtherLocale[] }) {
  const t = useT();
  return (
    <section className="surface space-y-2 p-6">
      <h2 className="field-label">{t('profile.language')}</h2>
      <LanguagePicker userId={userId} locales={[DEFAULT_LOCALE, ...offered]} />
      <p className="text-sm text-subtle">{t('profile.languageHint')}</p>
    </section>
  );
}
