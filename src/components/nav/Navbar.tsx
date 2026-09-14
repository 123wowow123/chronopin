import Link from 'next/link';
import { Suspense } from 'react';
import { NavMenu } from './NavMenu';
import { SearchBox } from './SearchBox';

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 bg-header">
      <div className="relative flex h-[52px] items-center gap-3 px-3 sm:px-6">
        <Link href="/" className="shrink-0 font-display text-xl text-ink hover:no-underline">
          Chronopin
        </Link>
        <Suspense fallback={<div className="h-[34px] flex-1 rounded bg-black" />}>
          <SearchBox />
        </Suspense>
        <Suspense fallback={<div className="w-40" />}>
          <NavMenu />
        </Suspense>
      </div>
    </header>
  );
}
