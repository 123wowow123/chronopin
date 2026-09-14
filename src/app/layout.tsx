import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans, Noto_Sans } from 'next/font/google';
import localFont from 'next/font/local';
import Script from 'next/script';
import { Navbar } from '@/components/nav/Navbar';
import { TimeZoneSync } from '@/components/TimeZoneSync';
import { siteDescription, siteName, siteUrl } from '@/lib/appConfig';
import './globals.css';

const notoSans = Noto_Sans({ subsets: ['latin'], variable: '--font-noto-sans', display: 'swap' });
const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-sans',
  display: 'swap',
});
const astroSigns = localFont({
  src: './fonts/AstronomicSigns.ttf',
  variable: '--font-astro-signs',
  display: 'block',
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName}: Date tracker for historical and future events`,
    template: `%s · ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  openGraph: {
    type: 'website',
    siteName,
    title: `${siteName}: Date tracker for historical and future events`,
    description: siteDescription,
    url: '/',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
  other: {
    'google-adsense-account': 'ca-pub-4845333369058390',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1a1a1b',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${notoSans.variable} ${plexSans.variable} ${astroSigns.variable}`}>
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only z-50 bg-black p-2 text-ink focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          Skip to content
        </a>
        <Navbar />
        <div id="main">{children}</div>
        <TimeZoneSync />
        <Script
          id="adsense"
          async
          strategy="lazyOnload"
          crossOrigin="anonymous"
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4845333369058390"
        />
      </body>
    </html>
  );
}
