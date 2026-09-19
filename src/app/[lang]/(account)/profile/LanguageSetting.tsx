'use client';

import { LanguagePicker } from './LanguagePicker';
import { useT } from '@/lib/client/i18n';

// The language picker, in the profile's preferences beside the theme (the
// only place it lives, not the navbar). Saved to the account.
export function LanguageSetting({ userId }: { userId: number }) {
  const t = useT();
  return (
    <section className="surface space-y-2 p-6">
      <h2 className="field-label">{t('profile.language')}</h2>
      <LanguagePicker userId={userId} className="rounded-lg bg-field px-3 py-2 ring-1 ring-line ring-inset" />
      <p className="text-sm text-subtle">{t('profile.languageHint')}</p>
    </section>
  );
}
