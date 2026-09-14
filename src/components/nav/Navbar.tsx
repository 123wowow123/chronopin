import Link from 'next/link';
import { Suspense } from 'react';
import { LogoMark } from '@/components/ui/LogoMark';
import { NavMenu } from './NavMenu';
import { SearchBox } from './SearchBox';

export function Navbar() {
  return (
    // The bottom rule is a shadow, not a border, so the bar stays exactly 52px.
    <header className="sticky top-0 z-40 bg-header/85 shadow-[0_1px_0_var(--color-line)] backdrop-blur-md">
      <div className="relative flex h-[52px] items-center gap-3 px-3 sm:px-5">
        <Link href="/" className="group flex shrink-0 items-center gap-2 font-display text-lg font-semibold tracking-tight text-ink hover:no-underline">
          <LogoMark className="size-7 drop-shadow-[0_2px_6px_rgb(244_63_94/0.35)]" />
          <span className="max-[380px]:sr-only">Chronopin</span>
        </Link>
        <div className="flex min-w-0 flex-1 justify-center">
          <Suspense fallback={<div className="h-9 w-full max-w-xl rounded-full bg-field" />}>
            <SearchBox />
          </Suspense>
        </div>
        <Suspense fallback={<div className="w-40" />}>
          <NavMenu />
        </Suspense>
      </div>
    </header>
  );
}
