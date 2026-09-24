import { Suspense } from 'react';
import { EmailVerifyBanner } from '@/components/EmailVerifyBanner';
import { LogoMark } from '@/components/ui/LogoMark';
import { MobileDrawer } from './MobileDrawer';
import { NavMenu } from './NavMenu';
import { SearchBox } from './SearchBox';

export function Navbar() {
  return (
    // The bottom rule is a shadow, not a border, so the bar stays exactly 52px.
    // The unconfirmed-email strip hangs below it, over the page.
    <header data-navbar className="sticky top-0 z-40 bg-header/85 shadow-[0_1px_0_var(--color-line)] backdrop-blur-md">
      <div className="relative flex h-[52px] items-center gap-3 px-3 sm:px-5">
        <Suspense fallback={<div className="size-9 shrink-0 lg:hidden" />}>
          <MobileDrawer />
        </Suspense>
        {/* A plain link, not next/link: going home reloads the page, fresh from today. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className="group -mx-2 flex shrink-0 items-center gap-2 rounded-lg px-2 py-1 font-display text-lg font-semibold tracking-tight text-ink transition-colors hover:bg-raised hover:no-underline active:bg-raised-2">
          <LogoMark className="size-7 drop-shadow-[0_2px_6px_rgb(244_63_94/0.35)]" />
          <span className="max-sm:sr-only lg:max-xl:sr-only">Chronopin</span>
        </a>
        {/* data-search-slot: what the big tag cloud leaves in reach (TagCloudView). */}
        <div data-search-slot className="flex min-w-0 flex-1">
          <Suspense fallback={<div className="h-9 w-full rounded-full bg-field" />}>
            <SearchBox />
          </Suspense>
        </div>
        <Suspense fallback={<div className="w-40" />}>
          <NavMenu />
        </Suspense>
      </div>
      <EmailVerifyBanner />
    </header>
  );
}
