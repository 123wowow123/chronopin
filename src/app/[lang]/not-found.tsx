import Link from '@/components/ui/Link';
import { getT } from '@/lib/i18n/server';

export default async function NotFound() {
  const t = await getT();
  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="font-display text-6xl font-semibold tracking-tight text-faint" aria-hidden>
        404
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t('notFound.heading')}</h1>
      <p className="mt-2 text-subtle">{t('notFound.body')}</p>
      <p className="mt-8">
        <Link href="/" className="btn btn-primary">
          {t('common.backToTimeline')}
        </Link>
      </p>
    </main>
  );
}
