'use client';

// What any page under [lang] shows when it throws while rendering, in place of
// a blank screen. The layout and navigation around it stay up.

import { useEffect } from 'react';
import Link from '@/components/ui/Link';
import { useT } from '@/lib/client/i18n';

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useT();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{t('notFound.errorHeading')}</h1>
      <p className="mt-2 text-subtle">{t('notFound.errorBody')}</p>
      <p className="mt-8 flex justify-center gap-3">
        <button type="button" className="btn btn-primary" onClick={() => retry()}>
          {t('notFound.retry')}
        </button>
        <Link href="/" className="btn">
          {t('common.backToTimeline')}
        </Link>
      </p>
    </main>
  );
}
