'use client';

import { useState } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';
import { api } from '@/lib/client/api';
import { refreshSession } from '@/lib/client/session';
import { setThemePreference, useThemePreference } from '@/lib/client/theme';
import type { ThemePreference } from '@/lib/theme';
import { useT } from '@/lib/client/i18n';
import type { MessageKey } from '@/lib/i18n/translate';

const OPTIONS: { value: ThemePreference; label: MessageKey; icon: IconName }[] = [
  { value: 'dark', label: 'theme.dark', icon: 'moon' },
  { value: 'light', label: 'theme.light', icon: 'sun' },
  { value: 'system', label: 'theme.system', icon: 'monitor' },
];

// Takes effect as soon as it is picked, like the switch it looks like, and is
// saved to the account so other devices pick it up on their next page load.
export function ThemePicker({ userId }: { userId: number }) {
  const current = useThemePreference();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const t = useT();

  async function choose(value: ThemePreference) {
    setThemePreference(value);
    setMessage('');
    setError('');
    try {
      await api.put(`/api/users/${userId}/preferences`, { themePreference: value });
      await refreshSession();
      setMessage(t('theme.saved'));
    } catch {
      setError(t('theme.saveFailed'));
    }
  }

  return (
    <section className="surface space-y-3 p-6">
      <div>
        <h2 id="theme-label" className="field-label">
          {t('theme.heading')}
        </h2>
        <div role="radiogroup" aria-labelledby="theme-label" className="grid grid-cols-3 gap-1 rounded-lg bg-field p-1 ring-1 ring-line ring-inset">
          {OPTIONS.map((option) => {
            const selected = current === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => void choose(option.value)}
                className={`flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  selected ? 'bg-raised-2 text-ink shadow-sm' : 'text-muted hover:bg-raised hover:text-ink'
                }`}
              >
                <Icon name={option.icon} className="size-4" />
                {t(option.label)}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-sm text-subtle">{t('theme.systemHint')}</p>
      </div>
      {message ? <p role="status" className="text-sm text-success">{message}</p> : null}
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
    </section>
  );
}
