'use client';

import { useState } from 'react';
import { api } from '@/lib/client/api';
import { useRouter } from '@/lib/client/navigation';

export function AdTranslationToggle({ id, enabled, admin = false }: { id: number; enabled: boolean; admin?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function change(autoTranslate: boolean) {
    setBusy(true);
    setError('');
    try {
      await api.patch(admin ? `/api/admin/sponsored-ads/${id}` : `/api/advertise/ads/${id}`, { autoTranslate });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save translation setting.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" role="switch" className="accent-accent" checked={enabled} disabled={busy} onChange={(event) => void change(event.target.checked)} />
        Auto-translate into all site languages
      </label>
      <p className="mt-1 text-xs text-subtle">Headline and text only. Readers see the original until translations are ready.</p>
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
    </div>
  );
}
