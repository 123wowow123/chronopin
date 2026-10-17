import { cacheLife } from 'next/cache';
import Link from '@/components/ui/Link';
import { siteName } from '@/lib/appConfig';
import { getT } from '@/lib/i18n/server';
import { LEGAL_PATHS } from '@/lib/legal';

// A prerendered page reads no clock outside a cache (Next's cacheComponents),
// so the copyright year is cached for a day.
async function currentYear() {
  'use cache';
  cacheLife('days');
  return new Date().getUTCFullYear();
}

// Every page's last row: who runs the site and its policies, which ad
// networks and crawlers look for on every page.
export async function SiteFooter() {
  const [t, year] = await Promise.all([getT(), currentYear()]);
  const links = [
    { href: LEGAL_PATHS.about, label: t('about.title') },
    { href: LEGAL_PATHS.privacy, label: t('legal.privacyTitle') },
    { href: LEGAL_PATHS.terms, label: t('legal.termsTitle') },
    { href: LEGAL_PATHS.contact, label: t('legal.contactTitle') },
  ];
  return (
    // data-site-footer: a page that fills the window (the map) hides it, globals.css.
    <footer data-site-footer className="border-t border-line px-4 py-6 text-sm text-subtle sm:px-6">
      <nav aria-label={siteName} className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-2">
        {/* A string: a number would be formatted as 2,026. */}
        <span>{t('legal.rights', { year: String(year), site: siteName })}</span>
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="text-subtle hover:text-ink">
            {link.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
