'use client';

import { useRouter } from '@/lib/client/navigation';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/client/api';
import { useSession } from '@/lib/client/session';
import { useT } from '@/lib/client/i18n';

type State = { subthread: boolean; hasParent: boolean };

// For the pin's author and admins, on a reply: marks it a subthread (a
// shipment, a rival comparison) so the Thread pane steps it in under the pin
// it answers even when it is that pin's only response, or puts it back on the
// main line. Anyone else gets a 403 from the read and sees nothing.
export function SideNoteToggle({ pinId }: { pinId: number }) {
  const router = useRouter();
  const { isLoggedIn } = useSession();
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useT();

  useEffect(() => {
    if (!isLoggedIn) return;
    api
      .get<State>(`/api/pins/${pinId}/subthread`)
      .then(setState)
      .catch(() => setState(null));
  }, [isLoggedIn, pinId]);

  if (!state?.hasParent) return null;

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      const next = !state!.subthread;
      await api.put(`/api/pins/${pinId}/subthread`, { subthread: next });
      setState({ ...state!, subthread: next });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('thread.sideNoteFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 text-sm">
      <button type="button" className="btn btn-secondary btn-sm" onClick={toggle} disabled={busy}>
        {state.subthread ? t('thread.sideNoteUnmark') : t('thread.sideNoteMark')}
      </button>
      <p className="mt-1 text-xs text-subtle">{t('thread.sideNoteHint')}</p>
      {error ? <p role="alert" className="mt-2 text-xs text-danger">{error}</p> : null}
    </div>
  );
}
