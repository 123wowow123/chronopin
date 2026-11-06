import Link from '@/components/ui/Link';
import { branchPins, productPath, type HubProductJson } from '@/lib/companyHub';
import { dateFormat } from '@/lib/format';
import { INTL_LOCALES } from '@/lib/i18n/config';
import type { Translator } from '@/lib/i18n/translate';
import { pinPath } from '@/lib/seo';
import { ProductTimelineDot } from './ProductTimelineDot';

type Row = { product: HubProductJson; depth: number; first: number; last: number; pins: { id: number; title: string; at: number; label?: string; description?: string | null; thumbName?: string | null; originalUrl?: string | null }[] };

// Siblings by their first pin, each product's own row followed by its sub-products.
function rows(products: HubProductJson[], depth = 0): Row[] {
  const built = products.map((product) => {
    const labels = new Map(product.milestones.map((m) => [m.pinId, m.label]));
    const pins = branchPins(product).map((p) => ({ id: p.id, title: p.title, at: Date.parse(p.utcStartDateTime), label: labels.get(p.id), description: p.description, thumbName: p.thumbName, originalUrl: p.originalUrl })).filter((p) => !Number.isNaN(p.at));
    const first = pins.length ? Math.min(...pins.map((p) => p.at)) : Infinity;
    const own: Row[] = pins.length ? [{ product, depth, first, last: Math.max(...pins.map((p) => p.at)), pins }] : [];
    return { first, rows: [...own, ...rows(product.children, own.length ? depth + 1 : depth)] };
  });
  return built.sort((a, b) => a.first - b.first).flatMap((b) => b.rows);
}

// A "nice" year step so the axis carries about eight labels.
function yearStep(span: number): number {
  const years = span / (365.25 * 86400000);
  return [1, 2, 5, 10, 20].find((s) => years / s <= 8) ?? 25;
}

// Every product as a bar from its first dated pin to its latest, a dot for each
// pin and the first one labelled: when each product starts, side by side. The
// start is the first pin Chronopin holds for it, not necessarily the launch.
export function ProductTimeline({ products, base, t, now, className }: { products: HubProductJson[]; base: string; t: Translator; now: Date; className?: string }) {
  const list = rows(products);
  if (!list.length) return null;
  const min = Math.min(...list.map((r) => r.first));
  const max = Math.max(now.getTime(), ...list.map((r) => r.last));
  const startYear = new Date(min).getUTCFullYear();
  const step = yearStep(max - min);
  const firstTick = Math.ceil(startYear / step) * step;
  const ticks: number[] = [];
  for (let y = firstTick; Date.UTC(y, 0, 1) <= max; y += step) ticks.push(y);
  // A little room either side so the first and last dots are not cut off.
  const pad = (max - min) * 0.03;
  const lo = min - pad;
  const hi = max + pad;
  const pct = (at: number) => ((at - lo) / (hi - lo)) * 100;
  const month = dateFormat(INTL_LOCALES[t.locale], { month: 'short', year: 'numeric', timeZone: 'UTC' });
  return (
    <section aria-labelledby="product-timeline-heading" className={`surface p-5 ${className ?? ''}`}>
      <h2 id="product-timeline-heading" className="text-xl font-semibold tracking-tight">
        {t('thread.productTimelineHeading')}
      </h2>
      <p className="mt-1 text-xs text-muted">{t('thread.productTimelineNote')}</p>
      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[44rem]">
          <div className="relative ms-44 h-6 border-b border-line text-[11px] text-subtle">
            {ticks.map((y) => (
              <span key={y} className="absolute -translate-x-1/2 tabular-nums" style={{ insetInlineStart: `${pct(Date.UTC(y, 0, 1))}%` }}>
                {y}
              </span>
            ))}
          </div>
          <ol>
            {list.map((r) => (
              <li key={r.product.id} className="flex items-center gap-4 border-b border-line/50 py-1.5 last:border-b-0">
                <div className="w-40 shrink-0 text-sm" style={{ paddingInlineStart: r.depth * 12 }}>
                  <Link href={productPath(base, r.product)} title={r.product.name} className="block truncate font-medium text-ink hover:underline">
                    {r.product.name}
                  </Link>
                  <span className="block text-[11px] text-subtle">{month.format(new Date(r.first))}</span>
                </div>
                <div className="relative h-7 flex-1">
                  {ticks.map((y) => (
                    <span key={y} aria-hidden className="absolute inset-y-0 w-px bg-line/60" style={{ insetInlineStart: `${pct(Date.UTC(y, 0, 1))}%` }} />
                  ))}
                  <span aria-hidden className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-accent/30" style={{ insetInlineStart: `${pct(r.first)}%`, width: `${Math.max(pct(r.last) - pct(r.first), 0.5)}%` }} />
                  {r.pins.map((p, i) => (
                    <ProductTimelineDot
                      key={p.id}
                      href={pinPath(p)}
                      left={pct(p.at)}
                      major={!!p.label}
                      first={i === 0}
                      title={p.title}
                      label={p.label}
                      dateText={month.format(new Date(p.at))}
                      description={p.description}
                      thumbName={p.thumbName}
                      originalUrl={p.originalUrl}
                    />
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
