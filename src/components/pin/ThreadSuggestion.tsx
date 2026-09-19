'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/client/api';
import { useSession } from '@/lib/client/session';
import { pinPath } from '@/lib/seo';

type PinRef = { id: number; title: string };
type Suggestion = { parent?: PinRef; current?: PinRef | null };

const dismissKey = (pinId: number, parentId: number) => `thread-suggestion:${pinId}:${parentId}`;

function dismissed(pinId: number, parentId: number) {
  try {
    return localStorage.getItem(dismissKey(pinId, parentId)) === '1';
  } catch {
    return false;
  }
}

// For the pin's author and admins: an anime pin placed by hand (a response to
// another pin, or on its own) that its show's thread would put under an
// earlier season's pin instead. The app never moves such a pin itself; this
// offers the move. "Keep it here" is remembered in this browser only.
export function ThreadSuggestion({ pinId }: { pinId: number }) {
  const router = useRouter();
  const { isLoggedIn } = useSession();
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn) return;
    api
      .get<Suggestion>(`/api/pins/${pinId}/thread-suggestion`)
      .then((found) => setSuggestion(found.parent && !dismissed(pinId, found.parent.id) ? found : null))
      .catch(() => setSuggestion(null));
  }, [isLoggedIn, pinId]);

  const parent = suggestion?.parent;
  if (!parent) return null;

  async function move() {
    setBusy(true);
    setError(null);
    try {
      await api.put(`/api/pins/${pinId}/thread-suggestion`, { parentId: parent!.id });
      setSuggestion(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not move it. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function keep() {
    try {
      localStorage.setItem(dismissKey(pinId, parent!.id), '1');
    } catch {}
    setSuggestion(null);
  }

  return (
    <div className="mt-3 rounded-lg bg-raised p-3 text-sm ring-1 ring-line ring-inset">
      <p>
        {suggestion.current ? (
          <>
            This pin responds to <Link href={pinPath(suggestion.current)}>{suggestion.current.title}</Link>. In its show&apos;s thread it would follow{' '}
          </>
        ) : (
          <>This pin stands on its own. In its show&apos;s thread it would follow </>
        )}
        <Link href={pinPath(parent)}>{parent.title}</Link>.
      </p>
      <div className="mt-2 flex gap-2">
        <button type="button" className="btn btn-secondary btn-sm" onClick={move} disabled={busy}>
          Move it there
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={keep} disabled={busy}>
          Keep it here
        </button>
      </div>
      {error ? <p role="alert" className="mt-2 text-xs text-danger">{error}</p> : null}
    </div>
  );
}
