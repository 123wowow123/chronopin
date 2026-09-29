import type { Metadata } from 'next';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('verifyEmail.title') };
}

// Where the confirmation email's link lands, by way of /auth/verify-email,
// which has already done the work and says how it went in ?status.
export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const t = await getT();
  const ok = status === 'ok';
  return (
    <div className="px-4 py-10 sm:py-16">
      <div className="surface mx-auto max-w-md p-6 shadow-2xl shadow-shade/30 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t('verifyEmail.title')}</h1>
        <p className={`mt-2 mb-6 text-sm ${ok ? 'text-success' : 'text-danger'}`}>
          {ok ? t('verifyEmail.ok') : status === 'expired' ? t('verifyEmail.expired') : t('verifyEmail.invalid')}
        </p>
        {/* A plain link, as the navbar's: home reloads, and with it the session. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className="btn btn-primary">
          {t('verifyEmail.home')}
        </a>
      </div>
    </div>
  );
}
