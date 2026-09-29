'use client';

import { useState, useSyncExternalStore } from 'react';
import { api } from '@/lib/client/api';
import { alertPermission, enableAlerts, type AlertPermission } from '@/lib/client/browserAlerts';
import { refreshSession } from '@/lib/client/session';
import { useT } from '@/lib/client/i18n';

// Permission changes only through the browser's own settings, which tell the
// page nothing; a reload reads it again.
const subscribeNothing = () => () => {};

// Browser notifications about watched pins: whether this browser lets them
// through (asked for here, or on the first Watch), and the 15-minute reminder
// before a pin starts, off unless switched on. The reminder saves as soon as
// it is switched, like the settings above it.
export function WatchAlertsSetting({ userId, initialRemind }: { userId: number; initialRemind: boolean }) {
  // Unknown on the server, which cannot see the browser's permission; the
  // answer to asking here once it is given.
  const current = useSyncExternalStore(subscribeNothing, alertPermission, () => null);
  const [answered, setAnswered] = useState<AlertPermission | null>(null);
  const permission = answered ?? current;
  const [remind, setRemind] = useState(initialRemind);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const t = useT();

  async function turnOn() {
    setAnswered(await enableAlerts());
  }

  async function change(next: boolean) {
    setRemind(next);
    setBusy(true);
    setMessage('');
    setError('');
    try {
      await api.put(`/api/users/${userId}/preferences`, { remindBeforeStart: next });
      await refreshSession();
      setMessage(next ? t('profile.remindOn') : t('profile.remindOff'));
    } catch {
      setRemind(!next);
      setError(t('duplicates.saveFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="surface space-y-3 p-6">
      <div>
        <span className="field-label block">{t('profile.alertsLabel')}</span>
        <span className="block text-sm text-subtle">{t('profile.alertsHint')}</span>
      </div>
      {permission === 'granted' ? (
        <p className="text-sm text-success">{t('profile.alertsOn')}</p>
      ) : permission === 'default' ? (
        <button type="button" onClick={() => void turnOn()} className="btn btn-secondary">
          {t('profile.alertsEnable')}
        </button>
      ) : permission === 'denied' ? (
        <p className="text-sm text-warning">{t('profile.alertsBlocked')}</p>
      ) : permission === 'unsupported' ? (
        <p className="text-sm text-subtle">{t('profile.alertsUnsupported')}</p>
      ) : null}
      <label className="flex items-start gap-3">
        <input type="checkbox" checked={remind} disabled={busy} onChange={(e) => void change(e.target.checked)} className="mt-0.5 size-4 accent-accent" />
        <span>
          <span className="field-label block">{t('profile.remindLabel')}</span>
          <span className="block text-sm text-subtle">{t('profile.remindHint')}</span>
        </span>
      </label>
      {message ? <p className="text-sm text-success" role="status">{message}</p> : null}
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
    </section>
  );
}
