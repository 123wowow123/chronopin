import type { Metadata } from 'next';
import { connection } from 'next/server';
import { legalMetadata } from '@/components/legal/LegalPage';
import Link from '@/components/ui/Link';
import { getT } from '@/lib/i18n/server';
import { CONTACT_EMAIL } from '@/lib/legal';

// Per request: the hreflang list follows the admin's language setting. Unlike
// Privacy and Terms, this page is fully translated.
export async function generateMetadata(): Promise<Metadata> {
  await connection();
  return legalMetadata('/contact', 'legal.contactTitle', 'legal.contactDescription', false);
}

export default async function ContactPage() {
  const t = await getT();
  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 pb-20 sm:px-6">
      <h1 className="mb-3 text-3xl font-semibold tracking-tight">{t('legal.contactTitle')}</h1>
      <p className="mb-8 text-lg text-muted">{t('legal.contactLead')}</p>
      <dl className="mb-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-base">
        <dt className="text-subtle">{t('legal.contactEmail')}</dt>
        <dd>
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium">
            {CONTACT_EMAIL}
          </a>
        </dd>
        <dt className="text-subtle">{t('legal.contactLocation')}</dt>
        <dd>{t('legal.locationValue')}</dd>
      </dl>
      <p className="mb-10 text-base text-muted">{t('legal.contactCorrections', { suggest: t('suggest.open') })}</p>
      <p className="flex flex-wrap gap-2">
        <Link href="/about" className="btn btn-secondary">
          {t('about.title')}
        </Link>
        <Link href="/privacy" className="btn btn-secondary">
          {t('legal.privacyTitle')}
        </Link>
        <Link href="/terms" className="btn btn-secondary">
          {t('legal.termsTitle')}
        </Link>
      </p>
    </main>
  );
}
