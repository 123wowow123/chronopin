import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { siteName } from '@/lib/appConfig';
import { DEFAULT_LOCALE, INTL_LOCALES } from '@/lib/i18n/config';
import { alternates, getT } from '@/lib/i18n/server';
import type { MessageKey } from '@/lib/i18n/translate';
import { LEGAL_UPDATED } from '@/lib/legal';
import { absoluteUrl } from '@/lib/seo';

// The Privacy and Terms pages: a translated title, with the legal text itself
// in English on every language's page (one text is the one that binds). The
// other languages' copies point search engines at the English one.
export async function legalMetadata(path: string, titleKey: MessageKey, descriptionKey: MessageKey, englishOnly = true): Promise<Metadata> {
  const t = await getT();
  const title = t(titleKey);
  const description = t(descriptionKey, { site: siteName });
  const links = englishOnly && t.locale !== DEFAULT_LOCALE ? { canonical: absoluteUrl(path) } : await alternates(path);
  return {
    title,
    description,
    alternates: links,
    openGraph: { type: 'website', siteName, url: links.canonical, title: `${title} · ${siteName}`, description },
  };
}

export async function LegalPage({ titleKey, children }: { titleKey: MessageKey; children: ReactNode }) {
  const t = await getT();
  const updated = new Intl.DateTimeFormat(INTL_LOCALES[t.locale], { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${LEGAL_UPDATED}T00:00:00Z`));
  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 pb-20 sm:px-6">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">{t(titleKey)}</h1>
      <p className="mb-8 text-sm text-subtle">
        {t('legal.updated', { date: updated })}
        {t.locale === DEFAULT_LOCALE ? null : ` · ${t('legal.englishOnly')}`}
      </p>
      <div lang="en" dir="ltr" className="text-base leading-relaxed">
        {children}
      </div>
    </main>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="mt-10 mb-3 text-xl font-semibold tracking-tight">{children}</h2>;
}

export function P({ children }: { children: ReactNode }) {
  return <p className="mb-4 text-muted">{children}</p>;
}

export function UL({ children }: { children: ReactNode }) {
  return <ul className="mb-4 grid list-disc gap-2 ps-5 text-muted">{children}</ul>;
}

// An outside page, opened in a new tab.
export function Out({ href, children }: { href: string; children?: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children ?? href.replace(/^https?:\/\//, '')}
    </a>
  );
}
