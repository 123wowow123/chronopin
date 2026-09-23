'use client';

import { Icon } from '@/components/ui/Icon';
import { useT } from '@/lib/client/i18n';
import { useRouter } from '@/lib/client/navigation';
import { backFromDrawer, returnToDrawer } from '@/lib/client/drawerReturn';

// Below lg the account's pages are opened from the nav drawer, and this arrow
// takes the reader back to it: the page they were on, with the drawer open
// again (src/lib/client/drawerReturn.ts). Reached any other way - a link, a
// bookmark - there is no page behind it to go back to, so it opens the drawer
// over the timeline instead. Wider there is no drawer, and the menus it would
// stand for are in the navbar.
export function BackToMenu() {
  const t = useT();
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        const way = backFromDrawer();
        returnToDrawer();
        if (way.back) router.back();
        else router.push(way.href);
      }}
      aria-label={t('nav.backToMenu')}
      title={t('nav.backToMenu')}
      // An arrow alone, the round target the drawer's own buttons are: its
      // name is for screen readers and the pointer's tooltip.
      className="-ml-1.5 flex shrink-0 rounded-full p-1.5 text-muted hover:bg-raised hover:text-ink lg:hidden"
    >
      <Icon name="back" className="size-5" />
    </button>
  );
}

// A page's title with the arrow leading its line (below lg; wider, the title
// alone). `className` spaces the line from what follows, as the h1's own
// margin did.
export function TitleWithBack({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <BackToMenu />
      <h1 className="text-2xl font-semibold tracking-tight">{children}</h1>
    </div>
  );
}
