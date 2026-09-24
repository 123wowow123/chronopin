import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans, Noto_Sans } from 'next/font/google';
import localFont from 'next/font/local';
import { lang } from 'next/root-params';
import { HideDevIssues } from '@/components/HideDevIssues';
import { I18nProvider } from '@/components/I18nProvider';
import { Navbar } from '@/components/nav/Navbar';
import { ThemeSync } from '@/components/ThemeSync';
import { LocaleSync } from '@/components/LocaleSync';
import { TimeZoneSync } from '@/components/TimeZoneSync';
import { analyticsScript } from '@/lib/analytics';
import { siteName, siteUrl } from '@/lib/appConfig';
import { INTL_LOCALES, localeOr, LOCALES } from '@/lib/i18n/config';
import { getMessages } from '@/lib/i18n/messages';
import { alternates, getT } from '@/lib/i18n/server';
import { themeScript } from '@/lib/theme';
import '../globals.css';

const notoSans = Noto_Sans({ subsets: ['latin'], variable: '--font-noto-sans', display: 'swap' });
const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-sans',
  display: 'swap',
});
const astroSigns = localFont({
  src: '../fonts/AstronomicSigns.ttf',
  variable: '--font-astro-signs',
  display: 'block',
  preload: false,
});

// Every language is a page tree of its own (src/lib/i18n/config.ts).
export async function generateStaticParams() {
  return LOCALES.map((locale) => ({ lang: locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const [t, links] = await Promise.all([getT(), alternates('/')]);
  const title = t('meta.siteTitle', { site: siteName });
  const description = t('meta.siteDescription');
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: title,
      template: `%s · ${siteName}`,
    },
    description,
    applicationName: siteName,
    alternates: links,
    openGraph: {
      type: 'website',
      siteName,
      title,
      description,
      url: links.canonical,
      locale: INTL_LOCALES[t.locale].replace('-', '_'),
    },
    twitter: { card: 'summary_large_image' },
    robots: { index: true, follow: true },
    other: {
      'google-adsense-account': 'ca-pub-4845333369058390',
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // The proxy only ever routes a supported language here.
  const locale = localeOr(await lang());
  const [messages, t] = await Promise.all([getMessages(locale), getT()]);
  return (
    // suppressHydrationWarning: the inline script sets data-theme before React
    // hydrates, so <html> never matches the server markup.
    <html lang={INTL_LOCALES[locale]} className={`${notoSans.variable} ${plexSans.variable} ${astroSigns.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh">
        {/* Before first paint, from the stored preference (src/lib/theme.ts).
            First in <body>, not in <head>: AdSense inserts its own script at
            the top of <head>, which throws hydration off. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: analyticsScript }} />
        <a
          href="#main"
          className="sr-only z-50 rounded-lg bg-accent px-3 py-2 text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          {t('nav.skipToContent')}
        </a>
        <I18nProvider locale={locale} messages={messages}>
          <Navbar />
          <div id="main">{children}</div>
          <TimeZoneSync />
          <ThemeSync />
          <LocaleSync />
        </I18nProvider>
        {process.env.NODE_ENV === 'development' ? <HideDevIssues /> : null}
        {/* A plain async script, not next/script: AdSense warns about the
            data-nscript attribute next/script adds. React hoists it into <head>. */}
        <script
          async
          crossOrigin="anonymous"
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4845333369058390"
        />
      </body>
    </html>
  );
}
