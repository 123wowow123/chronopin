import Link from '@/components/ui/Link';
import { productPath, productPinCount, type CompanyHubJson, type HubProductJson } from '@/lib/companyHub';
import type { Translator } from '@/lib/i18n/translate';
import { pinPath } from '@/lib/seo';
import { term } from '@/lib/searchTerms';
import { companyPath } from '@/lib/topics';
import { ThreadAge } from './ThreadAge';

const MAX_DEPTH = 5;

// A company hub pin's tree: its products, and products inside products, each
// opening onto the dated thread of pins about it. Plain <details>, so it works
// without client JavaScript and a crawler reads every branch.
export function CompanyTree({ tree, t, className }: { tree: CompanyHubJson; t: Translator; className?: string }) {
  return (
    <section aria-labelledby="company-tree-heading" className={`surface mt-6 p-5 ${className ?? ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="company-tree-heading" className="text-base font-semibold">
          {t('thread.companyTreeHeading')}
        </h2>
        <Link href={`/search?q=${encodeURIComponent(term('company', tree.companyName))}`} prefetch={false} className="text-sm">
          {t('thread.companyTreeAll', { name: tree.companyName })}
        </Link>
      </div>
      <p className="mt-1 text-xs text-muted">{t('thread.companyTreeNote')}</p>
      {tree.products.length ? (
        <ul className="mt-3 space-y-1">
          {tree.products.map((product) => (
            <Branch key={product.id} product={product} depth={0} base={companyPath(tree.companyName)} />
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted">{t('thread.companyTreeEmpty')}</p>
      )}
    </section>
  );
}

function Branch({ product, depth, base }: { product: HubProductJson; depth: number; base: string }) {
  const count = productPinCount(product);
  const nested = depth < MAX_DEPTH ? product.children : [];
  return (
    <li>
      <details className="group rounded-lg" open={depth === 0 && count > 0 && count <= 12}>
        <summary className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-raised/60">
          <span aria-hidden className="text-subtle transition-transform group-open:rotate-90 rtl:-scale-x-100">
            ›
          </span>
          <Link href={productPath(base, product)} className="min-w-0 flex-1 text-inherit hover:underline">
            {product.name}
          </Link>
          <span className="shrink-0 text-xs font-normal text-subtle tabular-nums">{count}</span>
        </summary>
        <div className="ms-3 border-s border-line ps-2">
          {product.summary ? <p className="px-3 py-1 text-xs text-muted">{product.summary}</p> : null}
          {product.pins.length ? (
            <ol className="space-y-0.5">
              {product.pins.map((p, i) => (
                <li key={p.id}>
                  <Link href={pinPath(p)} className="flex gap-3 rounded-lg px-3 py-1.5 text-sm text-ink hover:bg-raised/60 hover:no-underline">
                    <span className="w-4 shrink-0 text-end text-subtle tabular-nums">{i + 1}</span>
                    <span className="min-w-0 flex-1">{p.title}</span>
                    <ThreadAge start={p.utcStartDateTime} allDay={p.allDay} />
                  </Link>
                </li>
              ))}
            </ol>
          ) : null}
          {nested.length ? (
            <ul className="space-y-1">
              {nested.map((child) => (
                <Branch key={child.id} product={child} depth={depth + 1} base={base} />
              ))}
            </ul>
          ) : null}
        </div>
      </details>
    </li>
  );
}
