import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { cacheLife } from 'next/cache';
import { IBM_Plex_Sans, IBM_Plex_Sans_Arabic, Noto_Sans, Noto_Sans_Arabic, Noto_Sans_Thai } from 'next/font/google';
import localFont from 'next/font/local';
import { lang } from 'next/root-params';
import { HideDevIssues } from '@/components/HideDevIssues';
import { I18nProvider } from '@/components/I18nProvider';
import { ChatDock } from '@/components/messages/Messenger';
import { Navbar } from '@/components/nav/Navbar';
import { ThemeSync } from '@/components/ThemeSync';
import { LocaleSync } from '@/components/LocaleSync';
import { TimeZoneSync } from '@/components/TimeZoneSync';
import { analyticsScript } from '@/lib/analytics';
import { siteName, siteUrl } from '@/lib/appConfig';
import { isRtl, languageTag, localeOr, LOCALES } from '@/lib/i18n/config';
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
// Cyrillic, Thai and Arabic, for Russian, Thai and Arabic pages: not preloaded, and the
// browser fetches them only when a page holds such characters (unicode-range).
// The stacks in globals.css list them after the Latin fonts.
const notoCyrillic = Noto_Sans({ subsets: ['cyrillic'], variable: '--font-noto-cyrillic', display: 'swap', preload: false });
const plexCyrillic = IBM_Plex_Sans({ subsets: ['cyrillic'], weight: ['400', '500', '600'], variable: '--font-plex-cyrillic', display: 'swap', preload: false });
const notoThai = Noto_Sans_Thai({ subsets: ['thai'], variable: '--font-noto-thai', display: 'swap', preload: false });
const notoArabic = Noto_Sans_Arabic({ subsets: ['arabic'], variable: '--font-noto-arabic', display: 'swap', preload: false });
const plexArabic = IBM_Plex_Sans_Arabic({ subsets: ['arabic'], weight: ['400', '500', '600'], variable: '--font-plex-arabic', display: 'swap', preload: false });
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

// The UTC day, which the site's share card URL carries (below). Cached by the
// hour, so the new day's URL is out within an hour of midnight.
async function shareCardDay(): Promise<string> {
  'use cache';
  cacheLife('hours');
  return new Date().toISOString().slice(0, 10);
}

export async function generateMetadata(): Promise<Metadata> {
  const [t, links, day] = await Promise.all([getT(), alternates('/'), shareCardDay()]);
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
      locale: languageTag(t.locale).replace('-', '_'),
      // The site's card, for a page with no picture of its own (a pin page
      // sets its own): without one, a link to the home page or a search
      // previews in Messages as a bare domain. Its collage of recent pins is
      // rebuilt daily, and the day in the URL makes sites that keep a preview
      // by its URL fetch the new one.
      images: [{ url: `/og/site?d=${day}`, width: 1200, height: 630, alt: siteName }],
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
    <html lang={languageTag(locale)} dir={isRtl(locale) ? 'rtl' : 'ltr'} className={`${notoSans.variable} ${plexSans.variable} ${notoCyrillic.variable} ${plexCyrillic.variable} ${notoThai.variable} ${notoArabic.variable} ${plexArabic.variable} ${astroSigns.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh">
        {/* Before first paint, from the stored preference (src/lib/theme.ts).
            First in <body>, not in <head>: AdSense inserts its own script at
            the top of <head>, which throws hydration off. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: analyticsScript }} />
        <a
          href="#main"
          className="sr-only z-50 rounded-lg bg-accent px-3 py-2 text-white focus:not-sr-only focus:fixed focus:top-2 focus:start-2"
        >
          {t('nav.skipToContent')}
        </a>
        <I18nProvider locale={locale} messages={messages}>
          <Navbar />
          <div id="main">{children}</div>
          {/* It reads the path, which a prerendered page may only do inside Suspense. */}
          <Suspense fallback={null}>
            <ChatDock />
          </Suspense>
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
