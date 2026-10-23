'use client';

import { useState } from 'react';
import { api } from '@/lib/client/api';
import { useT } from '@/lib/client/i18n';
import Link from '@/components/ui/Link';

export type FollowedCompany = { id: number; name: string; logoUrl: string | null };

// The companies the viewer follows, newest first, each with Unfollow. One
// unfollowed leaves the list at once; an empty list shows nothing.
export function FollowingCompanies({ initial }: { initial: FollowedCompany[] }) {
  const t = useT();
  const [companies, setCompanies] = useState(initial);
  const [busy, setBusy] = useState<number | null>(null);
  const [failed, setFailed] = useState<number | null>(null);

  async function unfollow(id: number) {
    setBusy(id);
    setFailed(null);
    try {
      await api.delete(`/api/companies/${id}/follow`);
      setCompanies((list) => list.filter((c) => c.id !== id));
    } catch {
      setFailed(id);
    } finally {
      setBusy(null);
    }
  }

  if (!companies.length) return null;
  return (
    <section aria-labelledby="following-companies">
      <h2 id="following-companies" className="mb-2 text-sm font-semibold text-muted">
        {t('profile.blockedCompanies')}
      </h2>
      <ul className="surface divide-y divide-line">
        {companies.map((c) => (
          <li key={c.id} className="px-4 py-3">
            <div className="flex items-center gap-3">
              {c.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- a small logo from wherever the company's lives
                <img src={c.logoUrl} alt="" className="size-9 shrink-0 rounded-lg bg-white object-contain p-1" />
              ) : (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-raised font-semibold text-muted">{c.name[0]}</span>
              )}
              <Link href={`/search?q=company:${encodeURIComponent(c.name)}`} className="min-w-0 flex-1 truncate font-semibold text-ink hover:text-link hover:no-underline">
                {c.name}
              </Link>
              <button type="button" disabled={busy === c.id} onClick={() => void unfollow(c.id)} title={t('follow.unfollowName', { name: c.name })} className="btn btn-secondary rounded-full px-4 py-1.5">
                {t('follow.unfollow')}
              </button>
            </div>
            {failed === c.id ? (
              <p role="alert" className="mt-2 text-sm text-danger">
                {t('profile.followingFailed')}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
